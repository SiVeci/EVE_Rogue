import { SHIPS } from './ships';
import { MODULES } from './modules';

// Skill definitions. Two families, two default levels (see docs/balance.md):
// stat skills feed skillMult() in src/lib/shipStats.js and start at 1 (its
// no-bonus baseline); gate skills never feed skillMult — they only unlock
// hulls/modules via requiredSkills — and start at 0 (untrained).
export const SKILLS = {
  engineering: { name: 'Engineering', desc: '+5% CPU and Powergrid per level' },
  gunnery: { name: 'Gunnery', desc: '+5% weapon damage per level' },
  navigation: { name: 'Navigation', desc: '+5% base speed per level' },
  destroyers: { name: 'Destroyers', desc: 'Level 1 required to board destroyer-class hulls' },
  small_hybrid_turret: { name: 'Small Hybrid Turret', desc: 'Level 5 unlocks Tech II small hybrid turrets and damage amplifiers' },
  missiles: { name: 'Missiles', desc: 'Level 5 unlocks Tech II missile launchers' },
  shield_operation: { name: 'Shield Operation', desc: 'Level 4 unlocks Tech II shield modules' },
  repair_systems: { name: 'Repair Systems', desc: 'Level 4 unlocks Tech II armor repairers' },
  high_speed_maneuvering: { name: 'High Speed Maneuvering', desc: 'Level 4 unlocks Tech II propulsion modules' },
  electronic_warfare: { name: 'Electronic Warfare', desc: 'Level 4 unlocks Tech II stasis webifiers' },
  drones: { name: 'Drones', desc: 'Each level allows one more drone in space (bandwidth permitting)' }
};

// A ship or module's `requiredSkills` is a { skillKey: minLevel } map. Both
// gameStore (fitting/boarding gates) and FittingWindow (lock hints) use
// these two helpers so the requirement shape only needs to be understood
// in one place.
export function meetsRequiredSkills(requiredSkills, skills) {
  return Object.entries(requiredSkills || {}).every(([skill, level]) => (skills?.[skill] || 0) >= level);
}

export function describeRequiredSkills(requiredSkills) {
  return Object.entries(requiredSkills || {})
    .map(([skill, level]) => `${SKILLS[skill]?.name || skill} ${level}`)
    .join(', ');
}

// Reverse-lookup everything a skill unlocks, grouped by required level
// (ascending). Stat skills naturally return [] — nothing lists them in
// requiredSkills.
export function skillUnlocks(skillKey) {
  const byLevel = new Map();
  for (const item of [...Object.values(SHIPS), ...Object.values(MODULES)]) {
    const lvl = item.requiredSkills?.[skillKey];
    if (lvl === undefined) continue;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    byLevel.get(lvl).push(item.name);
  }
  return [...byLevel.entries()].sort((a, b) => a[0] - b[0])
    .map(([level, names]) => ({ level, names }));
}
