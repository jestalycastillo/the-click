"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGameMusic } from "./game-music";
import { PlayerHud, type Position } from "./player-hud";

const saveKey = "the-click:save";
const saveChanged = "the-click:save-changed";
const origin: Position = { x: 0, y: 0 };

type Save = {
  position: Position;
  savedAt: number;
};

type Screen =
  | { kind: "menu" | "new" | "load" | "options" }
  | { kind: "resume"; position: Position }
  | { kind: "player"; position: Position; persisted: boolean };

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
      return { position, savedAt: save.savedAt };
    }

    if (position === undefined && save.checkpoint === "Starting Point") {
      return { position: origin, savedAt: save.savedAt };
    }
  } catch {
    return null;
  }

  return null;
}

function savePosition(position: Position) {
  const save: Save = { position, savedAt: Date.now() };

  try {
    window.localStorage.setItem(saveKey, JSON.stringify(save));
    window.dispatchEvent(new Event(saveChanged));
    return true;
  } catch {
    return false;
  }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const { musicRef, startMusic, musicVolume, changeMusicVolume } = useGameMusic();
  const save = parseSave(useSyncExternalStore(subscribeToSave, readSave, () => null));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement>(null);
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
  }, [screen.kind]);

  function playClickSound() {
    const clickSound = clickSoundRef.current;
    if (clickSound) {
      clickSound.currentTime = 0;
      void clickSound.play().catch(() => {
        // Audio playback is optional when the browser blocks it.
      });
    }
  }

  function goTo(next: Screen) {
    playClickSound();
    restoreFocus.current = true;
    setScreen(next);
  }

  function choose(kind: "new" | "load" | "options") {
    lastChoice.current = kind;
    goTo({ kind });
  }

  function startNewGame() {
    goTo({ kind: "player", position: origin, persisted: savePosition(origin) });
  }

  function move(delta: Position) {
    if (screen.kind !== "player") return;

    const position = {
      x: screen.position.x + delta.x,
      y: screen.position.y + delta.y,
    };
    if (!Number.isSafeInteger(position.x) || !Number.isSafeInteger(position.y)) return;

    playClickSound();
    setScreen({ kind: "player", position, persisted: savePosition(position) });
  }

  return (
    <main className={screen.kind === "player" ? undefined : "game-stage"} onClickCapture={startMusic}>
      <audio ref={clickSoundRef} src="/click.wav" preload="auto" />
      <audio ref={musicRef} src="/retro-loop.mp3" preload="metadata" loop />
      {screen.kind === "player" ? (
        <PlayerHud
          headingRef={headingRef}
          persisted={screen.persisted}
          position={screen.position}
          onMove={move}
          onMenu={() => goTo({ kind: "menu" })}
          onClickSound={playClickSound}
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
                <button className="game-button primary-button" onClick={startNewGame}>
                  Start Game
                </button>
              </>
            )}

            {screen.kind === "load" && (
              save ? (
                <button className="game-button save-slot" onClick={() => goTo({ kind: "resume", position: save.position })}>
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
                onClick={() => goTo({ kind: "player", position: screen.position, persisted: true })}
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
