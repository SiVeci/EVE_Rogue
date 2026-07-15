// NPC Ship Definitions & Encounter Scaling

// SP awarded per victory, before depth/elite scaling — see docs/balance.md
// "SP economy". Uniform across archetypes: bounty expresses target value,
// SP expresses combat experience.
const SP_REWARD_BASE = 200;

export const NPCS = {
  // Weak to kinetic (v0.8 retrofit — see docs/balance.md faction signature table).
  guristas_frigate: {
    id: 'guristas_frigate',
    name: 'Guristas Pirate',
    class: 'Frigate',
    faction: 'Guristas',
    defense: {
      shield: { hp: 220, em: 35, th: 35, kin: 5, exp: 40 },
      armor: { hp: 160, em: 30, th: 30, kin: 5, exp: 30 },
      hull: { hp: 200, em: 30, th: 30, kin: 10, exp: 30 },
      sig_radius: 40 // meters
    },
    mobility: {
      base_speed: 240, // m/s — slower than player frigates so brawlers can close in
      agility: 3.0
    },
    ai: {
      orbitRange: 2.5 // km, preferred engagement orbit
    },
    weapon: {
      name: 'Rocket Launcher',
      type: 'missile_weapon',
      stats: {
        range: 8500, // m
        rof: 3.0,
        damage: { em: 0, th: 0, kin: 12, exp: 0 }
      }
    },
    lootTable: [
      { moduleId: 'rocket_launcher_i', chance: 0.08 },
      { moduleId: 'light_missile_launcher_i', chance: 0.10 },
      { moduleId: 'ballistic_control_system_i', chance: 0.12 },
      { moduleId: 'ballistic_control_system_ii', chance: 0.06 },
      { moduleId: 'rocket_launcher_ii', chance: 0.06 }
    ],
    baseReward: 15000 // ISK
  },

  // Close-orbit blaster boat: huge damage inside 2 km. Kite it or out-trade it.
  // Weak to thermal (v0.8 retrofit, aligned to Serpentis Scout).
  serpentis_brawler: {
    id: 'serpentis_brawler',
    name: 'Serpentis Brawler',
    class: 'Frigate',
    faction: 'Serpentis',
    defense: {
      shield: { hp: 180, em: 35, th: 5, kin: 35, exp: 40 },
      armor: { hp: 280, em: 30, th: 5, kin: 30, exp: 30 },
      hull: { hp: 220, em: 30, th: 10, kin: 30, exp: 30 },
      sig_radius: 38
    },
    mobility: {
      base_speed: 350,
      agility: 2.6
    },
    ai: {
      orbitRange: 1.0
    },
    weapon: {
      name: 'Blaster Battery',
      type: 'hybrid_weapon',
      stats: {
        optimal: 1500,
        falloff: 2000,
        tracking: 280,
        rof: 3.0,
        damage: { em: 0, th: 9, kin: 9, exp: 0 }
      }
    },
    lootTable: [
      { moduleId: 'light_ion_blaster_i', chance: 0.09 },
      { moduleId: 'fleeting_compact_stasis_webifier', chance: 0.10 },
      { moduleId: 'magnetic_field_stabilizer_i', chance: 0.10 },
      { moduleId: 'light_neutron_blaster_ii', chance: 0.08 },
      { moduleId: 'small_armor_repairer_ii', chance: 0.06 }
    ],
    baseReward: 18000
  },

  // Long-range railgun kiter: deadly to a static target, nearly blind against
  // a fast close orbit. Burn in — but MWD signature bloom cuts both ways.
  // Weak to kinetic (v0.8 retrofit, aligned to Guristas Pirate).
  guristas_sniper: {
    id: 'guristas_sniper',
    name: 'Guristas Sniper',
    class: 'Frigate',
    faction: 'Guristas',
    defense: {
      shield: { hp: 280, em: 35, th: 35, kin: 5, exp: 40 },
      armor: { hp: 140, em: 30, th: 30, kin: 5, exp: 30 },
      hull: { hp: 180, em: 30, th: 30, kin: 10, exp: 30 },
      sig_radius: 42
    },
    mobility: {
      base_speed: 220,
      agility: 3.5
    },
    ai: {
      orbitRange: 15
    },
    weapon: {
      name: 'Railgun Battery',
      type: 'hybrid_weapon',
      stats: {
        optimal: 15000,
        falloff: 5000,
        tracking: 35,
        rof: 4.5,
        damage: { em: 0, th: 7, kin: 7, exp: 0 }
      }
    },
    lootTable: [
      { moduleId: 'railgun_125mm_i', chance: 0.17 },
      { moduleId: 'co_processor_i', chance: 0.12 },
      { moduleId: 'light_neutron_blaster_ii', chance: 0.08 },
      { moduleId: 'railgun_125mm_ii', chance: 0.06 }
    ],
    baseReward: 20000
  },

  // Rocket boat with a stasis web: slows the player inside 10 km. Bring a
  // stronger prop mod, or stay out of the web envelope entirely.
  // Weak to explosive (v0.8 retrofit, aligned to Angel Hunter).
  angel_webber: {
    id: 'angel_webber',
    name: 'Angel Webber',
    class: 'Frigate',
    faction: 'Angel Cartel',
    defense: {
      shield: { hp: 200, em: 35, th: 35, kin: 40, exp: 10 },
      armor: { hp: 200, em: 35, th: 30, kin: 30, exp: 5 },
      hull: { hp: 200, em: 30, th: 30, kin: 30, exp: 10 },
      sig_radius: 40
    },
    mobility: {
      base_speed: 330,
      agility: 2.8
    },
    ai: {
      orbitRange: 2.5
    },
    weapon: {
      name: 'Rocket Battery',
      type: 'missile_weapon',
      stats: {
        range: 9000,
        rof: 3.5,
        damage: { em: 0, th: 0, kin: 6, exp: 10 }
      }
    },
    ewar: {
      optimal: 10000, // m
      speed_reduction_pct: 50
    },
    lootTable: [
      { moduleId: 'fleeting_compact_stasis_webifier', chance: 0.17 },
      { moduleId: 'mn1_monopropellant_afterburner', chance: 0.10 },
      { moduleId: 'overdrive_injector_system_i', chance: 0.10 },
      { moduleId: 'light_missile_launcher_ii', chance: 0.06 }
    ],
    baseReward: 22000
  },

  // Mid-range "laser" boat (hybrid_weapon mechanic under Sansha flavor).
  // Weak to EM across every layer — an EM-resist swap measurably shortens TTK.
  sansha_slaver: {
    id: 'sansha_slaver',
    name: 'Sansha Slaver',
    class: 'Frigate',
    faction: "Sansha's Nation",
    defense: {
      shield: { hp: 210, em: 5, th: 30, kin: 35, exp: 40 },
      armor: { hp: 190, em: 5, th: 30, kin: 30, exp: 30 },
      hull: { hp: 200, em: 10, th: 40, kin: 40, exp: 40 },
      sig_radius: 40
    },
    mobility: {
      base_speed: 260,
      agility: 3.2
    },
    ai: {
      orbitRange: 6
    },
    weapon: {
      name: 'Neutron Battery',
      type: 'hybrid_weapon',
      stats: {
        optimal: 6000,
        falloff: 2500,
        tracking: 150,
        rof: 3.5,
        damage: { em: 6, th: 6, kin: 0, exp: 0 }
      }
    },
    lootTable: [
      { moduleId: 'light_ion_blaster_i', chance: 0.12 },
      { moduleId: 'energized_adaptive_nano_membrane_i', chance: 0.10 },
      { moduleId: 'stasis_webifier_i', chance: 0.08 },
      { moduleId: 'magnetic_field_stabilizer_ii', chance: 0.06 }
    ],
    baseReward: 19000
  },

  // Close-orbit Sansha brawler — same EM weakness as the Slaver, but built
  // to trade damage up close rather than kite at mid range.
  sansha_ravager: {
    id: 'sansha_ravager',
    name: 'Sansha Ravager',
    class: 'Frigate',
    faction: "Sansha's Nation",
    defense: {
      shield: { hp: 200, em: 5, th: 30, kin: 35, exp: 40 },
      armor: { hp: 260, em: 5, th: 30, kin: 30, exp: 30 },
      hull: { hp: 210, em: 10, th: 40, kin: 40, exp: 40 },
      sig_radius: 38
    },
    mobility: {
      base_speed: 340,
      agility: 2.5
    },
    ai: {
      orbitRange: 1.2
    },
    weapon: {
      name: 'Neutron Battery',
      type: 'hybrid_weapon',
      stats: {
        optimal: 1300,
        falloff: 1800,
        tracking: 260,
        rof: 2.8,
        damage: { em: 8, th: 8, kin: 0, exp: 0 }
      }
    },
    lootTable: [
      { moduleId: 'light_electron_blaster_i', chance: 0.12 },
      { moduleId: 'small_acm_compact_armor_repairer', chance: 0.10 },
      { moduleId: 'energized_adaptive_nano_membrane_i', chance: 0.09 },
      { moduleId: 'mn1_afterburner_ii', chance: 0.06 }
    ],
    baseReward: 21000
  },

  // Serpentis EWAR variant: blaster fire plus a web, weak to thermal damage.
  serpentis_scout: {
    id: 'serpentis_scout',
    name: 'Serpentis Scout',
    class: 'Frigate',
    faction: 'Serpentis',
    defense: {
      shield: { hp: 190, em: 35, th: 5, kin: 35, exp: 40 },
      armor: { hp: 200, em: 30, th: 5, kin: 30, exp: 30 },
      hull: { hp: 200, em: 30, th: 10, kin: 30, exp: 30 },
      sig_radius: 40
    },
    mobility: {
      base_speed: 300,
      agility: 3.0
    },
    ai: {
      orbitRange: 2.0
    },
    weapon: {
      name: 'Blaster Battery',
      type: 'hybrid_weapon',
      stats: {
        optimal: 1800,
        falloff: 2200,
        tracking: 220,
        rof: 3.2,
        damage: { em: 0, th: 8, kin: 7, exp: 0 }
      }
    },
    ewar: {
      optimal: 9000,
      speed_reduction_pct: 45
    },
    lootTable: [
      { moduleId: 'fleeting_compact_stasis_webifier', chance: 0.12 },
      { moduleId: 'light_ion_blaster_i', chance: 0.10 },
      { moduleId: 'magnetic_field_stabilizer_i', chance: 0.08 },
      { moduleId: 'stasis_webifier_ii', chance: 0.06 }
    ],
    baseReward: 19500
  },

  // Angel Cartel's fastest hull — faster than any NPC and every player ship
  // but the Atron. Kiting doesn't work; weak to explosive damage instead.
  angel_hunter: {
    id: 'angel_hunter',
    name: 'Angel Hunter',
    class: 'Frigate',
    faction: 'Angel Cartel',
    defense: {
      shield: { hp: 190, em: 35, th: 35, kin: 40, exp: 10 },
      armor: { hp: 190, em: 35, th: 30, kin: 30, exp: 5 },
      hull: { hp: 190, em: 30, th: 30, kin: 30, exp: 10 },
      sig_radius: 38
    },
    mobility: {
      base_speed: 390,
      agility: 2.3
    },
    ai: {
      orbitRange: 1.0
    },
    weapon: {
      name: 'Rocket Battery',
      type: 'missile_weapon',
      stats: {
        range: 7500,
        rof: 3.0,
        damage: { em: 0, th: 0, kin: 7, exp: 9 }
      }
    },
    lootTable: [
      { moduleId: 'mn1_monopropellant_afterburner', chance: 0.14 },
      { moduleId: 'overdrive_injector_system_i', chance: 0.10 },
      { moduleId: 'fleeting_compact_stasis_webifier', chance: 0.08 },
      { moduleId: 'small_shield_booster_ii', chance: 0.06 }
    ],
    baseReward: 24000
  }
};

// Archetypes unlock as the player dives deeper. weight sets relative
// frequency among the currently-unlocked pool — as more archetypes unlock
// with depth, some stay more common than others rather than diluting
// uniformly (e.g. the depth-1 baseline Guristas frigate stays the single
// most likely pull even once seven other archetypes have joined the pool).
export const ENCOUNTER_UNLOCKS = [
  { depth: 1, npc: 'guristas_frigate', weight: 3 },
  { depth: 3, npc: 'serpentis_brawler', weight: 2 },
  { depth: 4, npc: 'sansha_slaver', weight: 2 },
  { depth: 5, npc: 'guristas_sniper', weight: 2 },
  { depth: 5, npc: 'serpentis_scout', weight: 2 },
  { depth: 6, npc: 'sansha_ravager', weight: 2 },
  { depth: 7, npc: 'angel_webber', weight: 1 },
  { depth: 8, npc: 'angel_hunter', weight: 1 }
];

export function availableNpcs(depth) {
  return ENCOUNTER_UNLOCKS.filter((u) => depth >= u.depth).map((u) => NPCS[u.npc]);
}

// Weighted pick among the depth-unlocked pool. rng is injectable for tests.
export function pickWeightedNpc(depth, rng = Math.random) {
  const pool = ENCOUNTER_UNLOCKS.filter((u) => depth >= u.depth);
  const totalWeight = pool.reduce((sum, u) => sum + u.weight, 0);
  let roll = rng() * totalWeight;
  for (const u of pool) {
    roll -= u.weight;
    if (roll < 0) return NPCS[u.npc];
  }
  return NPCS[pool[pool.length - 1].npc]; // floating-point guard
}

// Scales an NPC for a given deadspace depth and map node type.
// Depth raises HP and damage; elite nodes are tougher but pay double.
// EWAR strength is deliberately not scaled.
export function buildEncounter(npc, depth, nodeType = 'patrol') {
  const depthMult = 1 + 0.15 * (depth - 1);
  const statMult = depthMult * (nodeType === 'elite' ? 1.5 : 1);

  const scaleLayer = (layer) => ({ ...layer, hp: Math.round(layer.hp * statMult) });
  const scaleDamage = (damage) =>
    Object.fromEntries(Object.entries(damage).map(([type, val]) => [type, val * statMult]));

  return {
    ...npc,
    name: nodeType === 'elite' ? `Elite ${npc.name}` : npc.name,
    defense: {
      shield: scaleLayer(npc.defense.shield),
      armor: scaleLayer(npc.defense.armor),
      hull: scaleLayer(npc.defense.hull),
      sig_radius: npc.defense.sig_radius
    },
    weapon: {
      ...npc.weapon,
      stats: { ...npc.weapon.stats, damage: scaleDamage(npc.weapon.stats.damage) }
    },
    reward: Math.round(npc.baseReward * depthMult * (nodeType === 'elite' ? 2 : 1)),
    spReward: Math.round(SP_REWARD_BASE * depthMult * (nodeType === 'elite' ? 2 : 1))
  };
}

// Random encounter from the depth-unlocked pool, weighted by archetype.
// rng is injectable for tests.
export function rollEncounter(depth, nodeType = 'patrol', rng = Math.random) {
  const npc = pickWeightedNpc(depth, rng);
  return buildEncounter(npc, depth, nodeType);
}
