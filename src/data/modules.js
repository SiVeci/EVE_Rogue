// Initial Module Definitions

export const MODULES = {
  // --- WEAPONS (High Slots) ---
  light_electron_blaster_i: {
    id: 'light_electron_blaster_i',
    name: 'Light Electron Blaster I',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T1',
    description: 'Short range, high damage hybrid weapon.',
    cost: { pg: 3, cpu: 11, cap: 2 },
    stats: {
      optimal: 1200, // m
      falloff: 2000, // m
      tracking: 350,
      rof: 3.2, // Rate of fire (seconds)
      damage: { em: 0, th: 6, kin: 6, exp: 0 }
    }
  },
  rocket_launcher_i: {
    id: 'rocket_launcher_i',
    name: 'Rocket Launcher I',
    type: 'missile_weapon',
    slot: 'high',
    tier: 'T1',
    description: 'Fires unguided rockets. Always hits if within range.',
    cost: { pg: 4, cpu: 20, cap: 0 },
    stats: {
      range: 8500, // Flight time * Velocity
      rof: 4.0,
      damage: { em: 0, th: 0, kin: 18, exp: 0 },
      explosion_radius: 20,
      explosion_velocity: 150
    }
  },

  // --- SHIELD & ARMOR (Mid / Low Slots) ---
  small_shield_booster_i: {
    id: 'small_shield_booster_i',
    name: 'Small Shield Booster I',
    type: 'shield_repair',
    slot: 'mid',
    tier: 'T1',
    description: 'Quickly restores shield HP at the cost of high capacitor usage.',
    cost: { pg: 5, cpu: 20, cap: 20 },
    stats: {
      activation_time: 2.0, // seconds
      shield_bonus: 30
    }
  },
  small_armor_repairer_i: {
    id: 'small_armor_repairer_i',
    name: 'Small Armor Repairer I',
    type: 'armor_repair',
    slot: 'low',
    tier: 'T1',
    description: 'Repairs armor damage slowly. Operates at the end of the cycle.',
    cost: { pg: 8, cpu: 15, cap: 16 },
    stats: {
      activation_time: 4.0,
      armor_bonus: 40
    }
  },

  // --- PROPULSION (Mid Slots) ---
  mn1_afterburner_i: {
    id: 'mn1_afterburner_i',
    name: '1MN Afterburner I',
    type: 'propulsion',
    slot: 'mid',
    tier: 'T1',
    description: 'Increases ship maximum velocity without a signature radius penalty.',
    cost: { pg: 5, cpu: 10, cap: 5 },
    stats: {
      activation_time: 10.0,
      speed_multiplier: 2.15 // +115%
    }
  },

  // --- ELECTRONIC WARFARE (Mid Slots) ---
  stasis_webifier_i: {
    id: 'stasis_webifier_i',
    name: 'Stasis Webifier I',
    type: 'ewar',
    slot: 'mid',
    tier: 'T1',
    description: 'Slows down the target ship.',
    cost: { pg: 1, cpu: 25, cap: 10 },
    stats: {
      activation_time: 5.0,
      optimal: 10000,
      speed_reduction_pct: 50
    }
  }
};
