import { useCallback, useEffect, useRef, useState } from "react";

const animals = [
  { name: "Cow", call: "Moo!", sound: "moo" },
  { name: "Sheep", call: "Baa!", sound: "baa" },
  { name: "Chicken", call: "Cluck!", sound: "cluck" },
  { name: "Pig", call: "Oink!", sound: "oink" },
] as const;

type Animal = (typeof animals)[number];

export function Barn({ onLeave }: { onLeave: () => void }) {
  const [callingAnimal, setCallingAnimal] = useState<Animal | null>(null);
  const soundRef = useRef<HTMLAudioElement>(null);
  const hideSpeech = useRef<number>(undefined);
  const lastCall = useRef(0);

  const call = useCallback((animal: Animal) => {
    lastCall.current = Date.now();
    setCallingAnimal(animal);
    window.clearTimeout(hideSpeech.current);
    hideSpeech.current = window.setTimeout(() => setCallingAnimal(null), 1450);

    const sound = soundRef.current;
    if (sound) {
      sound.src = "/barn/" + animal.sound + ".wav";
      void sound.play().catch(() => {
        // The speech bubble still shows if playback is blocked.
      });
    }
  }, []);

  useEffect(() => {
    let nextAnimal = 0;
    const sound = soundRef.current;

    function ambientCall() {
      if (document.hidden || Date.now() - lastCall.current < 1800) return;

      call(animals[nextAnimal]);
      nextAnimal = (nextAnimal + 1) % animals.length;
    }

    const firstCall = window.setTimeout(ambientCall, 900);
    const interval = window.setInterval(ambientCall, 3400);
    return () => {
      window.clearTimeout(firstCall);
      window.clearInterval(interval);
      window.clearTimeout(hideSpeech.current);
      sound?.pause();
    };
  }, [call]);

  return (
    <div className="barn-interior">
      <h2 className="place-title">Barn</h2>
      <div className="barn-pens">
        {animals.map((animal) => (
          <div className="barn-pen" key={animal.name} role="group" aria-label={animal.name + " pen"}>
            <div className="barn-pen-path">
              <div className="barn-animal">
                <button type="button" aria-label={"Hear " + animal.name} onClick={() => call(animal)}>
                  {animal.name}
                </button>
                {callingAnimal === animal && (
                  <span className="barn-call" aria-hidden="true">{animal.call}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="back-button" type="button" onClick={onLeave}>Leave Barn</button>
      <audio ref={soundRef} preload="none" />
    </div>
  );
}
