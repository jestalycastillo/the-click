export const startingVitals = {
  health: 100,
  energy: 100,
  thirst: 100,
  hunger: 100,
};

export type PlayerVitals = typeof startingVitals;

function savedPercent(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100
    ? value
    : 100;
}

export function restoreVitals(saved?: Partial<PlayerVitals>): PlayerVitals {
  return {
    health: savedPercent(saved?.health),
    energy: savedPercent(saved?.energy),
    thirst: savedPercent(saved?.thirst),
    hunger: savedPercent(saved?.hunger),
  };
}

function losePercent(value: number, maxLoss: number) {
  const loss = 1 + Math.floor(Math.random() * maxLoss);
  return Math.max(0, value - loss);
}

export function vitalsAfterMove(vitals: PlayerVitals): PlayerVitals {
  const energy = Math.random() < 0.7 ? losePercent(vitals.energy, 2) : vitals.energy;
  const thirstChance = energy <= 60 ? 0.5 : 0.3;
  const hungerChance = energy <= 60 ? 0.6 : 0.5;
  let { thirst, hunger } = vitals;

  if (energy <= 85 && Math.random() < thirstChance) {
    thirst = losePercent(thirst, 3);
  }

  if (energy <= 80 && thirst < 100 && Math.random() < hungerChance) {
    hunger = losePercent(hunger, 3);
  }

  const health = Math.random() < 0.07 ? losePercent(vitals.health, 3) : vitals.health;
  return { health, energy, thirst, hunger };
}
