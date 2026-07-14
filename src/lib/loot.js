import { MODULES } from '../data/modules';

// Loot tiers unlock progressively with depth: the same lootTable gets richer
// as a run goes deeper rather than needing a separate table per depth band.
export const TIER_UNLOCKS = { T1: 1, Meta: 4, T2: 7 };

// Rolls an encounter's lootTable ([{ moduleId, chance }]) into a list of
// dropped module ids. Each entry is an independent roll; entries whose
// module tier hasn't unlocked at this depth are skipped without consuming
// a roll. Elite nodes roll the full table twice (two independent passes,
// same odds) rather than doubling each chance, so multi-drops become
// possible. rng is injectable for tests.
export function rollLoot(encounter, depth, nodeType = 'patrol', rng = Math.random) {
  const table = encounter?.lootTable;
  if (!table || table.length === 0) return [];

  const passes = nodeType === 'elite' ? 2 : 1;
  const drops = [];

  for (let pass = 0; pass < passes; pass++) {
    for (const entry of table) {
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
