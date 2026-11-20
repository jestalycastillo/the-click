import type { Ref } from "react";

const playerVitals = [
  { name: "Health", color: "health", value: 100 },
  { name: "Energy", color: "energy", value: 100 },
  { name: "Thirst", color: "thirst", value: 100 },
  { name: "Hunger", color: "hunger", value: 100 },
];

const bagId = "player-bag";

function InventorySlots({ capacity, label }: { capacity: number; label: string }) {
  return (
    <ul className="inventory-slots" aria-label={label} role="list">
      {Array.from({ length: capacity }, (_, index) => (
        <li key={index} className="inventory-slot">
          <span className="sr-only">Empty slot {index + 1}</span>
        </li>
      ))}
    </ul>
  );
}

type PlayerHudProps = {
  headingRef: Ref<HTMLHeadingElement>;
  persisted: boolean;
  onMenu: () => void;
  onClickSound: () => void;
};

export function PlayerHud({ headingRef, persisted, onMenu, onClickSound }: PlayerHudProps) {
  return (
    <section className="player-hud" aria-labelledby="player-title">
      <h1 id="player-title" className="sr-only" ref={headingRef} tabIndex={-1}>
        Player
      </h1>

      <div className="hud-top">
        <div className="player-vitals" role="group" aria-label="Player status">
          {playerVitals.map(({ name, color, value }) => (
            <label className="player-vital" data-vital={color} key={name}>
              <span className="vital-label">
                {name}
                <span aria-hidden="true">{value}%</span>
              </span>
              <meter min={0} max={100} value={value} />
            </label>
          ))}
        </div>
        <button className="back-button" onClick={onMenu}>Main Menu</button>
      </div>

      {!persisted && (
        <p className="screen-message hud-message" role="status">
          This browser couldn’t save your game.
        </p>
      )}

      <div className="hud-bottom">
        <InventorySlots capacity={4} label="Inventory" />
        <button className="back-button bag-toggle" popoverTarget={bagId} onClick={onClickSound}>
          Bag
        </button>
        <section id={bagId} className="bag-panel" popover="auto" aria-labelledby="bag-title">
          <div className="bag-header">
            <h2 id="bag-title">Bag</h2>
            <button
              className="back-button"
              popoverTarget={bagId}
              popoverTargetAction="hide"
              onClick={onClickSound}
            >
              Close
            </button>
          </div>
          <InventorySlots capacity={16} label="Bag inventory" />
        </section>
      </div>
    </section>
  );
}
