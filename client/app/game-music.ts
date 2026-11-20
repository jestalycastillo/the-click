import { useEffect, useRef, useState } from "react";

const volumeKey = "the-click:music-volume";
const defaultVolume = 35;

function readMusicVolume() {
  try {
    const saved = window.localStorage.getItem(volumeKey);
    if (saved === null) return defaultVolume;

    const parsed = Number(saved);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  } catch {
    // Music can still play when local storage is unavailable.
  }

  return defaultVolume;
}

export function useGameMusic() {
  const [musicVolume, setMusicVolume] = useState(defaultVolume);
  const musicRef = useRef<HTMLAudioElement>(null);
  const playbackRef = useRef<{ context: AudioContext; gain: GainNode }>(null);
  const initialized = useRef(false);

  useEffect(() => {
    return () => {
      void playbackRef.current?.context.close().catch(() => {});
    };
  }, []);

  function applyVolume(volume: number) {
    if (playbackRef.current) {
      playbackRef.current.gain.gain.value = volume / 100;
    } else if (musicRef.current) {
      musicRef.current.volume = volume / 100;
    }
  }

  function startMusic() {
    const track = musicRef.current;
    if (!track) return;

    if (!initialized.current) {
      initialized.current = true;
      // A gain node also lets mobile browsers with fixed media volume use the slider.
      let context: AudioContext | undefined;
      try {
        if (typeof AudioContext !== "undefined") {
          context = new AudioContext();
          const gain = context.createGain();
          context.createMediaElementSource(track).connect(gain).connect(context.destination);
          playbackRef.current = { context, gain };
        }
      } catch {
        void context?.close().catch(() => {});
      }

      const volume = readMusicVolume();
      applyVolume(volume);
      setMusicVolume(volume);
    }

    const context = playbackRef.current?.context;
    if (context && context.state !== "running") {
      void context.resume().catch(() => {});
    }
    if (track.paused) {
      void track.play().catch(() => {});
    }
  }

  function changeMusicVolume(volume: number) {
    applyVolume(volume);
    setMusicVolume(volume);
    try {
      window.localStorage.setItem(volumeKey, String(volume));
    } catch {
      // Keep the chosen volume for the current visit when storage is blocked.
    }
  }

  return { musicRef, startMusic, musicVolume, changeMusicVolume };
}
