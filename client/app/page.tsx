"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PlayerHud } from "./player-hud";

const saveKey = "the-click:save";
const saveChanged = "the-click:save-changed";
const startingPoint = "Starting Point";

type Save = {
  checkpoint: typeof startingPoint;
  savedAt: number;
};

type Screen =
  | { kind: "menu" | "new" | "load" | "resume" }
  | { kind: "player"; persisted: boolean };

const screenTitles = {
  menu: "The Click",
  new: "New Game",
  load: "Load Game",
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
    const save = JSON.parse(value) as Partial<Save> | null;
    if (
      save?.checkpoint === startingPoint &&
      typeof save.savedAt === "number" &&
      Number.isFinite(new Date(save.savedAt).getTime())
    ) {
      return { checkpoint: save.checkpoint, savedAt: save.savedAt };
    }
  } catch {
    return null;
  }

  return null;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const save = parseSave(useSyncExternalStore(subscribeToSave, readSave, () => null));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement>(null);
  const newGameRef = useRef<HTMLButtonElement>(null);
  const loadGameRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const lastChoice = useRef<"new" | "load">("new");

  useEffect(() => {
    if (!restoreFocus.current) return;
    restoreFocus.current = false;

    if (screen.kind === "menu") {
      const choiceRef = lastChoice.current === "new" ? newGameRef : loadGameRef;
      choiceRef.current?.focus();
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

  function choose(kind: "new" | "load") {
    lastChoice.current = kind;
    goTo({ kind });
  }

  function startNewGame() {
    const nextSave: Save = { checkpoint: startingPoint, savedAt: Date.now() };
    let persisted = false;

    try {
      window.localStorage.setItem(saveKey, JSON.stringify(nextSave));
      persisted = true;
      window.dispatchEvent(new Event(saveChanged));
    } catch {
      // The player screen remains available when local storage is blocked.
    }

    goTo({ kind: "player", persisted });
  }

  return (
    <main className={screen.kind === "player" ? undefined : "game-stage"}>
      <audio ref={clickSoundRef} src="/click.wav" preload="auto" />
      {screen.kind === "player" ? (
        <PlayerHud
          headingRef={headingRef}
          persisted={screen.persisted}
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
                <button className="game-button save-slot" onClick={() => goTo({ kind: "resume" })}>
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
                onClick={() => goTo({ kind: "player", persisted: true })}
              >
                Start Game
              </button>
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
