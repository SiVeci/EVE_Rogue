// Ammunition Definitions (v0.11)
//
// Ammo is a stacked cargo commodity (see gameStore's `cargo: { [ammoId]: qty }`),
// not a module — it never enters inventory/fittedModules and carries no `cost`
// (pg/cpu) or `modifiers`. Two families of correction:
//   - `charge` (hybrid turret ammo): multiplies the weapon's damage/optimal.
//     Falloff/tracking/rof/cap use are never touched.
//   - `warhead` (missile ammo): replaces the weapon's damage object with a
//     single type at the SAME total, and carries explosion_radius/velocity
//     (the v0.10 missileDamageFactor's parameter source).
// See src/lib/ammo.js for how these apply at fire time.

export const AMMO = {
  // --- HYBRID CHARGES (family hybrid_s) ---
  antimatter_charge_s: {
    id: 'antimatter_charge_s',
    name: 'Antimatter Charge S',
    family: 'hybrid_s',
    tier: 'T1',
    price: 60,
    charge: { damage_mult: 1.2, optimal_mult: 0.6 }
  },
  lead_charge_s: {
    id: 'lead_charge_s',
    name: 'Lead Charge S',
    family: 'hybrid_s',
    tier: 'T1',
    price: 35,
    charge: { damage_mult: 1.0, optimal_mult: 1.0 }
  },
  iridium_charge_s: {
    id: 'iridium_charge_s',
    name: 'Iridium Charge S',
    family: 'hybrid_s',
    tier: 'T1',
    price: 45,
    charge: { damage_mult: 0.85, optimal_mult: 1.6 }
  },

  // --- ROCKET WARHEADS (family rocket_s) ---
  mjolnir_rocket: {
    id: 'mjolnir_rocket',
    name: 'Mjolnir Rocket',
    family: 'rocket_s',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'em', explosion_radius: 20, explosion_velocity: 150 }
  },
  inferno_rocket: {
    id: 'inferno_rocket',
    name: 'Inferno Rocket',
    family: 'rocket_s',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'th', explosion_radius: 20, explosion_velocity: 150 }
  },
  scourge_rocket: {
    id: 'scourge_rocket',
    name: 'Scourge Rocket',
    family: 'rocket_s',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'kin', explosion_radius: 20, explosion_velocity: 150 }
  },
  nova_rocket: {
    id: 'nova_rocket',
    name: 'Nova Rocket',
    family: 'rocket_s',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'exp', explosion_radius: 20, explosion_velocity: 150 }
  },

  // --- LIGHT MISSILE WARHEADS (family light_missile) ---
  mjolnir_light_missile: {
    id: 'mjolnir_light_missile',
    name: 'Mjolnir Light Missile',
    family: 'light_missile',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'em', explosion_radius: 40, explosion_velocity: 170 }
  },
  inferno_light_missile: {
    id: 'inferno_light_missile',
    name: 'Inferno Light Missile',
    family: 'light_missile',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'th', explosion_radius: 40, explosion_velocity: 170 }
  },
  scourge_light_missile: {
    id: 'scourge_light_missile',
    name: 'Scourge Light Missile',
    family: 'light_missile',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'kin', explosion_radius: 40, explosion_velocity: 170 }
  },
  nova_light_missile: {
    id: 'nova_light_missile',
    name: 'Nova Light Missile',
    family: 'light_missile',
    tier: 'T1',
    price: 35,
    warhead: { damage_type: 'exp', explosion_radius: 40, explosion_velocity: 170 }
  }
};

// Market/loot lot size: ammo trades in batches of 100 rounds.
export const AMMO_LOT = 100;

// fitModule auto-assigns this family default so a freshly-fitted weapon is
// never left unassigned (FR-6's "forgetting is made hard").
export const DEFAULT_AMMO = {
  hybrid_s: 'lead_charge_s',
  rocket_s: 'scourge_rocket',
  light_missile: 'scourge_light_missile'
};

// New-save AND v2->v3 migration starter gift (FR-6): 21,000 ISK of rounds,
// ~7-8 fights for a 3-turret fit.
export const STARTER_CARGO = {
  lead_charge_s: 300,
  scourge_rocket: 150,
  scourge_light_missile: 150
};

// Free-Incursus soft-lock clause extension: whenever that grant fires, cargo
// is topped up to at least this many rounds of each family default.
export const AMMO_SAFETY_QTY = 100;
