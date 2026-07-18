import * as THREE from 'three';

// Shared combat math, used by both sides of the sim in BattleScene.
// All functions are pure; distances are in meters unless noted.

const UP = new THREE.Vector3(0, 1, 0);

export function getCapacitorRecharge(current, max, rechargeTime, dt) {
  const ratio = Math.max(0.01, Math.min(0.99, current / max));
  const rate = 10 * (max / rechargeTime) * (Math.sqrt(ratio) - ratio);
  return rate * dt;
}

// EVE Turret Hit Chance Formula (Simplified for 2.5D)
// angularVel is in rad/s at real scale (km/s over km), so the 40000 signature
// factor matches EVE's tuning: ~0.4 rad/s vs a frigate is a coin flip.
export function calculateHitChance(distance, optimal, falloff, tracking, targetSig, angularVel) {
  const distPenalty = Math.max(0, distance - optimal) / Math.max(1, falloff);
  const trackPenalty = (angularVel * 40000) / (tracking * targetSig);
  const exponent = Math.pow(distPenalty, 2) + Math.pow(trackPenalty, 2);
  return Math.pow(0.5, exponent);
}

// One turret shot: returns null on a miss, otherwise the damage multiplier
// for the volley. The single roll doubles as the quality roll so that the
// best 1% of hits are wrecking shots at 3x — same semantics for both sides.
export function rollTurretShot(distance, stats, targetSig, angularVel, rng = Math.random) {
  const chance = calculateHitChance(distance, stats.optimal, stats.falloff, stats.tracking, targetSig, angularVel);
  const roll = rng();
  if (roll >= chance) return null;
  return roll < 0.01 ? 3.0 : 0.5 + rng() * 0.5;
}

// EVE-simplified missile damage factor (FR-1, v0.10): min(1, (sig/expR) *
// min(1, expV/v)^drf). The drf exponent applies only to the velocity ratio,
// so MWD's equal sig_multiplier/speed_multiplier bloom nets out in the
// player's favor (the sig term uncaps while the velocity term stays capped
// at 1) — bloom restores full damage rather than the raw formula's
// self-cancelling product. Returns 1 (full damage) for a stationary or
// large-signature target, and when explosion fields are missing (back-compat
// for any weapon that never got them).
export const MISSILE_DRF = 0.5;

export function missileDamageFactor(targetSig, targetSpeed, explosionRadius, explosionVelocity, drf = MISSILE_DRF) {
  if (!explosionRadius || !explosionVelocity) return 1;
  const sigRatio = targetSig / explosionRadius;
  const velTerm = Math.pow(Math.min(1, explosionVelocity / Math.max(targetSpeed, 1)), drf);
  return Math.min(1, sigRatio * velTerm);
}

// NPC capacitor activation floor (FR-2, v0.10): weapons/ewar with a nonzero
// cap_use fire only above max(cap_use, 10% of capacity) — a hysteresis band
// standing in for a player's ability to manually re-toggle a module. Below
// the floor the NPC is fully suppressed; missiles (cap_use 0) never call this.
export const NPC_CAP_FLOOR_RATIO = 0.10;

export function npcActivationFloor(capCapacity, capUse) {
  return Math.max(capUse || 0, capCapacity * NPC_CAP_FLOOR_RATIO);
}

// Damage lands on the outermost intact layer, reduced by that layer's
// resists. Bleed-through (FR-4, v0.10): if a volley breaks the layer, the
// leftover share (by fraction of the volley the layer couldn't absorb)
// carries into the next layer at THAT layer's own resists — capped at one
// layer per volley (current alpha strikes never break two in one hit).
// Return shape stays { layer, dmg }: layer = the first layer hit, dmg = the
// cross-layer total. A volley that doesn't break a layer behaves identically
// to the pre-v0.10 implementation.
export function applyDamage(hp, defense, damageByType, mult = 1) {
  const layer = hp.shield > 0 ? 'shield' : hp.armor > 0 ? 'armor' : 'hull';
  const resists = defense[layer];
  let dmg = 0;
  for (const [type, raw] of Object.entries(damageByType)) {
    dmg += raw * mult * (1 - (resists[type] || 0) / 100);
  }

  const before = hp[layer];
  const appliedToLayer = Math.min(dmg, before); // damage actually absorbed by this layer's HP pool
  hp[layer] = Math.max(0, before - dmg);
  let total = appliedToLayer;

  if (dmg > before && layer !== 'hull') {
    const nextLayer = layer === 'shield' ? 'armor' : 'hull';
    if (hp[nextLayer] > 0) {
      const frac = 1 - before / dmg; // share of the volley the broken layer couldn't absorb
      const nextResists = defense[nextLayer];
      let overflowDmg = 0;
      for (const [type, raw] of Object.entries(damageByType)) {
        overflowDmg += raw * mult * frac * (1 - (nextResists[type] || 0) / 100);
      }
      hp[nextLayer] = Math.max(0, hp[nextLayer] - overflowDmg);
      total += overflowDmg;
    }
  }

  return { layer, dmg: total };
}

// Direction a ship should push toward to satisfy a movement command.
// Distances here are in world units (km).
export function desiredVelocity(command, dirToTarget, dist, maxSpeed) {
  if (command.type === 'approach') {
    if (dist > 0.2) return dirToTarget.clone().multiplyScalar(maxSpeed);
  } else if (command.type === 'keepAtRange') {
    if (dist > command.radius + 0.1) return dirToTarget.clone().multiplyScalar(maxSpeed);
    if (dist < command.radius - 0.1) return dirToTarget.clone().multiplyScalar(-maxSpeed);
  } else if (command.type === 'orbit') {
    let theta;
    if (dist >= command.radius) theta = Math.asin(command.radius / dist);
    else theta = Math.PI / 2 + Math.acos(dist / command.radius);
    return dirToTarget.clone().applyAxisAngle(UP, theta).normalize().multiplyScalar(maxSpeed);
  }
  return new THREE.Vector3(); // 'stop'
}

// Velocity eases toward the commanded vector; agility is the time constant
// (seconds to reach ~63% of the change), standing in for EVE's mass/inertia.
export function applyInertia(vel, desired, dt, agility) {
  const blend = 1 - Math.exp(-dt / Math.max(0.1, agility));
  vel.lerp(desired, blend);
}

// Segment HP persistence (v0.9): null snapshot = fresh full-health entry;
// an existing snapshot is clamped to the current effective max as a
// defensive measure (the segment's max HP is otherwise constant, so this
// only guards hand-built/corrupt input, not normal play).
export function resumeHp(snapshot, defense) {
  if (!snapshot) {
    return { shield: defense.shield.hp, armor: defense.armor.hp, hull: defense.hull.hp };
  }
  return {
    shield: Math.min(snapshot.shield, defense.shield.hp),
    armor: Math.min(snapshot.armor, defense.armor.hp),
    hull: Math.min(snapshot.hull, defense.hull.hp)
  };
}
