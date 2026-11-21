import { useRef, useState, type MouseEvent, type Ref } from "react";

const playerVitals = [
  { name: "Health", color: "health", value: 100 },
  { name: "Energy", color: "energy", value: 100 },
  { name: "Thirst", color: "thirst", value: 100 },
  { name: "Hunger", color: "hunger", value: 100 },
];

const bagId = "player-bag";

export type Position = { x: number; y: number };
export type PlayerLocation = { area: "map" | "house" | "farm"; position: Position };

export const homePosition: Position = { x: 0, y: 1 };
export const farmPosition: Position = { x: -1, y: 1 };
export const farmPlotCount = 9;

const directions = [
  { direction: "north", delta: { x: 0, y: 1 } },
  { direction: "west", delta: { x: -1, y: 0 } },
  { direction: "east", delta: { x: 1, y: 0 } },
  { direction: "south", delta: { x: 0, y: -1 } },
] as const;

function InventorySlots({ capacity, label, crops = 0 }: { capacity: number; label: string; crops?: number }) {
  return (
    <ul className="inventory-slots" aria-label={label} role="list">
      {Array.from({ length: capacity }, (_, index) => (
        <li key={index} className="inventory-slot">
          {index === 0 && crops > 0 ? (
            <>
              <span className="sr-only" role="status">Crops: {crops}</span>
              <span className="crop-icon" aria-hidden="true" />
              <span className="crop-quantity" aria-hidden="true">{crops}</span>
            </>
          ) : (
            <span className="sr-only">Empty slot {index + 1}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

type PlayerHudProps = {
  headingRef: Ref<HTMLHeadingElement>;
  persisted: boolean;
  location: PlayerLocation;
  harvestedPlots: readonly number[];
  onMove: (delta: Position) => void;
  onEnterHome: () => void;
  onLeaveHome: () => void;
  onEnterFarm: () => void;
  onLeaveFarm: () => void;
  onHarvest: (plot: number) => void;
  onMenu: () => void;
  onClickSound: () => void;
  onBagSound: () => void;
};

export function PlayerHud({
  headingRef, persisted, location, harvestedPlots, onMove, onEnterHome, onLeaveHome,
  onEnterFarm, onLeaveFarm, onHarvest, onMenu, onClickSound, onBagSound,
}: PlayerHudProps) {
  const [enteringHome, setEnteringHome] = useState(false);
  const houseVeilRef = useRef<HTMLDivElement>(null);
  const { area, position } = location;
  const insideHouse = area === "house";
  const insideFarm = area === "farm";
  const atHome = position.x === homePosition.x && position.y === homePosition.y;
  const atFarm = position.x === farmPosition.x && position.y === farmPosition.y;

  async function enterHome(event: MouseEvent<HTMLButtonElement>) {
    if (enteringHome) return;

    const veil = houseVeilRef.current;
    if (!veil?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onEnterHome();
      return;
    }

    setEnteringHome(true);
    const duration = 380;
    event.currentTarget.animate(
      [{ transform: "none" }, { transform: "translateY(0.5rem) scale(1.65)" }],
      { duration, easing: "ease-in", fill: "forwards" },
    );
    const cover = veil.animate(
      [{ opacity: 0 }, { opacity: 0.2, offset: 0.45 }, { opacity: 1 }],
      { duration, easing: "ease-in", fill: "forwards" },
    );
    await cover.finished.catch(() => {});

    onEnterHome();
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: "ease-out" });
    cover.cancel();
    setEnteringHome(false);
  }

  const coordinates = (
    <div className="map-position">
      <label htmlFor="map-coordinates">{insideHouse ? "House coordinates" : "Coordinates"}</label>
      <output id="map-coordinates">({position.x}, {position.y})</output>
    </div>
  );

  return (
    <section className="player-hud" aria-labelledby="player-title" inert={enteringHome}>
      <h1 id="player-title" className="sr-only" ref={headingRef} tabIndex={-1}>
        {insideHouse ? "House" : insideFarm ? "Farm" : "Player"}
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

      <div className="map-area">
        {insideHouse ? (
          <div className="house-interior">
            <h2>House</h2>
            {coordinates}
            <button className="back-button" type="button" onClick={onLeaveHome}>
              Leave House
            </button>
          </div>
        ) : insideFarm ? (
          <div className="farm-interior">
            <h2>Farm</h2>
            <div className="farm-plots" role="group" aria-label="Crop plots">
              {Array.from({ length: farmPlotCount }, (_, plot) => {
                const harvested = harvestedPlots.includes(plot);
                return (
                  <button
                    key={plot}
                    className="farm-plot"
                    type="button"
                    aria-label={harvested ? "Harvested plot " + (plot + 1) : "Harvest crop " + (plot + 1)}
                    aria-disabled={harvested}
                    tabIndex={harvested ? -1 : undefined}
                    onClick={harvested ? undefined : () => onHarvest(plot)}
                  >
                    {!harvested && <span className="crop-icon" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <button className="back-button" type="button" onClick={onLeaveFarm}>
              Leave Farm
            </button>
          </div>
        ) : (
          <nav className="map-navigation" aria-label="Map movement">
            {directions.map(({ direction, delta }) => {
              if (direction === "north" && atHome) {
                return (
                  <div key={direction} className="map-home">
                    <button
                      type="button"
                      aria-describedby={enteringHome ? undefined : "home-tooltip"}
                      onClick={enterHome}
                    >
                      Home
                    </button>
                    {!enteringHome && (
                      <span id="home-tooltip" className="map-home-tooltip" role="tooltip">
                        Go inside?
                      </span>
                    )}
                  </div>
                );
              }

              if (direction === "west" && atFarm) {
                return (
                  <button key={direction} className="map-farm" type="button" onClick={onEnterFarm}>
                    Farm
                  </button>
                );
              }

              return (
                <button
                  key={direction}
                  type="button"
                  className="back-button map-arrow"
                  data-direction={direction}
                  aria-label={"Move " + direction}
                  onClick={() => onMove(delta)}
                />
              );
            })}
            {coordinates}
          </nav>
        )}
        {!persisted && (
          <p className="screen-message" role="status">
            This browser couldn’t save your game.
          </p>
        )}
      </div>

      <div className="hud-bottom">
        <span className="hud-money"><span className="sr-only">Money: </span>$0</span>
        <InventorySlots capacity={4} label="Inventory" crops={harvestedPlots.length} />
        <button
          className="back-button bag-toggle"
          type="button"
          aria-label="Bag"
          popoverTarget={bagId}
          onClick={onBagSound}
        />
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
      <div ref={houseVeilRef} className="house-entry-veil" aria-hidden="true" />
    </section>
  );
}
