// Drone Definitions (v0.12)
//
// Light scout drones share one frame; damage type is the only combat
// difference (mirrors the v0.11 four-warhead convention). A drone is not a
// module: no `cost` (pg/cpu), no `modifiers`, never enters inventory or
// fittedModules — it lives in gameStore's droneHangar (station stock) and
// activeShip.drones (loadout manifest). `defense` uses the same three-layer
// shape as a ship hull so applyDamage/BattleScene reuse it verbatim; `weapon`
// uses the same shape as a module's turret `stats` so rollTurretShot reuses
// it verbatim. Drone damage takes no gunnery/damage-amp multiplier — see
// docs/balance.md "Drones".

export const DRONES = {
  hobgoblin_i: {
    id: 'hobgoblin_i',
    name: 'Hobgoblin I',
    tier: 'T1',
    price: 8000,
    volume: 5, // m^3, drone_bay budget
    bandwidth: 5, // Mbit, drone_bandwidth budget
    sig_radius: 25, // meters
    speed: 600, // m/s, transit (approach/return)
    orbit_range: 750, // m, engage orbit
    orbit_speed: 150, // m/s, engage speed
    agility: 0.5,
    defense: {
      shield: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 10, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 9, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  hornet_i: {
    id: 'hornet_i',
    name: 'Hornet I',
    tier: 'T1',
    price: 8000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 10, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 9, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  warrior_i: {
    id: 'warrior_i',
    name: 'Warrior I',
    tier: 'T1',
    price: 8000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 10, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 0, exp: 9 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  acolyte_i: {
    id: 'acolyte_i',
    name: 'Acolyte I',
    tier: 'T1',
    price: 8000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 15, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 10, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 9, th: 0, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },

  // --- META VARIANTS ('Integrated' series, v0.12 FR-6) — loot-only, via the
  // Rogue Drones tables. Tier ladder step (docs/balance.md): damage/HP ×1.10
  // over T1, rounded — same frame (volume/bandwidth/sig/speed/orbit/agility
  // unchanged, matching the four-warhead "damage type is the only combat
  // difference" convention extended across the tier ladder too).
  integrated_hobgoblin: {
    id: 'integrated_hobgoblin',
    name: 'Integrated Hobgoblin',
    tier: 'Meta',
    price: 12000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 11, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 10, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  integrated_hornet: {
    id: 'integrated_hornet',
    name: 'Integrated Hornet',
    tier: 'Meta',
    price: 12000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 11, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 10, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  integrated_warrior: {
    id: 'integrated_warrior',
    name: 'Integrated Warrior',
    tier: 'Meta',
    price: 12000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 11, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 0, exp: 10 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  integrated_acolyte: {
    id: 'integrated_acolyte',
    name: 'Integrated Acolyte',
    tier: 'Meta',
    price: 12000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 17, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 11, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 10, th: 0, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },

  // --- T2 VARIANTS ('II' series, v0.12 FR-6) — loot-only, via the Rogue
  // Drones tables. Tier ladder step: damage/HP ×1.20 over T1, rounded.
  hobgoblin_ii: {
    id: 'hobgoblin_ii',
    name: 'Hobgoblin II',
    tier: 'T2',
    price: 28000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 12, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 11, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  hornet_ii: {
    id: 'hornet_ii',
    name: 'Hornet II',
    tier: 'T2',
    price: 28000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 12, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 11, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  warrior_ii: {
    id: 'warrior_ii',
    name: 'Warrior II',
    tier: 'T2',
    price: 28000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 12, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 0, th: 0, kin: 0, exp: 11 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  },
  acolyte_ii: {
    id: 'acolyte_ii',
    name: 'Acolyte II',
    tier: 'T2',
    price: 28000,
    volume: 5,
    bandwidth: 5,
    sig_radius: 25,
    speed: 600,
    orbit_range: 750,
    orbit_speed: 150,
    agility: 0.5,
    defense: {
      shield: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      armor: { hp: 18, em: 0, th: 0, kin: 0, exp: 0 },
      hull: { hp: 12, em: 0, th: 0, kin: 0, exp: 0 }
    },
    weapon: {
      damage: { em: 11, th: 0, kin: 0, exp: 0 },
      rof: 4.0,
      optimal: 800,
      falloff: 600,
      tracking: 600
    }
  }
};

// Bay/bandwidth budget divisor: all T1/Meta/T2 light drones in this version
// are uniformly 5 Mbit (medium/heavy drones are an explicit non-goal).
export const DRONE_BANDWIDTH_UNIT = 5;
