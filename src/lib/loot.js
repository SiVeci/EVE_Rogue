import { MODULES } from '../data/modules';
import { AMMO } from '../data/ammo';
import { DRONES } from '../data/drones';

// Loot tiers unlock progressively with depth: the same lootTable gets richer
// as a run goes deeper rather than needing a separate table per depth band.
export const TIER_UNLOCKS = { T1: 1, Meta: 4, T2: 7 };

// Rolls an encounter's lootTable into a mixed-shape drop list. Three entry
// shapes: { moduleId, chance } (existing — a hit pushes the bare string id,
// unchanged since v0.6), { ammoId, qty, chance } (v0.11 — a hit pushes
// { ammoId, qty }), and { droneId, qty, chance } (v0.12 — a hit pushes
// { droneId, qty }). Each entry is an independent roll; module AND drone
// entries whose tier hasn't unlocked at this depth are skipped without
// consuming a roll (drones are a real strength ladder, gated like modules) —
// ammo entries are all T1 and never tier-gated (any depth can drop them).
// Elite nodes roll the full table twice (two independent passes, same odds)
// rather than doubling each chance, so multi-drops become possible for all
// three shapes. rng is injectable for tests.
export function rollLoot(encounter, depth, nodeType = 'patrol', rng = Math.random) {
  const table = encounter?.lootTable;
  if (!table || table.length === 0) return [];

  const passes = nodeType === 'elite' ? 2 : 1;
  const drops = [];

  for (let pass = 0; pass < passes; pass++) {
    for (const entry of table) {
      if (entry.ammoId) {
        const ammo = AMMO[entry.ammoId];
        if (!ammo) {
          console.warn(`EVE Rogue: lootTable references unknown ammo id "${entry.ammoId}"`);
          continue;
        }
        if (rng() < entry.chance) drops.push({ ammoId: entry.ammoId, qty: entry.qty });
        continue;
      }
      if (entry.droneId) {
        const drone = DRONES[entry.droneId];
        if (!drone) {
          console.warn(`EVE Rogue: lootTable references unknown drone id "${entry.droneId}"`);
          continue;
        }
        const unlockDepth = TIER_UNLOCKS[drone.tier] ?? Infinity;
        if (depth < unlockDepth) continue;
        if (rng() < entry.chance) drops.push({ droneId: entry.droneId, qty: entry.qty });
        continue;
      }
      const module = MODULES[entry.moduleId];
      if (!module) {
        console.warn(`EVE Rogue: lootTable references unknown module id "${entry.moduleId}"`);
        continue;
      }
      const unlockDepth = TIER_UNLOCKS[module.tier] ?? Infinity;
      if (depth < unlockDepth) continue;
      if (rng() < entry.chance) drops.push(entry.moduleId);
    }
  }

  return drops;
}
