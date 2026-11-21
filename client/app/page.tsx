"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGameMusic } from "./game-music";
import {
  farmPlotCount, farmPosition, homePosition, PlayerHud, type PlayerLocation, type Position,
} from "./player-hud";

const saveKey = "the-click:save";
const saveChanged = "the-click:save-changed";
const origin: Position = { x: 0, y: 0 };

type PlayerProgress = PlayerLocation & { harvestedPlots: number[] };
type Save = PlayerProgress & { savedAt: number };

type Screen =
  | { kind: "menu" | "new" | "load" | "options" }
  | { kind: "resume"; progress: PlayerProgress }
  | { kind: "player"; progress: PlayerProgress; persisted: boolean };

const screenTitles = {
  menu: "The Click",
  new: "New Game",
  load: "Load Game",
  options: "Options",
  resume: "Start Game",
};

function subscribeToSave(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(saveChanged, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(saveChanged, onChange);
  };
}

function readSave() {
  try {
    return window.localStorage.getItem(saveKey);
  } catch {
    return null;
  }
}

function parseSave(value: string | null): Save | null {
  if (value === null) return null;

  try {
    const save = JSON.parse(value) as (Partial<Save> & { checkpoint?: string }) | null;
    if (typeof save?.savedAt !== "number" || !Number.isFinite(new Date(save.savedAt).getTime())) {
      return null;
    }

    const position = save.position;
    if (position && Number.isSafeInteger(position.x) && Number.isSafeInteger(position.y)) {
      const area = save.area ?? "map";
      if (area === "map" || area === "house" || area === "farm" || area === "barn") {
        const harvestedPlots = Array.isArray(save.harvestedPlots)
          ? [...new Set(save.harvestedPlots.filter((plot) => Number.isInteger(plot) && plot >= 0 && plot < farmPlotCount))]
          : [];
        return { area, position, harvestedPlots, savedAt: save.savedAt };
      }
    }

    if (position === undefined && save.checkpoint === "Starting Point") {
      return { area: "map", position: origin, harvestedPlots: [], savedAt: save.savedAt };
    }
  } catch {
    return null;
  }

  return null;
}

function saveProgress(progress: PlayerProgress) {
  const save: Save = { ...progress, savedAt: Date.now() };

  try {
    window.localStorage.setItem(saveKey, JSON.stringify(save));
    window.dispatchEvent(new Event(saveChanged));
    return true;
  } catch {
    return false;
  }
}

function playSound(sound: HTMLAudioElement | null) {
  if (!sound) return;

  sound.currentTime = 0;
  void sound.play().catch(() => {
    // Keep controls usable if the browser blocks playback.
  });
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const playerArea = screen.kind === "player" ? screen.progress.area : undefined;
  const { musicRef, startMusic, musicVolume, changeMusicVolume } = useGameMusic();
  const save = parseSave(useSyncExternalStore(subscribeToSave, readSave, () => null));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement>(null);
  const footstepSoundRef = useRef<HTMLAudioElement>(null);
  const bagSoundRef = useRef<HTMLAudioElement>(null);
  const newGameRef = useRef<HTMLButtonElement>(null);
  const loadGameRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const lastChoice = useRef<"new" | "load" | "options">("new");

  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;

    if (screen.kind === "menu") {
      const menuButtons = { new: newGameRef, load: loadGameRef, options: optionsRef };
      menuButtons[lastChoice.current].current?.focus();
    } else {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [screen.kind, playerArea]);

  function goTo(next: Screen) {
    playSound(clickSoundRef.current);
    restoreFocus.current = true;
    setScreen(next);
  }

  function choose(kind: "new" | "load" | "options") {
    lastChoice.current = kind;
    goTo({ kind });
  }

  function enterLocation(location: PlayerLocation) {
    const harvestedPlots = screen.kind === "player" ? screen.progress.harvestedPlots : [];
    const progress = { ...location, harvestedPlots };
    goTo({ kind: "player", progress, persisted: saveProgress(progress) });
  }

  function move(delta: Position) {
    if (screen.kind !== "player" || screen.progress.area !== "map") return;

    const position = {
      x: screen.progress.position.x + delta.x,
      y: screen.progress.position.y + delta.y,
    };
    if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) return;

    playSound(footstepSoundRef.current);
    const progress = { ...screen.progress, position };
    setScreen({ kind: "player", progress, persisted: saveProgress(progress) });
  }

  function harvestPlot(plot: number) {
    if (screen.kind !== "player" || screen.progress.area !== "farm") return;
    const { harvestedPlots } = screen.progress;
    if (harvestedPlots.includes(plot)) return;

    playSound(clickSoundRef.current);
    const progress = { ...screen.progress, harvestedPlots: [...harvestedPlots, plot] };
    setScreen({ kind: "player", progress, persisted: saveProgress(progress) });
  }

  return (
    <main className={screen.kind === "player" ? undefined : "game-stage"} onClickCapture={startMusic}>
      <audio ref={clickSoundRef} src="/click.wav" preload="auto" />
      <audio ref={footstepSoundRef} src="/footstep.wav" preload="auto" />
      <audio ref={bagSoundRef} src="/pouch-open.wav" preload="auto" />
      <audio ref={musicRef} src="/retro-loop.mp3" preload="metadata" loop />
      {screen.kind === "player" ? (
        <PlayerHud
          headingRef={headingRef}
          persisted={screen.persisted}
          location={screen.progress}
          harvestedPlots={screen.progress.harvestedPlots}
          onMove={move}
          onEnterHome={() => enterLocation({ area: "house", position: origin })}
          onLeaveHome={() => enterLocation({ area: "map", position: homePosition })}
          onEnterFarm={() => enterLocation({ area: "farm", position: origin })}
          onLeaveFarm={() => enterLocation({ area: "map", position: farmPosition })}
          onEnterBarn={() => enterLocation({ area: "barn", position: origin })}
          onLeaveBarn={() => enterLocation({ area: "map", position: farmPosition })}
          onHarvest={harvestPlot}
          onMenu={() => goTo({ kind: "menu" })}
          onClickSound={() => playSound(clickSoundRef.current)}
          onBagSound={() => playSound(bagSoundRef.current)}
        />
      ) : (
        <section key={screen.kind} className="game-screen" aria-labelledby="screen-title">
          <div className="screen-heading">
            <h1
              id="screen-title"
              className={screen.kind === "menu" ? "game-title" : undefined}
              ref={headingRef}
              tabIndex={-1}
            >
              {screenTitles[screen.kind]}
            </h1>
          </div>

          <div className="menu-controls">
            {screen.kind === "menu" && (
              <>
                <button
                  className="game-button primary-button"
                  onClick={() => choose("new")}
                  ref={newGameRef}
                >
                  New Game
                  <span className="button-symbol" aria-hidden="true">+</span>
                </button>
                <button
                  className="game-button"
                  onClick={() => choose("load")}
                  ref={loadGameRef}
                >
                  Load Game
                  <span className="button-symbol save-symbol" aria-hidden="true" />
                </button>
                <button className="game-button" onClick={() => choose("options")} ref={optionsRef}>
                  Options
                </button>
              </>
            )}

            {screen.kind === "new" && (
              <>
                {save && (
                  <p className="screen-message">Starting over will replace your saved game.</p>
                )}
                <button className="game-button primary-button" onClick={() => enterLocation({ area: "map", position: origin })}>
                  Start Game
                </button>
              </>
            )}

            {screen.kind === "load" && (
              save ? (
                <button className="game-button save-slot" onClick={() => goTo({ kind: "resume", progress: save })}>
                  <span>Saved Game</span>
                  <span className="slot-date">
                    Saved {new Date(save.savedAt).toLocaleDateString()}
                  </span>
                </button>
              ) : (
                <>
                  <p className="screen-message">No saved game on this device.</p>
                  <button className="game-button primary-button" onClick={() => goTo({ kind: "new" })}>
                    New Game
                  </button>
                </>
              )
            )}

            {screen.kind === "resume" && (
              <button
                className="game-button primary-button"
                onClick={() => goTo({ kind: "player", progress: screen.progress, persisted: true })}
              >
                Start Game
              </button>
            )}

            {screen.kind === "options" && (
              <div className="volume-setting">
                <div className="volume-heading">
                  <label htmlFor="music-volume">Music Volume</label>
                  <span aria-hidden="true">{musicVolume}%</span>
                </div>
                <input
                  id="music-volume"
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  aria-valuetext={musicVolume + "%"}
                  onChange={(event) => changeMusicVolume(event.currentTarget.valueAsNumber)}
                />
              </div>
            )}

            {screen.kind !== "menu" && (
              <button
                className="back-button"
                onClick={() => goTo({ kind: screen.kind === "resume" ? "load" : "menu" })}
              >
                Back
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
