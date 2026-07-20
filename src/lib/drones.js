// Drone limit helpers (v0.12).
//
// Same layer/convention as src/lib/ammo.js: pure, rng-free, no three.js
// import — shared by gameStore (loadDrone validation), FittingWindow (bay
// UI) and BattleScene (launch cap). The three-way limit matrix is defined
// exactly once here.

import { DRONES, DRONE_BANDWIDTH_UNIT } from '../data/drones';

// In-space cap: bandwidth-allowed count vs. the Drones skill level, whichever
// is smaller. Gate skills default to 0 — an untrained pilot fields none.
export function maxDronesInSpace(ship, skills) {
  const byBandwidth = Math.floor((ship?.drone_bandwidth || 0) / DRONE_BANDWIDTH_UNIT);
  return Math.max(0, Math.min(byBandwidth, skills?.drones || 0));
}

// Total bay volume a manifest of drone ids consumes. Unknown ids count 0
// (mirrors the silent-drop convention elsewhere in the data layer).
export function droneBayUsed(droneIds) {
  return (droneIds || []).reduce((sum, id) => sum + (DRONES[id]?.volume || 0), 0);
}

// Volume gate for loading one more drone into a ship's bay.
export function canLoadDrone(ship, bayIds, droneId) {
  const volume = DRONES[droneId]?.volume || 0;
  return droneBayUsed(bayIds) + volume <= (ship?.drone_bay || 0);
}
