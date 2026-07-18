// Derives a ship's effective combat stats from its base hull, fitted
// passive modules, and trained skills. This is the single source of truth
// for stats — fitting validation, the FittingWindow stat panel, and
// BattleScene's combat initialization all read from the same function so
// they can never drift out of sync.

// Skill bonus multiplier: level 1 is baseline, each level past 1 grants +5%
export const skillMult = (level) => 1 + 0.05 * (Math.max(1, level) - 1);

// EVE stacking penalty (v0.10): the i-th (0-indexed) module `mult` modifier
// on the same stat keeps this fraction of its bonus/malus once ranked by
// magnitude: 1.0000, 0.8691, 0.5706, 0.2830, 0.1060, ... Skill multipliers
// and `add` modifiers are exempt (see multFactors below).
export const stackingPenalty = (i) => Math.pow(0.5, Math.pow(i / 2.22292081, 2));

const RESIST_KEYS = ['em', 'th', 'kin', 'exp'];
const RESIST_CAP = 90;

// Modifier stat paths a passive module may target. Anything outside this
// whitelist is a data bug, not a crash: it's dropped with a console warning.
const PATH_HANDLERS = {
  'defense.shield.hp': { get: (e) => e.defense.shield.hp, set: (e, v) => { e.defense.shield.hp = v; } },
  'defense.armor.hp': { get: (e) => e.defense.armor.hp, set: (e, v) => { e.defense.armor.hp = v; } },
  'defense.hull.hp': { get: (e) => e.defense.hull.hp, set: (e, v) => { e.defense.hull.hp = v; } },
  'defense.sig_radius': { get: (e) => e.defense.sig_radius, set: (e, v) => { e.defense.sig_radius = v; } },
  'mobility.base_speed': { get: (e) => e.mobility.base_speed, set: (e, v) => { e.mobility.base_speed = v; } },
  'mobility.agility': { get: (e) => e.mobility.agility, set: (e, v) => { e.mobility.agility = v; } },
  'resources.pg': { get: (e) => e.resources.pg, set: (e, v) => { e.resources.pg = v; } },
  'resources.cpu': { get: (e) => e.resources.cpu, set: (e, v) => { e.resources.cpu = v; } },
  'damage.hybrid_weapon': { get: (e) => e.damageMult.hybrid_weapon, set: (e, v) => { e.damageMult.hybrid_weapon = v; } },
  'damage.missile_weapon': { get: (e) => e.damageMult.missile_weapon, set: (e, v) => { e.damageMult.missile_weapon = v; } }
};

// Group shorthand: '<layer>.resists' expands to that layer's four damage-type resists.
const RESIST_GROUPS = {
  'defense.shield.resists': (e) => e.defense.shield,
  'defense.armor.resists': (e) => e.defense.armor,
  'defense.hull.resists': (e) => e.defense.hull
};

function toFlatModules(fittedModules) {
  if (Array.isArray(fittedModules)) return fittedModules;
  return [
    ...(fittedModules?.high || []),
    ...(fittedModules?.mid || []),
    ...(fittedModules?.low || [])
  ];
}

// Fitted modules that participate in the real-time combat loop. Passive
// modules are excluded so BattleScene never has to branch on them — their
// effects are already baked into getEffectiveStats().
export function activeModules(fittedModules) {
  return toFlatModules(fittedModules).filter((m) => !m.passive);
}

function applyAdd(eff, stat, value) {
  const group = RESIST_GROUPS[stat];
  if (group) {
    const layer = group(eff);
    for (const type of RESIST_KEYS) layer[type] += value;
    return;
  }
  const handler = PATH_HANDLERS[stat];
  if (!handler) {
    console.warn(`EVE Rogue: unknown modifier stat "${stat}"`);
    return;
  }
  handler.set(eff, handler.get(eff) + value);
}

// Computes a ship's effective stats: base hull values, plus every passive
// module's modifiers, plus skill bonuses. Order is fixed and documented so
// results are predictable: all 'add' modifiers apply first, then all 'mult'
// modifiers. Module mults on the same stat go through the EVE stacking
// penalty (stackingPenalty above, grouped by bonus/malus and ranked by
// magnitude) before combining with the skill mult, which is exempt and
// always applies in full. Resist modifiers are add-only and capped at 90
// after both passes.
//
// fittedModules may be a flat array of modules or the { high, mid, low }
// slot object — callers pass whichever they already have on hand.
export function getEffectiveStats(ship, fittedModules, skills = {}) {
  const flat = toFlatModules(fittedModules);

  const eff = {
    resources: { ...ship.resources },
    defense: {
      shield: { ...ship.defense.shield },
      armor: { ...ship.defense.armor },
      hull: { ...ship.defense.hull },
      sig_radius: ship.defense.sig_radius
    },
    mobility: { ...ship.mobility },
    damageMult: { hybrid_weapon: 1, missile_weapon: 1 },
    // Powergrid/CPU actually consumed by the fitted modules — compare
    // against resources.pg/cpu above to validate whether a fit is legal.
    used: { pg: 0, cpu: 0 }
  };

  for (const m of flat) {
    eff.used.pg += m.cost?.pg || 0;
    eff.used.cpu += m.cost?.cpu || 0;
  }

  const modifiers = flat.filter((m) => m.passive).flatMap((m) => m.modifiers || []);

  for (const mod of modifiers) {
    if (mod.op === 'add') applyAdd(eff, mod.stat, mod.value);
  }

  const multFactors = {
    'resources.pg': skillMult(skills.engineering ?? 1),
    'resources.cpu': skillMult(skills.engineering ?? 1),
    'mobility.base_speed': skillMult(skills.navigation ?? 1),
    'damage.hybrid_weapon': skillMult(skills.gunnery ?? 1),
    'damage.missile_weapon': skillMult(skills.gunnery ?? 1)
  };

  // Module mults are collected per stat first (not applied one-at-a-time)
  // so the stacking penalty can rank them by magnitude before combining.
  const moduleMultsByStat = {};
  for (const mod of modifiers) {
    if (mod.op !== 'mult') continue;
    if (RESIST_GROUPS[mod.stat]) {
      console.warn(`EVE Rogue: resist stacking via 'mult' is unsupported ("${mod.stat}")`);
      continue;
    }
    if (!PATH_HANDLERS[mod.stat]) {
      console.warn(`EVE Rogue: unknown modifier stat "${mod.stat}"`);
      continue;
    }
    (moduleMultsByStat[mod.stat] ??= []).push(mod.value);
  }

  for (const [stat, values] of Object.entries(moduleMultsByStat)) {
    // Bonuses (>=1) and maluses (<1) stack in separate groups (EVE semantics:
    // a positive and a negative mod on the same stat don't compete for rank).
    // Within a group, the strongest modifier (by |value-1|) applies in full
    // (rank 0); each subsequent one keeps a shrinking fraction of its own
    // bonus/malus.
    const bonuses = values.filter((v) => v >= 1).sort((a, b) => b - a);
    const maluses = values.filter((v) => v < 1).sort((a, b) => a - b);
    const groupFactor = (ranked) =>
      ranked.reduce((acc, v, i) => acc * (1 + (v - 1) * stackingPenalty(i)), 1);
    const moduleFactor = groupFactor(bonuses) * groupFactor(maluses);
    multFactors[stat] = (multFactors[stat] ?? 1) * moduleFactor;
  }

  for (const [stat, factor] of Object.entries(multFactors)) {
    const handler = PATH_HANDLERS[stat];
    handler.set(eff, handler.get(eff) * factor);
  }

  for (const layer of ['shield', 'armor', 'hull']) {
    for (const type of RESIST_KEYS) {
      eff.defense[layer][type] = Math.min(RESIST_CAP, eff.defense[layer][type]);
    }
  }

  return eff;
}
