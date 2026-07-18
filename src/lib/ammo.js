// Ammo correction + readiness helpers (v0.11).
//
// Deliberately not in combat.js: combat.js imports three.js, while this file
// is also needed by gameStore (migrate/fitModule default assignment), App
// (UNDOCK readiness warning) and FittingWindow (compatible-ammo lists) — none
// of which should pull three.js into their dependency graph. Pure, rng-free,
// same testing convention as the rest of src/lib.

import { AMMO, DEFAULT_AMMO } from '../data/ammo';

// Applied at fire time, downstream of getEffectiveStats — ammo never enters
// the passive-modifier pipeline, so it structurally never touches the v0.10
// module-mult stacking penalty or damageMult. null/unknown ammo is the
// identity transform; the fire gate (BattleScene) is what actually blocks
// firing with no ammo assigned, not this function.
export function applyAmmoToWeapon(weaponStats, ammo) {
  if (!ammo) return weaponStats;
  if (ammo.charge) {
    return {
      ...weaponStats,
      optimal: weaponStats.optimal * ammo.charge.optimal_mult,
      damage: Object.fromEntries(
        Object.entries(weaponStats.damage).map(([type, val]) => [type, val * ammo.charge.damage_mult])
      )
    };
  }
  if (ammo.warhead) {
    const total = Object.values(weaponStats.damage).reduce((a, b) => a + b, 0);
    return {
      ...weaponStats,
      damage: { em: 0, th: 0, kin: 0, exp: 0, [ammo.warhead.damage_type]: total },
      explosion_radius: ammo.warhead.explosion_radius,
      explosion_velocity: ammo.warhead.explosion_velocity
    };
  }
  return weaponStats;
}

// Ammo compatible with a weapon module, by ammoFamily — the FittingWindow
// selector's and BattleScene's reload-select's sole data source.
export function compatibleAmmo(weaponModule) {
  if (!weaponModule?.ammoFamily) return [];
  return Object.values(AMMO).filter((a) => a.family === weaponModule.ammoFamily);
}

// fitModule/migrate/merge all auto-assign this on a weapon so "forgot to load
// ammo" requires deliberately unassigning it afterward, not simply fitting.
export function defaultAmmoIdFor(module) {
  return DEFAULT_AMMO[module?.ammoFamily] ?? null;
}

// UNDOCK warning + FittingWindow red-text share this: which fitted weapons
// have no ammo assigned, and which have an assignment but an empty stack.
export function ammoReadiness(activeShip, cargo) {
  const high = activeShip?.fittedModules?.high ?? [];
  const ammoIds = activeShip?.ammo ?? [];
  const weapons = high
    .map((module, highIndex) => ({ highIndex, module, ammoId: ammoIds[highIndex] ?? null }))
    .filter((w) => w.module?.ammoFamily);

  const unassigned = weapons.filter((w) => !w.ammoId).length;
  const dry = weapons.filter((w) => w.ammoId && !(cargo?.[w.ammoId] > 0)).length;

  return { weapons, unassigned, dry };
}
