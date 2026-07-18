// Initial Module Definitions

export const MODULES = {
  // --- WEAPONS (High Slots) ---
  light_electron_blaster_i: {
    id: 'light_electron_blaster_i',
    name: 'Light Electron Blaster I',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T1',
    price: 5000,
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
  light_ion_blaster_i: {
    id: 'light_ion_blaster_i',
    name: 'Light Ion Blaster I',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T1',
    price: 7500,
    description: 'The heaviest of the light blasters. More damage, more fitting.',
    cost: { pg: 5, cpu: 15, cap: 2.5 },
    stats: {
      optimal: 1300,
      falloff: 2200,
      tracking: 320,
      rof: 3.2,
      damage: { em: 0, th: 7.5, kin: 7.5, exp: 0 }
    }
  },
  railgun_125mm_i: {
    id: 'railgun_125mm_i',
    name: '125mm Railgun I',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T1',
    price: 7000,
    description: 'Long range hybrid weapon. Poor tracking against close, fast targets.',
    cost: { pg: 6, cpu: 18, cap: 3 },
    stats: {
      optimal: 9000,
      falloff: 3000,
      tracking: 90,
      rof: 4.0,
      damage: { em: 0, th: 4.5, kin: 4.5, exp: 0 }
    }
  },
  railgun_150mm_i: {
    id: 'railgun_150mm_i',
    name: '150mm Railgun I',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T1',
    price: 9000,
    description: 'The heaviest small railgun. Reaches well past rocket range — poor tracking makes it nearly blind up close.',
    cost: { pg: 8, cpu: 22, cap: 3.5 },
    stats: {
      optimal: 12000,
      falloff: 4000,
      tracking: 70,
      rof: 4.0,
      damage: { em: 0, th: 6, kin: 6, exp: 0 }
    }
  },
  light_neutron_blaster_ii: {
    id: 'light_neutron_blaster_ii',
    name: 'Light Neutron Blaster II',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T2',
    price: 30000,
    requiredSkills: { small_hybrid_turret: 5 },
    description: 'The largest light hybrid turret. Tech II fitting requirements, meaningfully more damage than the Ion. Loot-only.',
    cost: { pg: 7, cpu: 18, cap: 3 },
    stats: {
      optimal: 1400,
      falloff: 2400,
      tracking: 300,
      rof: 3.2,
      damage: { em: 0, th: 9, kin: 9, exp: 0 }
    }
  },
  railgun_125mm_ii: {
    id: 'railgun_125mm_ii',
    name: '125mm Railgun II',
    type: 'hybrid_weapon',
    slot: 'high',
    tier: 'T2',
    price: 25000,
    requiredSkills: { small_hybrid_turret: 5 },
    description: 'Tech II railgun. Sharper tracking and more damage than the T1 variant. Loot-only.',
    cost: { pg: 7, cpu: 21, cap: 3.5 },
    stats: {
      optimal: 9500,
      falloff: 3200,
      tracking: 100,
      rof: 4.0,
      damage: { em: 0, th: 5.4, kin: 5.4, exp: 0 }
    }
  },
  rocket_launcher_i: {
    id: 'rocket_launcher_i',
    name: 'Rocket Launcher I',
    type: 'missile_weapon',
    slot: 'high',
    tier: 'T1',
    price: 6000,
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
  light_missile_launcher_i: {
    id: 'light_missile_launcher_i',
    name: 'Light Missile Launcher I',
    type: 'missile_weapon',
    slot: 'high',
    tier: 'T1',
    price: 7000,
    description: 'Long range guided missiles. Lower damage than rockets, far greater reach.',
    cost: { pg: 4, cpu: 22, cap: 0 },
    stats: {
      range: 22000,
      rof: 5.0,
      damage: { em: 0, th: 0, kin: 15, exp: 0 },
      explosion_radius: 40,
      explosion_velocity: 170
    }
  },

  rocket_launcher_ii: {
    id: 'rocket_launcher_ii',
    name: 'Rocket Launcher II',
    type: 'missile_weapon',
    slot: 'high',
    tier: 'T2',
    price: 21000,
    requiredSkills: { missiles: 5 },
    description: 'Tech II rocket launcher. Heavier warheads than the T1 variant. Loot-only.',
    cost: { pg: 5, cpu: 24, cap: 0 },
    stats: {
      range: 8500,
      rof: 4.0,
      damage: { em: 0, th: 0, kin: 21.6, exp: 0 },
      explosion_radius: 20,
      explosion_velocity: 150
    }
  },
  light_missile_launcher_ii: {
    id: 'light_missile_launcher_ii',
    name: 'Light Missile Launcher II',
    type: 'missile_weapon',
    slot: 'high',
    tier: 'T2',
    price: 25000,
    requiredSkills: { missiles: 5 },
    description: 'Tech II guided missile launcher. Heavier warheads than the T1 variant. Loot-only.',
    cost: { pg: 5, cpu: 26, cap: 0 },
    stats: {
      range: 22000,
      rof: 5.0,
      damage: { em: 0, th: 0, kin: 18, exp: 0 },
      explosion_radius: 40,
      explosion_velocity: 170
    }
  },

  // --- ENERGY WARFARE (High Slots, v0.10) ---
  small_energy_neutralizer_i: {
    id: 'small_energy_neutralizer_i',
    name: 'Small Energy Neutralizer I',
    type: 'energy_neut',
    slot: 'high',
    tier: 'T1',
    price: 12000,
    description: 'Projects a destabilizing energy field that burns away the target\'s capacitor. Very heavy capacitor draw.',
    cost: { pg: 5, cpu: 18, cap: 25 },
    stats: {
      activation_time: 5.0,
      optimal: 6000,
      neut_amount: 50
    }
  },
  small_infectious_scoped_energy_neutralizer: {
    id: 'small_infectious_scoped_energy_neutralizer',
    name: 'Small Infectious Scoped Energy Neutralizer',
    type: 'energy_neut',
    slot: 'high',
    tier: 'Meta',
    price: 18000,
    description: 'Refined neutralizer emitter. Longer reach and a harder capacitor burn per cycle.',
    cost: { pg: 5, cpu: 18, cap: 25 },
    stats: {
      activation_time: 5.0,
      optimal: 7500,
      neut_amount: 55
    }
  },

  // --- SHIELD & ARMOR (Mid / Low Slots) ---
  small_shield_booster_i: {
    id: 'small_shield_booster_i',
    name: 'Small Shield Booster I',
    type: 'shield_repair',
    slot: 'mid',
    tier: 'T1',
    price: 8000,
    description: 'Quickly restores shield HP at the cost of high capacitor usage.',
    cost: { pg: 5, cpu: 20, cap: 20 },
    stats: {
      activation_time: 2.0, // seconds
      shield_bonus: 30
    }
  },
  medium_shield_booster_i: {
    id: 'medium_shield_booster_i',
    name: 'Medium Shield Booster I',
    type: 'shield_repair',
    slot: 'mid',
    tier: 'T1',
    price: 12000,
    description: 'An oversized booster for a frigate. Huge repair amount, punishing fitting and capacitor cost.',
    cost: { pg: 14, cpu: 28, cap: 45 },
    stats: {
      activation_time: 2.0,
      shield_bonus: 60
    }
  },
  small_shield_booster_ii: {
    id: 'small_shield_booster_ii',
    name: 'Small Shield Booster II',
    type: 'shield_repair',
    slot: 'mid',
    tier: 'T2',
    price: 28000,
    requiredSkills: { shield_operation: 4 },
    description: 'Tech II shield booster. Restores more shield per cycle than the T1 variant. Loot-only.',
    cost: { pg: 6, cpu: 24, cap: 22 },
    stats: {
      activation_time: 2.0,
      shield_bonus: 36
    }
  },
  small_armor_repairer_i: {
    id: 'small_armor_repairer_i',
    name: 'Small Armor Repairer I',
    type: 'armor_repair',
    slot: 'low',
    tier: 'T1',
    price: 8000,
    description: 'Repairs armor damage slowly. Operates at the end of the cycle.',
    cost: { pg: 8, cpu: 15, cap: 16 },
    stats: {
      activation_time: 4.0,
      armor_bonus: 40
    }
  },
  small_acm_compact_armor_repairer: {
    id: 'small_acm_compact_armor_repairer',
    name: 'Small ACM Compact Armor Repairer',
    type: 'armor_repair',
    slot: 'low',
    tier: 'Meta',
    price: 11000,
    description: 'Refined armor repairer. Same repair amount for less capacitor and easier fitting.',
    cost: { pg: 6, cpu: 12, cap: 12 },
    stats: {
      activation_time: 4.0,
      armor_bonus: 40
    }
  },

  small_armor_repairer_ii: {
    id: 'small_armor_repairer_ii',
    name: 'Small Armor Repairer II',
    type: 'armor_repair',
    slot: 'low',
    tier: 'T2',
    price: 28000,
    requiredSkills: { repair_systems: 4 },
    description: 'Tech II armor repairer. Restores more armor per cycle than the T1 variant. Loot-only.',
    cost: { pg: 9, cpu: 18, cap: 18 },
    stats: {
      activation_time: 4.0,
      armor_bonus: 48
    }
  },

  // --- PROPULSION (Mid Slots) ---
  mn1_afterburner_i: {
    id: 'mn1_afterburner_i',
    name: '1MN Afterburner I',
    type: 'propulsion',
    slot: 'mid',
    tier: 'T1',
    price: 6000,
    description: 'Increases ship maximum velocity without a signature radius penalty.',
    cost: { pg: 5, cpu: 10, cap: 5 },
    stats: {
      activation_time: 10.0,
      speed_multiplier: 2.15 // +115%
    }
  },
  mn1_mwd_i: {
    id: 'mn1_mwd_i',
    name: '1MN Microwarpdrive I',
    type: 'propulsion',
    slot: 'mid',
    tier: 'T1',
    price: 12000,
    description: 'Massive velocity boost. Bloats your signature radius while active — enemy turrets will find you much easier to hit.',
    cost: { pg: 12, cpu: 18, cap: 30 },
    stats: {
      activation_time: 10.0,
      speed_multiplier: 5.0,
      sig_multiplier: 5.0
    }
  },
  mn1_monopropellant_afterburner: {
    id: 'mn1_monopropellant_afterburner',
    name: '1MN Monopropellant Enduring Afterburner',
    type: 'propulsion',
    slot: 'mid',
    tier: 'Meta',
    price: 9000,
    description: 'Tuned afterburner. Higher top speed and reduced capacitor draw.',
    cost: { pg: 5, cpu: 10, cap: 4 },
    stats: {
      activation_time: 10.0,
      speed_multiplier: 2.35
    }
  },

  mn1_afterburner_ii: {
    id: 'mn1_afterburner_ii',
    name: '1MN Afterburner II',
    type: 'propulsion',
    slot: 'mid',
    tier: 'T2',
    price: 21000,
    requiredSkills: { high_speed_maneuvering: 4 },
    description: 'Tech II afterburner. Higher top speed and lower capacitor draw than any T1/Meta variant. Loot-only.',
    cost: { pg: 5, cpu: 12, cap: 4 },
    stats: {
      activation_time: 10.0,
      speed_multiplier: 2.55
    }
  },

  // --- ELECTRONIC WARFARE (Mid Slots) ---
  stasis_webifier_i: {
    id: 'stasis_webifier_i',
    name: 'Stasis Webifier I',
    type: 'ewar',
    slot: 'mid',
    tier: 'T1',
    price: 5000,
    description: 'Slows down the target ship.',
    cost: { pg: 1, cpu: 25, cap: 10 },
    stats: {
      activation_time: 5.0,
      optimal: 10000,
      speed_reduction_pct: 50
    }
  },
  fleeting_compact_stasis_webifier: {
    id: 'fleeting_compact_stasis_webifier',
    name: 'Fleeting Compact Stasis Webifier',
    type: 'ewar',
    slot: 'mid',
    tier: 'Meta',
    price: 8000,
    description: 'Improved stasis field generator with a stronger velocity dampening effect.',
    cost: { pg: 1, cpu: 32, cap: 10 },
    stats: {
      activation_time: 5.0,
      optimal: 10000,
      speed_reduction_pct: 60
    }
  },

  stasis_webifier_ii: {
    id: 'stasis_webifier_ii',
    name: 'Stasis Webifier II',
    type: 'ewar',
    slot: 'mid',
    tier: 'T2',
    price: 18000,
    requiredSkills: { electronic_warfare: 4 },
    description: 'Tech II stasis webifier. Stronger velocity dampening than any T1/Meta variant. Loot-only.',
    cost: { pg: 1, cpu: 32, cap: 10 },
    stats: {
      activation_time: 5.0,
      optimal: 10000,
      speed_reduction_pct: 65
    }
  },

  // --- PASSIVE MODULES (Low / Mid Slots) ---
  // Passive modules never activate: no rof/activation_time, no capacitor cost.
  // They contribute `modifiers` to getEffectiveStats() (src/lib/shipStats.js)
  // and are filtered out of BattleScene's active module rack entirely.
  small_armor_plate_i: {
    id: 'small_armor_plate_i',
    name: 'Small Armor Plate I',
    type: 'armor_plate',
    slot: 'low',
    tier: 'T1',
    price: 5000,
    passive: true,
    description: 'Bolts on extra armor plating. Adds mass, slowing your turn rate.',
    cost: { pg: 6, cpu: 4, cap: 0 },
    modifiers: [
      { stat: 'defense.armor.hp', op: 'add', value: 150 },
      { stat: 'mobility.agility', op: 'add', value: 0.3 }
    ]
  },
  damage_control_i: {
    id: 'damage_control_i',
    name: 'Damage Control I',
    type: 'damage_control',
    slot: 'low',
    tier: 'T1',
    price: 9000,
    passive: true,
    maxPerShip: 1,
    description: 'Reinforces all three defense layers. Only one can be fitted per ship.',
    cost: { pg: 1, cpu: 20, cap: 0 },
    modifiers: [
      { stat: 'defense.shield.resists', op: 'add', value: 8 },
      { stat: 'defense.armor.resists', op: 'add', value: 8 },
      { stat: 'defense.hull.resists', op: 'add', value: 40 }
    ]
  },
  energized_adaptive_nano_membrane_i: {
    id: 'energized_adaptive_nano_membrane_i',
    name: 'Energized Adaptive Nano Membrane I',
    type: 'armor_resist',
    slot: 'low',
    tier: 'T1',
    price: 10000,
    passive: true,
    description: 'Hardens armor plating against all damage types evenly.',
    cost: { pg: 2, cpu: 18, cap: 0 },
    modifiers: [
      { stat: 'defense.armor.resists', op: 'add', value: 12 }
    ]
  },
  magnetic_field_stabilizer_i: {
    id: 'magnetic_field_stabilizer_i',
    name: 'Magnetic Field Stabilizer I',
    type: 'damage_amp',
    slot: 'low',
    tier: 'T1',
    price: 9000,
    passive: true,
    description: 'Tunes hybrid turret capacitors for higher damage output.',
    cost: { pg: 4, cpu: 16, cap: 0 },
    modifiers: [
      { stat: 'damage.hybrid_weapon', op: 'mult', value: 1.10 }
    ]
  },
  magnetic_field_stabilizer_ii: {
    id: 'magnetic_field_stabilizer_ii',
    name: 'Magnetic Field Stabilizer II',
    type: 'damage_amp',
    slot: 'low',
    tier: 'T2',
    price: 28000,
    passive: true,
    requiredSkills: { small_hybrid_turret: 5 },
    description: 'Tech II hybrid damage amplifier. Loot-only.',
    cost: { pg: 5, cpu: 19, cap: 0 },
    modifiers: [
      { stat: 'damage.hybrid_weapon', op: 'mult', value: 1.13 }
    ]
  },
  ballistic_control_system_i: {
    id: 'ballistic_control_system_i',
    name: 'Ballistic Control System I',
    type: 'damage_amp',
    slot: 'low',
    tier: 'T1',
    price: 9000,
    passive: true,
    description: 'Improves missile guidance computers and warhead yield.',
    cost: { pg: 3, cpu: 20, cap: 0 },
    modifiers: [
      { stat: 'damage.missile_weapon', op: 'mult', value: 1.10 }
    ]
  },
  ballistic_control_system_ii: {
    id: 'ballistic_control_system_ii',
    name: 'Ballistic Control System II',
    type: 'damage_amp',
    slot: 'low',
    tier: 'T2',
    price: 28000,
    passive: true,
    requiredSkills: { missiles: 5 },
    description: 'Advanced missile guidance and warhead systems. Stronger than the T1 variant. Loot-only.',
    cost: { pg: 4, cpu: 24, cap: 0 },
    modifiers: [
      { stat: 'damage.missile_weapon', op: 'mult', value: 1.13 }
    ]
  },
  overdrive_injector_system_i: {
    id: 'overdrive_injector_system_i',
    name: 'Overdrive Injector System I',
    type: 'speed_mod',
    slot: 'low',
    tier: 'T1',
    price: 7000,
    passive: true,
    description: 'Boosts engine output at the cost of fitting room.',
    cost: { pg: 2, cpu: 8, cap: 0 },
    modifiers: [
      { stat: 'mobility.base_speed', op: 'mult', value: 1.10 }
    ]
  },
  nanofiber_internal_structure_i: {
    id: 'nanofiber_internal_structure_i',
    name: 'Nanofiber Internal Structure I',
    type: 'speed_mod',
    slot: 'low',
    tier: 'T1',
    price: 7000,
    passive: true,
    description: 'Lightens the hull for speed and agility, at the cost of structural integrity.',
    cost: { pg: 2, cpu: 8, cap: 0 },
    modifiers: [
      { stat: 'mobility.base_speed', op: 'mult', value: 1.05 },
      { stat: 'mobility.agility', op: 'mult', value: 0.85 },
      { stat: 'defense.hull.hp', op: 'mult', value: 0.90 }
    ]
  },
  small_shield_extender_i: {
    id: 'small_shield_extender_i',
    name: 'Small Shield Extender I',
    type: 'shield_extender',
    slot: 'mid',
    tier: 'T1',
    price: 7500,
    passive: true,
    description: 'Adds shield capacitor plating. Bulkier shields are easier for enemy turrets to track.',
    cost: { pg: 7, cpu: 15, cap: 0 },
    modifiers: [
      { stat: 'defense.shield.hp', op: 'add', value: 150 },
      { stat: 'defense.sig_radius', op: 'add', value: 8 }
    ]
  },
  co_processor_i: {
    id: 'co_processor_i',
    name: 'Co-Processor I',
    type: 'cpu_upgrade',
    slot: 'low',
    tier: 'T1',
    price: 8000,
    passive: true,
    description: 'Upgrades the ship computer, expanding CPU capacity.',
    cost: { pg: 1, cpu: 0, cap: 0 },
    modifiers: [
      { stat: 'resources.cpu', op: 'mult', value: 1.10 }
    ]
  }
};
