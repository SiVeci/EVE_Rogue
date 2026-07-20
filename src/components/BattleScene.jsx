import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { rollEncounter } from '../data/npcs';
import { getCapacitorRecharge, rollTurretShot, applyDamage, desiredVelocity, applyInertia, resumeHp, missileDamageFactor, npcActivationFloor } from '../lib/combat';
import { getEffectiveStats, activeModules } from '../lib/shipStats';
import { rollLoot } from '../lib/loot';
import { MODULES } from '../data/modules';
import { AMMO } from '../data/ammo';
import { DRONES } from '../data/drones';
import { applyAmmoToWeapon, compatibleAmmo } from '../lib/ammo';
import { maxDronesInSpace } from '../lib/drones';
import { TIER_COLORS } from '../lib/tiers';
import * as THREE from 'three';

// Units: 1 world unit = 1 km. Data files use EVE units (meters, m/s),
// so speeds convert via /1000 and distances via *1000 for weapon math.
const UP = new THREE.Vector3(0, 1, 0);
const PLAYER_SPAWN = [-2, 0, 0];
const ENEMY_SPAWN = [2, 0, 0];
const MAX_DT = 0.1; // clamp frame delta so tab switches don't teleport ships
const ALIGN_TIME = 8.0; // seconds to align & warp out (FR-4 retreat)
const RELOAD_TIME = 10.0; // seconds to switch ammo mid-battle (v0.11 FR-4)

// Drones (v0.12, docs/balance.md "Drones"). Enemy fire-switching: every
// DRONE_AGGRO_PERIOD, a DRONE_AGGRO_CHANCE roll redirects enemy fire to one
// random in-space drone for DRONE_AGGRO_DURATION (or until it dies/docks).
// DRONE_DOCK_RANGE is the return-to-bay proximity gate; DRONE_ENGAGE_RANGE
// is where a drone switches from approach (transit speed) to orbit (engage
// speed) behavior around its target.
const DRONE_AGGRO_PERIOD = 6.0;
const DRONE_AGGRO_CHANCE = 0.25;
const DRONE_AGGRO_DURATION = 10.0;
const DRONE_DOCK_RANGE = 0.3; // km
const DRONE_ENGAGE_RANGE = 1.5; // km

// Drone damage type -> HUD color, resolved from `weapon.damage` rather than
// id so Meta/T2 variants (v0.12 FR-6) get a color for free.
function droneColor(def) {
  const dmg = def.weapon.damage;
  if (dmg.th) return '#ff9a4a';
  if (dmg.kin) return '#c9c9c9';
  if (dmg.exp) return '#8be04a';
  if (dmg.em) return '#4deeea';
  return '#8ee7ff';
}

function formatDistance(km) {
  return km < 10 ? `${Math.round(km * 1000).toLocaleString()} m` : `${km.toFixed(1)} km`;
}

function ShipMesh({ positionRef, rotationRef, color, isPlayer }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = positionRef.current.x;
      meshRef.current.position.z = positionRef.current.z;
      const currentRot = meshRef.current.rotation.y;
      const targetRot = rotationRef.current;
      let shortest = Math.atan2(Math.sin(targetRot - currentRot), Math.cos(targetRot - currentRot));
      meshRef.current.rotation.y += shortest * 0.1;
    }
  });

  return (
    <group ref={meshRef} scale={0.25}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={isPlayer ? [2, 1, 4] : [3, 1.5, 5]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 0.5]}>
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial color={isPlayer ? '#4deeea' : '#ff4a4a'} emissive={isPlayer ? '#4deeea' : '#ff4a4a'} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0, -2.1]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={isPlayer ? '#4287f5' : '#ff8a4a'} />
      </mesh>
    </group>
  );
}

// Small octahedron, mirrors ShipMesh's positionRef-driven pattern at a
// much smaller scale — drones don't rotate to face a heading (no rotationRef).
function DroneMesh({ positionRef, color }) {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = positionRef.current.x;
      meshRef.current.position.z = positionRef.current.z;
    }
  });

  return (
    <group ref={meshRef} scale={0.1}>
      <mesh>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.4} metalness={0.6} />
      </mesh>
    </group>
  );
}

// Module-level component so it never remounts when BattleScene re-renders for
// HUD updates; the fresh sim closure is delivered through stepRef instead.
function PhysicsUpdater({ stepRef }) {
  useFrame(() => stepRef.current());
  return null;
}

function HudBar({ label, value, max, color }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color, fontSize: '0.8rem' }}>
        <span>{label}</span> <span>{Math.max(0, Math.floor(value))} / {max}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '2px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function BattleScene({ encounter, nodeType = 'patrol', depth, initialHp, introLog, isFinalNode = false, onVictory, onRetreat, onDefeat }) {
  const { activeShip, skills, deadspaceDepth, cargo, addIsk, addSp, addLoot, shipDestroyed, settleBattleAmmo, settleBattleDrones } = useGameStore();

  // depth is the node's own depth (segment start + layer index); the store's
  // deadspaceDepth is only a fallback for direct entry with no map/node context.
  const effDepth = depth ?? deadspaceDepth;

  // Encounters are pre-generated on the map (what you scan is what you fight);
  // the roll here is only a fallback for direct entry.
  const enemy = useMemo(
    () => encounter ?? rollEncounter(effDepth, nodeType),
    [encounter, effDepth, nodeType]
  );

  // Single source of truth for stats: base hull + passive modifiers + skills.
  // Same function FittingWindow and gameStore.fitModule use.
  const eff = useMemo(
    () => getEffectiveStats(activeShip, activeShip.fittedModules, skills),
    [activeShip, skills]
  );

  // HP persists across nodes within a segment (v0.9): a null initialHp means
  // a fresh full-health entry; a snapshot resumes at its (clamped) value.
  // Capacitor is never part of the snapshot — it refills every fight (FR-3).
  const resumedHp = resumeHp(initialHp, eff.defense);

  // Local React State for UI (synced periodically from the sim refs)
  const [playerHud, setPlayerHud] = useState({
    shield: resumedHp.shield,
    armor: resumedHp.armor,
    hull: resumedHp.hull,
    cap: eff.resources.cap_capacity
  });
  const [enemyHud, setEnemyHud] = useState({
    shield: enemy.defense.shield.hp,
    armor: enemy.defense.armor.hp,
    hull: enemy.defense.hull.hp,
    cap: enemy.cap_capacity ?? null
  });
  const [distance, setDistance] = useState(4);
  const [speed, setSpeed] = useState(0); // m/s
  const [command, setCommand] = useState({ type: 'stop', radius: 0 });
  const [combatLog, setCombatLog] = useState([introLog || "Gate activation complete. Hostile on scan."]);
  const [outcome, setOutcome] = useState(null); // null | 'victory' | 'defeat' | 'retreat'
  const [lootIds, setLootIds] = useState([]); // mixed: module id strings and { ammoId, qty } (v0.11)
  const [alignHud, setAlignHud] = useState(null); // null | seconds remaining (ALIGN & WARP)
  // Per-weapon ammo HUD (v0.11), keyed by modulesStateRef index, synced at the
  // same 0.15s cadence as the rest of the HUD (see syncHud) — not derived
  // every render, since the pool/reload live in refs mutated every frame.
  const [ammoHud, setAmmoHud] = useState({});
  // Snapshot of ammoUsedRef taken at battle-end, for the victory/retreat
  // modals' "Expended: ..." line (ammoUsedRef itself keeps accumulating
  // nothing further once battleOverRef freezes the sim, but a snapshot
  // avoids relying on ref reads inside JSX).
  const [consumedSnapshot, setConsumedSnapshot] = useState({});
  // Squadron HUD (v0.12), synced at the same 0.15s cadence as the rest of
  // the HUD (see syncHud) plus explicitly on launch/recall/dock/kill for
  // instant feedback. All drones start in the bay, so the initial value is
  // derived straight from the manifest rather than dronesRef (declared
  // later in the component body).
  const [droneHud, setDroneHud] = useState(() => ({
    inSpace: 0,
    maxInSpace: maxDronesInSpace(activeShip, skills),
    chips: (activeShip.drones || []).filter((id) => DRONES[id]).map((id) => ({
      name: DRONES[id].name, alive: true, state: 'bay', hpPct: 100, locked: false
    }))
  }));
  const [, setForceRender] = useState(0);

  // Physics Refs — all simulation state lives here and is mutated every frame
  const playerPos = useRef(new THREE.Vector3(...PLAYER_SPAWN));
  const enemyPos = useRef(new THREE.Vector3(...ENEMY_SPAWN));
  const playerVel = useRef(new THREE.Vector3());
  const enemyVel = useRef(new THREE.Vector3());
  const playerRot = useRef(Math.PI / 2);  // spawns facing each other along +x / -x
  const enemyRot = useRef(-Math.PI / 2);
  const capRef = useRef(eff.resources.cap_capacity);
  const playerHp = useRef({
    shield: resumedHp.shield,
    armor: resumedHp.armor,
    hull: resumedHp.hull
  });
  const enemyHp = useRef({
    shield: enemy.defense.shield.hp,
    armor: enemy.defense.armor.hp,
    hull: enemy.defense.hull.hp
  });
  const enemyWeaponTimer = useRef(1.5); // grace period before the first volley
  // NPC capacitor (v0.10): mounts full every fight (same semantics as the
  // player's capRef, never part of the HP snapshot). Infinity is the
  // documented fallback for any NPC without cap fields — the suppression
  // check below is guarded so it never fires against an Infinity pool.
  const enemyCapRef = useRef(enemy.cap_capacity ?? Infinity);
  const enemyWeaponPoweredRef = useRef(true); // drives the powers-down/back-online log transitions
  const enemyEwarTimer = useRef(0); // enemy ewar activation cadence, mirrors the player module loop
  const enemyEwarPoweredRef = useRef(true);
  const angularVelocity = useRef(0);
  const battleOverRef = useRef(false);
  const alignRef = useRef(null); // null | seconds remaining until warp-out
  const commandRef = useRef({ type: 'stop', radius: 0 });
  const lastTime = useRef(performance.now());
  const hudAccumulator = useRef(0);

  // Module States Ref (tracks cooldowns and active status independently of React re-renders).
  // Passive modules are excluded: their effects are already baked into `eff`,
  // so they never enter the rack UI or the per-frame processing loop below.
  // High-slot entries are built with their index preserved (activeModules()
  // flattens high/mid/low and loses it) so weapons can carry an ammoId keyed
  // back to activeShip.ammo (v0.11) — mid/low modules never carry ammo and
  // don't need the index, so they're appended via the existing helper.
  const modulesStateRef = useRef([
    ...activeShip.fittedModules.high
      .map((m, highIndex) => ({ m, highIndex }))
      .filter(({ m }) => !m.passive)
      .map(({ m, highIndex }) => ({
        ...m,
        active: false,
        timer: 0,
        ...(m.ammoFamily ? { ammoId: activeShip.ammo?.[highIndex] ?? null, highIndex, reload: 0 } : {})
      })),
    ...activeModules({ high: [], mid: activeShip.fittedModules.mid, low: activeShip.fittedModules.low })
      .map(m => ({ ...m, active: false, timer: 0 }))
  ]);
  // Ammo cargo snapshot for this fight (FR-4: undocking carries the hangar's
  // entire cargo automatically) — a shared pool keyed by ammoId, so multiple
  // weapons of the same round type draw from (and can starve) one another.
  // ammoUsedRef accumulates the total fired per ammoId for the battle-end
  // settlement (settleBattleAmmo).
  const ammoPoolRef = useRef({ ...cargo });
  const ammoUsedRef = useRef({});

  // Drones (v0.12): rebuilt from the loadout manifest every fight, always
  // starting full HP and in the bay — the strategic drone resource is count
  // (Drones skill/hangar stock), not HP, so cross-node persistence is by
  // survival only (see docs/balance.md "Drones"). Unknown ids (shouldn't
  // occur — gameStore validates on write) are dropped defensively.
  const dronesRef = useRef(
    (activeShip.drones || []).filter((id) => DRONES[id]).map((droneId, i) => {
      const def = DRONES[droneId];
      return {
        droneId,
        def,
        hp: { shield: def.defense.shield.hp, armor: def.defense.armor.hp, hull: def.defense.hull.hp },
        pos: new THREE.Vector3(PLAYER_SPAWN[0] + (i % 5 - 2) * 0.08, 0, PLAYER_SPAWN[2] + 0.15),
        vel: new THREE.Vector3(),
        state: 'bay', // 'bay' | 'out' | 'returning'
        fireTimer: 0,
        alive: true
      };
    })
  );
  // Enemy fire-switching bookkeeping (v0.12) — a plain ref, mirrors alignRef:
  // droneIdx is the index into dronesRef.current currently being fired on
  // (null = targeting the player), timer counts down the aggro window,
  // checkTimer paces the next redirect roll while targeting the player.
  const enemyAggroRef = useRef({ droneIdx: null, timer: 0, checkTimer: DRONE_AGGRO_PERIOD });

  const addLog = (msg) => {
    setCombatLog(prev => [msg, ...prev].slice(0, 6));
  };

  const issueCommand = (cmd) => {
    if (battleOverRef.current) return;
    commandRef.current = cmd;
    setCommand(cmd);
  };

  const toggleModule = (index) => {
    if (battleOverRef.current) return;
    const mod = modulesStateRef.current[index];
    const isWeapon = mod.type === 'hybrid_weapon' || mod.type === 'missile_weapon';
    if (!mod.active && isWeapon && (!mod.ammoId || (ammoPoolRef.current[mod.ammoId] ?? 0) <= 0)) {
      addLog(`Cannot activate ${mod.name}: no ammunition assigned or loaded!`);
      return;
    }
    if (!mod.active && capRef.current < (mod.cost.cap || 0)) {
      addLog(`Not enough capacitor to activate ${mod.name}!`);
      return;
    }
    mod.active = !mod.active;
    if (mod.active) mod.timer = 0; // Trigger immediately
    setForceRender(Date.now());
  };

  // In-battle reload (v0.11 FR-4): switching ammo costs 10s, not ammo — the
  // weapon goes offline for RELOAD_TIME (ticked unconditionally at the top of
  // the frame loop, even while toggled off, so re-toggling can't zero it).
  const changeAmmo = (index, ammoId) => {
    if (battleOverRef.current) return;
    const mod = modulesStateRef.current[index];
    if (!ammoId || !AMMO[ammoId] || ammoId === mod.ammoId) return;
    mod.ammoId = ammoId;
    mod.reload = RELOAD_TIME;
    addLog(`[${mod.name}] Switching to ${AMMO[ammoId].name} — reloading...`);
    setForceRender(Date.now());
  };

  // Weapon ammo assignments at battle-end, keyed by highIndex — written back
  // to activeShip.ammo on victory/retreat so an in-battle reload carries into
  // the next node/session (not on defeat: the hull and its fit are gone).
  const buildAmmoAssignments = () => {
    const assignments = {};
    modulesStateRef.current.forEach((mod) => {
      if ((mod.type === 'hybrid_weapon' || mod.type === 'missile_weapon') && mod.highIndex != null) {
        assignments[mod.highIndex] = mod.ammoId;
      }
    });
    return assignments;
  };

  // ALIGN & WARP (FR-4): an 8s align that ends the battle as a third outcome
  // alongside victory/defeat. No safety valve — modules and enemy AI keep
  // running normally, so a web makes this lethal up close (intended).
  const startAlign = () => {
    if (battleOverRef.current || alignRef.current != null) return;
    alignRef.current = ALIGN_TIME;
    setAlignHud(ALIGN_TIME);
    addLog('Aligning for warp-out...');
  };

  const cancelAlign = () => {
    if (battleOverRef.current || alignRef.current == null) return;
    alignRef.current = null;
    setAlignHud(null);
    addLog('Align aborted.');
  };

  // Squadron HUD snapshot (v0.12) — dronesRef -> plain data for React state,
  // same shape reasoning as ammoHud's per-frame-mutated-ref -> throttled-
  // state pattern above.
  const computeDroneHud = () => ({
    inSpace: dronesRef.current.filter((d) => d.alive && d.state !== 'bay').length,
    maxInSpace: maxDronesInSpace(activeShip, skills),
    chips: dronesRef.current.map((d, i) => ({
      name: d.def.name,
      alive: d.alive,
      state: d.state,
      hpPct: d.alive
        ? Math.max(0, Math.round(((d.hp.shield + d.hp.armor + d.hp.hull) /
            (d.def.defense.shield.hp + d.def.defense.armor.hp + d.def.defense.hull.hp)) * 100))
        : 0,
      locked: enemyAggroRef.current.droneIdx === i
    }))
  });

  // LAUNCH / RECALL (v0.12 FR-3): independent command entry alongside
  // startAlign/cancelAlign — full-squadron instructions, no single-drone
  // micro (PRD non-goal). LAUNCH tops the in-space count up to the
  // bandwidth/skill cap, so mid-fight relaunch after a loss (or an initial
  // partial launch) fills only the open slots — Algos' bay-40 backup drones
  // are meaningful because of this top-up semantics, not a flat launch-all.
  const launchDrones = () => {
    if (battleOverRef.current) return;
    const maxOut = maxDronesInSpace(activeShip, skills);
    const currentOut = dronesRef.current.filter((d) => d.alive && d.state !== 'bay').length;
    const slots = maxOut - currentOut;
    if (slots <= 0) {
      addLog(maxOut === 0 ? 'No drones can be fielded — train the Drones skill.' : 'Squadron already at capacity.');
      return;
    }
    const bayDrones = dronesRef.current.filter((d) => d.alive && d.state === 'bay');
    if (bayDrones.length === 0) {
      addLog('No drones left in the bay.');
      return;
    }
    const launching = bayDrones.slice(0, slots);
    launching.forEach((drone) => {
      drone.state = 'out';
      drone.pos.copy(playerPos.current);
      drone.pos.x += (Math.random() - 0.5) * 0.3;
      drone.pos.z += (Math.random() - 0.5) * 0.3;
      drone.vel.set(0, 0, 0);
    });
    addLog(`Drones launched: ${launching.length}.`);
    setDroneHud(computeDroneHud());
    setForceRender(Date.now());
  };

  const recallDrones = () => {
    if (battleOverRef.current) return;
    const outDrones = dronesRef.current.filter((d) => d.alive && d.state === 'out');
    if (outDrones.length === 0) {
      addLog('No drones in space to recall.');
      return;
    }
    outDrones.forEach((d) => { d.state = 'returning'; });
    addLog('Drones recalled.');
    setDroneHud(computeDroneHud());
    setForceRender(Date.now());
  };

  const syncHud = (dist) => {
    setPlayerHud({
      shield: playerHp.current.shield,
      armor: playerHp.current.armor,
      hull: playerHp.current.hull,
      cap: Math.floor(capRef.current)
    });
    setEnemyHud({ ...enemyHp.current, cap: enemy.cap_capacity ? Math.floor(enemyCapRef.current) : null });
    setDistance(dist);
    setSpeed(playerVel.current.length() * 1000);
    setAlignHud(alignRef.current);

    // Per-weapon ammo badge/select state (v0.11) — same throttle as the rest
    // of the HUD, so the rack's remaining-count badge doesn't re-render every
    // frame even though the underlying pool/reload refs mutate every frame.
    const nextAmmoHud = {};
    modulesStateRef.current.forEach((mod, idx) => {
      if (mod.type === 'hybrid_weapon' || mod.type === 'missile_weapon') {
        nextAmmoHud[idx] = {
          ammoId: mod.ammoId,
          qty: mod.ammoId ? (ammoPoolRef.current[mod.ammoId] ?? 0) : 0,
          reload: mod.reload || 0
        };
      }
    });
    setAmmoHud(nextAmmoHud);
    setDroneHud(computeDroneHud());
  };

  const endBattle = (result) => {
    battleOverRef.current = true;
    modulesStateRef.current.forEach(m => { m.active = false; });
    playerVel.current.set(0, 0, 0);
    enemyVel.current.set(0, 0, 0);
    addLog(result === 'victory' ? 'Target destroyed!' : result === 'retreat' ? 'Align complete — warping out.' : 'Hull breach — your ship is lost!');
    // Rolled here (battle-result time), not on the button click, so
    // dismissing/reopening the modal can't re-roll the wreck.
    if (result === 'victory') setLootIds(rollLoot(enemy, effDepth, nodeType));
    setConsumedSnapshot({ ...ammoUsedRef.current });
    syncHud(playerPos.current.distanceTo(enemyPos.current));
    setOutcome(result);
  };

  // Reassigned every render so the sim always sees fresh closures; the
  // PhysicsUpdater component itself stays mounted across renders.
  const stepRef = useRef(() => {});
  stepRef.current = () => {
    const now = performance.now();
    const dt = Math.min((now - lastTime.current) / 1000, MAX_DT);
    lastTime.current = now;
    if (dt <= 0 || battleOverRef.current) return;

    // 1. Geometry: distance, bearing, relative angular velocity (real rad/s)
    const toEnemy = new THREE.Vector3().subVectors(enemyPos.current, playerPos.current);
    const dist = Math.max(0.001, toEnemy.length()); // km
    const dirToEnemy = toEnemy.clone().divideScalar(dist);
    const distMeters = dist * 1000;

    const relVel = new THREE.Vector3().subVectors(playerVel.current, enemyVel.current);
    const tangent = new THREE.Vector3().crossVectors(dirToEnemy, UP);
    angularVelocity.current = Math.abs(tangent.dot(relVel)) / Math.max(0.05, dist);

    // 2. Player modules
    let playerMaxSpeed = eff.mobility.base_speed / 1000; // u/s — navigation skill + passive mods already folded into eff
    let playerSigMult = 1; // MWD signature bloom makes the player easier to hit
    let enemyWebbed = false;

    modulesStateRef.current.forEach((mod) => {
      // Reload ticks unconditionally, even while toggled off (v0.11 FR-4) —
      // this is what stops the "reload, toggle off, toggle back on" exploit
      // from zeroing the countdown, since it's independent of mod.timer.
      if (mod.reload > 0) mod.reload = Math.max(0, mod.reload - dt);

      if (!mod.active) return;

      // Continuous effects of active modules
      if (mod.type === 'propulsion') {
        playerMaxSpeed *= mod.stats.speed_multiplier;
        playerSigMult *= mod.stats.sig_multiplier || 1;
      }
      if (mod.type === 'ewar' && distMeters <= mod.stats.optimal) enemyWebbed = true;

      if (mod.timer > 0) {
        mod.timer -= dt;
        return;
      }

      // Missiles hold their cycle (no cap, no log spam) until the target is in range
      if (mod.type === 'missile_weapon' && distMeters > mod.stats.range) {
        mod.timer = 0.5;
        return;
      }

      // Energy neutralizers hold the same way until the target is in range
      if (mod.type === 'energy_neut' && distMeters > mod.stats.optimal) {
        mod.timer = 0.5;
        return;
      }

      // Ammo gate (v0.11, weapons only): mirrors the capacitor auto-shutoff
      // below. Mid-reload retries in 0.5s without touching capacitor; an
      // empty or unassigned pool deactivates the weapon outright — FR-4's
      // "打空自动停火并在 HUD 提示" (out of ammo auto-stops fire with a HUD cue).
      if (mod.type === 'hybrid_weapon' || mod.type === 'missile_weapon') {
        if (mod.reload > 0) {
          mod.timer = 0.5;
          return;
        }
        if (!mod.ammoId || (ammoPoolRef.current[mod.ammoId] ?? 0) <= 0) {
          mod.active = false;
          addLog(`[${mod.name}] Out of ammunition!`);
          setForceRender(Date.now());
          return;
        }
      }

      if (capRef.current < (mod.cost.cap || 0)) {
        mod.active = false;
        addLog(`[${mod.name}] Deactivated: Capacitor depleted!`);
        setForceRender(Date.now());
        return;
      }
      capRef.current -= (mod.cost.cap || 0);
      mod.timer = mod.stats.rof || mod.stats.activation_time;

      if (mod.type === 'hybrid_weapon') {
        // Ammo modifiers apply at fire time, downstream of getEffectiveStats
        // (eff.damageMult) — see src/lib/ammo.js. One round per activation,
        // misses included; the pool is shared across weapons on the same ammo id.
        const fireStats = applyAmmoToWeapon(mod.stats, AMMO[mod.ammoId]);
        ammoPoolRef.current[mod.ammoId] = (ammoPoolRef.current[mod.ammoId] ?? 0) - 1;
        ammoUsedRef.current[mod.ammoId] = (ammoUsedRef.current[mod.ammoId] ?? 0) + 1;
        const quality = rollTurretShot(distMeters, fireStats, enemy.defense.sig_radius, angularVelocity.current);
        if (quality !== null) {
          const { dmg } = applyDamage(enemyHp.current, enemy.defense, fireStats.damage, quality * eff.damageMult.hybrid_weapon);
          addLog(`[${mod.name}] ${quality === 3.0 ? 'WRECKS' : 'hits'} for ${Math.floor(dmg)} dmg!`);
        } else {
          addLog(`[${mod.name}] Misses!`);
        }
      } else if (mod.type === 'missile_weapon') {
        // FR-1: enemy speed/signature (MWD has no analogue on NPCs) feed the
        // same missileDamageFactor the enemy's own missiles use against us.
        // The warhead (v0.11) supplies explosion_radius/velocity; range holds
        // above still read the launcher's own mod.stats.range unchanged.
        const fireStats = applyAmmoToWeapon(mod.stats, AMMO[mod.ammoId]);
        ammoPoolRef.current[mod.ammoId] = (ammoPoolRef.current[mod.ammoId] ?? 0) - 1;
        ammoUsedRef.current[mod.ammoId] = (ammoUsedRef.current[mod.ammoId] ?? 0) + 1;
        const factor = missileDamageFactor(enemy.defense.sig_radius, enemyVel.current.length() * 1000, fireStats.explosion_radius, fireStats.explosion_velocity);
        const { dmg } = applyDamage(enemyHp.current, enemy.defense, fireStats.damage, factor * eff.damageMult.missile_weapon);
        addLog(`[${mod.name}] Hits for ${Math.floor(dmg)} dmg!`);
      } else if (mod.type === 'shield_repair') {
        playerHp.current.shield = Math.min(eff.defense.shield.hp, playerHp.current.shield + mod.stats.shield_bonus);
      } else if (mod.type === 'armor_repair') {
        playerHp.current.armor = Math.min(eff.defense.armor.hp, playerHp.current.armor + mod.stats.armor_bonus);
      } else if (mod.type === 'energy_neut') {
        // FR-3: the one new module-type branch this version adds. Burns the
        // enemy's capacitor directly; suppression is read off the same
        // enemyCapRef by the enemy AI's activation-floor check below.
        enemyCapRef.current = Math.max(0, enemyCapRef.current - mod.stats.neut_amount);
        addLog(`[${mod.name}] drains ${mod.stats.neut_amount} GJ from ${enemy.name}'s capacitor!`);
      }
      // 'ewar' and 'propulsion' cycles only pay capacitor; effects applied above
    });

    // 2.5 Drones (v0.12): per-drone movement + autonomous fire. Inserted
    // here (after player modules, before the victory check) so a drone kill
    // that breaks the enemy's hull is captured by the SAME victory check
    // below, unmodified — no reordering of the existing six-stage loop.
    dronesRef.current.forEach((drone) => {
      if (!drone.alive || drone.state === 'bay') return;

      if (drone.state === 'returning') {
        const toPlayer = new THREE.Vector3().subVectors(playerPos.current, drone.pos);
        const pDist = toPlayer.length();
        if (pDist <= DRONE_DOCK_RANGE) {
          drone.state = 'bay';
          drone.vel.set(0, 0, 0);
          addLog(`${drone.def.name} docks in the bay.`);
          setForceRender(Date.now());
          return;
        }
        const desired = toPlayer.normalize().multiplyScalar(drone.def.speed / 1000);
        applyInertia(drone.vel, desired, dt, drone.def.agility);
        drone.pos.addScaledVector(drone.vel, dt);
        return;
      }

      // state === 'out': approach at transit speed until inside engage
      // range, then orbit at engage speed (the attack slowdown that makes a
      // drone hittable at all — docs/balance.md).
      const toEnemy = new THREE.Vector3().subVectors(enemyPos.current, drone.pos);
      const dDist = Math.max(0.001, toEnemy.length());
      const dDistMeters = dDist * 1000;
      const dirToEnemy = toEnemy.divideScalar(dDist);

      if (dDist > DRONE_ENGAGE_RANGE) {
        const desired = dirToEnemy.clone().multiplyScalar(drone.def.speed / 1000);
        applyInertia(drone.vel, desired, dt, drone.def.agility);
      } else {
        const desired = desiredVelocity({ type: 'orbit', radius: drone.def.orbit_range / 1000 }, dirToEnemy, dDist, drone.def.orbit_speed / 1000);
        applyInertia(drone.vel, desired, dt, drone.def.agility);
      }
      drone.pos.addScaledVector(drone.vel, dt);

      drone.fireTimer -= dt;
      if (drone.fireTimer > 0) return;

      if (dDistMeters > drone.def.weapon.optimal + 2 * drone.def.weapon.falloff) {
        drone.fireTimer = 0.5;
        return;
      }

      drone.fireTimer = drone.def.weapon.rof;
      // Same relative-angular-velocity formula as step 1, evaluated between
      // this drone and the enemy — the drone's own hit chance against a
      // target that (unlike drones) doesn't sit still.
      const relVel = new THREE.Vector3().subVectors(drone.vel, enemyVel.current);
      const tangent = new THREE.Vector3().crossVectors(dirToEnemy, UP);
      const droneAngVel = Math.abs(tangent.dot(relVel)) / Math.max(0.05, dDist);
      const quality = rollTurretShot(dDistMeters, drone.def.weapon, enemy.defense.sig_radius, droneAngVel);
      if (quality !== null) {
        // No gunnery/damage-amp multiplier (decision 8): drone damage is
        // panel-as-shot, growth is count and tier, not a percent pipeline.
        const { dmg } = applyDamage(enemyHp.current, enemy.defense, drone.def.weapon.damage, quality);
        addLog(`[${drone.def.name}] ${quality === 3.0 ? 'WRECKS' : 'hits'} for ${Math.floor(dmg)} dmg!`);
      } else {
        addLog(`[${drone.def.name}] misses!`);
      }
    });

    if (enemyHp.current.hull <= 0) {
      endBattle('victory');
      return;
    }

    // 3. Enemy AI: orbit the player at preferred range, fire when in range
    const enemyMaxSpeed = (enemy.mobility.base_speed / 1000) * (enemyWebbed ? 0.5 : 1);
    // MWD signature bloom makes the player both easier to hit and, since it
    // shares the same variable, the reference target for the enemy's own
    // missile factor (FR-1's "MWD bloom applies to missiles too").
    const effectiveSig = eff.defense.sig_radius * playerSigMult;

    // Enemy EWAR (v0.10): pays cap_use every activation_time cycle, gated by
    // the same activation floor as the weapon below. The web's effect is
    // still checked every frame by distance — only whether it's *powered*
    // depends on the cycle/cap check, mirroring the player's own web module.
    if (enemy.ewar) {
      enemyEwarTimer.current -= dt;
      if (enemyEwarTimer.current <= 0) {
        const ewarCapUse = enemy.ewar.cap_use || 0;
        const ewarSuppressed = ewarCapUse > 0 && enemy.cap_capacity != null &&
          enemyCapRef.current < npcActivationFloor(enemy.cap_capacity, ewarCapUse);
        if (ewarSuppressed) {
          if (enemyEwarPoweredRef.current) {
            enemyEwarPoweredRef.current = false;
            addLog(`${enemy.name}'s electronic warfare systems power down — capacitor drained!`);
          }
          enemyEwarTimer.current = 0.5;
        } else {
          if (!enemyEwarPoweredRef.current) {
            enemyEwarPoweredRef.current = true;
            addLog(`${enemy.name}'s electronic warfare systems back online.`);
          }
          enemyEwarTimer.current = enemy.ewar.activation_time || 5.0;
          enemyCapRef.current -= ewarCapUse;
        }
      }
      // Enemy EWAR: their web slows the player inside its envelope
      if (enemyEwarPoweredRef.current && distMeters <= enemy.ewar.optimal) {
        playerMaxSpeed *= 1 - enemy.ewar.speed_reduction_pct / 100;
      }
    }

    // Enemy fire switching (v0.12, target resolution only — the cap/
    // activation-floor gates below are untouched, this only decides WHICH
    // target a shot that clears them is rolled against). Bookkeeping runs
    // every frame regardless of the weapon's own cooldown.
    if (enemyAggroRef.current.droneIdx != null) {
      const target = dronesRef.current[enemyAggroRef.current.droneIdx];
      enemyAggroRef.current.timer -= dt;
      if (!target || !target.alive || target.state !== 'out' || enemyAggroRef.current.timer <= 0) {
        enemyAggroRef.current.droneIdx = null;
        enemyAggroRef.current.checkTimer = DRONE_AGGRO_PERIOD;
      }
    } else {
      enemyAggroRef.current.checkTimer -= dt;
      if (enemyAggroRef.current.checkTimer <= 0) {
        enemyAggroRef.current.checkTimer = DRONE_AGGRO_PERIOD;
        const outDrones = dronesRef.current.filter((d) => d.alive && d.state === 'out');
        if (outDrones.length > 0 && Math.random() < DRONE_AGGRO_CHANCE) {
          const pick = outDrones[Math.floor(Math.random() * outDrones.length)];
          enemyAggroRef.current.droneIdx = dronesRef.current.indexOf(pick);
          enemyAggroRef.current.timer = DRONE_AGGRO_DURATION;
          addLog(`${enemy.name} switches fire to ${pick.def.name}!`);
        }
      }
    }

    enemyWeaponTimer.current -= dt;
    if (enemyWeaponTimer.current <= 0) {
      const weapon = enemy.weapon;
      const capUse = weapon.stats.cap_use || 0;
      // Rocket/light-missile NPCs run cap_use 0 (cap-free on both sides, same
      // as the player's launchers) — they never enter this check, so a neut
      // build has no weapon-suppression effect against them (FR-2/FR-3).
      const weaponSuppressed = capUse > 0 && enemy.cap_capacity != null &&
        enemyCapRef.current < npcActivationFloor(enemy.cap_capacity, capUse);

      if (weaponSuppressed) {
        if (enemyWeaponPoweredRef.current) {
          enemyWeaponPoweredRef.current = false;
          addLog(`${enemy.name}'s weapon systems power down — capacitor drained!`);
        }
        enemyWeaponTimer.current = 0.5;
      } else {
        if (!enemyWeaponPoweredRef.current) {
          enemyWeaponPoweredRef.current = true;
          addLog(`${enemy.name}'s weapon systems back online.`);
        }

        // Target resolution (v0.12): a locked drone substitutes its own
        // distance/signature/velocity into the exact same formulas below —
        // no new hit-chance logic, turrets/missiles just aim at a smaller,
        // faster point in space. Defaults reproduce the pre-v0.12 player-
        // targeting values byte for byte when no drone is locked.
        const targetDrone = enemyAggroRef.current.droneIdx != null ? dronesRef.current[enemyAggroRef.current.droneIdx] : null;
        let tDistMeters = distMeters;
        let tSig = effectiveSig;
        let tAngVel = angularVelocity.current;
        let tSpeed = playerVel.current.length() * 1000;
        if (targetDrone) {
          const toTarget = new THREE.Vector3().subVectors(targetDrone.pos, enemyPos.current);
          const tDist = Math.max(0.001, toTarget.length());
          tDistMeters = tDist * 1000;
          tSig = targetDrone.def.sig_radius;
          const tDir = toTarget.divideScalar(tDist);
          const tRelVel = new THREE.Vector3().subVectors(targetDrone.vel, enemyVel.current);
          const tTangent = new THREE.Vector3().crossVectors(tDir, UP);
          tAngVel = Math.abs(tTangent.dot(tRelVel)) / Math.max(0.05, tDist);
          tSpeed = targetDrone.vel.length() * 1000;
        }

        const resolveDroneKill = () => {
          if (targetDrone.hp.hull <= 0) {
            targetDrone.alive = false;
            addLog(`${enemy.name} destroys ${targetDrone.def.name}!`);
            enemyAggroRef.current.droneIdx = null;
            enemyAggroRef.current.checkTimer = DRONE_AGGRO_PERIOD;
            setForceRender(Date.now());
          }
        };

        if (weapon.type === 'hybrid_weapon') {
          // Turrets share the player's hit formula, rolled against the
          // resolved target's own signature (MWD bloom makes the player
          // easier to hit; drones use their own fixed sig_radius).
          if (tDistMeters <= weapon.stats.optimal + 2 * weapon.stats.falloff) {
            enemyWeaponTimer.current = weapon.stats.rof;
            enemyCapRef.current -= capUse;
            const quality = rollTurretShot(tDistMeters, weapon.stats, tSig, tAngVel);
            if (quality !== null) {
              if (targetDrone) {
                const { dmg } = applyDamage(targetDrone.hp, targetDrone.def.defense, weapon.stats.damage, quality);
                addLog(`${enemy.name} ${quality === 3.0 ? 'WRECKS' : 'hits'} ${targetDrone.def.name} for ${Math.floor(dmg)}!`);
                resolveDroneKill();
              } else {
                const { dmg, layer } = applyDamage(playerHp.current, eff.defense, weapon.stats.damage, quality);
                addLog(`${enemy.name} ${quality === 3.0 ? 'WRECKS' : 'hits'} your ${layer} for ${Math.floor(dmg)}!`);
              }
            } else {
              addLog(`${enemy.name} misses!`);
            }
          } else {
            enemyWeaponTimer.current = 0.5;
          }
        } else if (tDistMeters <= weapon.stats.range) {
          // Missiles always hit inside their range; damage scaled by FR-1's
          // signature/speed factor (MWD bloom on effectiveSig restores it;
          // drones use their own fixed sig/speed, no bloom analogue).
          enemyWeaponTimer.current = weapon.stats.rof;
          enemyCapRef.current -= capUse;
          const factor = missileDamageFactor(tSig, tSpeed, weapon.stats.explosion_radius, weapon.stats.explosion_velocity);
          if (targetDrone) {
            const { dmg } = applyDamage(targetDrone.hp, targetDrone.def.defense, weapon.stats.damage, factor);
            addLog(`${enemy.name} hits ${targetDrone.def.name} for ${Math.floor(dmg)}!`);
            resolveDroneKill();
          } else {
            const { dmg, layer } = applyDamage(playerHp.current, eff.defense, weapon.stats.damage, factor);
            addLog(`${enemy.name} hits your ${layer} for ${Math.floor(dmg)}!`);
          }
        } else {
          enemyWeaponTimer.current = 0.5;
        }
      }
    }

    if (playerHp.current.hull <= 0) {
      endBattle('defeat');
      return;
    }

    // Retreat countdown: the only new simulation logic ALIGN & WARP adds.
    // Placed after both hull-zero checks above so a same-frame race resolves
    // in favor of victory/defeat (their early return already fired by now).
    if (alignRef.current != null) {
      alignRef.current -= dt;
      if (alignRef.current <= 0) {
        endBattle('retreat');
        return;
      }
    }

    // 4. Movement: velocity eases toward each command's desired vector (inertia)
    const desiredPlayer = desiredVelocity(commandRef.current, dirToEnemy, dist, playerMaxSpeed);
    applyInertia(playerVel.current, desiredPlayer, dt, eff.mobility.agility);
    playerPos.current.addScaledVector(playerVel.current, dt);

    const dirToPlayer = dirToEnemy.clone().negate();
    const desiredEnemy = desiredVelocity({ type: 'orbit', radius: enemy.ai.orbitRange }, dirToPlayer, dist, enemyMaxSpeed);
    applyInertia(enemyVel.current, desiredEnemy, dt, enemy.mobility.agility);
    enemyPos.current.addScaledVector(enemyVel.current, dt);

    if (playerVel.current.lengthSq() > 1e-6) playerRot.current = Math.atan2(playerVel.current.x, playerVel.current.z);
    if (enemyVel.current.lengthSq() > 1e-6) enemyRot.current = Math.atan2(enemyVel.current.x, enemyVel.current.z);

    // 5. Capacitor Recharge
    const capMax = eff.resources.cap_capacity;
    capRef.current = Math.min(capMax, capRef.current + getCapacitorRecharge(capRef.current, capMax, eff.resources.cap_recharge, dt));

    // Enemy capacitor (v0.10) — skipped entirely for the Infinity fallback
    // (an NPC without cap fields), same recharge curve as the player's.
    if (enemy.cap_capacity != null) {
      enemyCapRef.current = Math.min(
        enemy.cap_capacity,
        enemyCapRef.current + getCapacitorRecharge(enemyCapRef.current, enemy.cap_capacity, enemy.cap_recharge, dt)
      );
    }

    // 6. Sync UI a few times per second
    hudAccumulator.current += dt;
    if (hudAccumulator.current >= 0.15) {
      hudAccumulator.current = 0;
      syncHud(dist);
    }
  };

  // Drone losses for the victory/retreat modals (v0.12) — dronesRef is
  // frozen once battleOverRef flips true, so reading it directly at render
  // time (rather than snapshotting at endBattle) is safe, same reasoning as
  // reading ammoUsedRef.current directly in the settle calls below.
  const lostDroneCounts = dronesRef.current.reduce((acc, d) => {
    if (!d.alive) acc[d.droneId] = (acc[d.droneId] ?? 0) + 1;
    return acc;
  }, {});
  const lostDroneEntries = Object.entries(lostDroneCounts);
  const lostDroneIsk = lostDroneEntries.reduce((sum, [id, qty]) => sum + qty * (DRONES[id]?.price ?? 0), 0);

  const cmdStyle = (type, radius) => ({
    background: command.type === type && (radius === undefined || command.radius === radius)
      ? (type === 'stop' ? 'rgba(255,74,74,0.4)' : 'rgba(90,150,255,0.4)')
      : ''
  });

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <Canvas shadows camera={{ position: [0, 8, 8], fov: 45 }}>
        <PhysicsUpdater stepRef={stepRef} />
        <color attach="background" args={['#02040a']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <Grid position={[0, -1, 0]} args={[100, 100]} cellSize={1} cellColor="#1e283c" sectionSize={5} sectionColor="#2a3f5f" fadeDistance={60} />

        {outcome !== 'defeat' && <ShipMesh positionRef={playerPos} rotationRef={playerRot} color="#5a6b7c" isPlayer={true} />}
        {outcome !== 'victory' && <ShipMesh positionRef={enemyPos} rotationRef={enemyRot} color="#3a2b2c" isPlayer={false} />}
        {dronesRef.current.map((drone, i) => (
          drone.alive && drone.state !== 'bay'
            ? <DroneMesh key={i} positionRef={{ current: drone.pos }} color={droneColor(drone.def)} />
            : null
        ))}
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={40} />
      </Canvas>

      {/* VICTORY MODAL */}
      {outcome === 'victory' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(10,15,25,0.95)', border: '1px solid #2cd67c', padding: '3rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', boxShadow: '0 0 50px rgba(44, 214, 124, 0.2)' }}>
          <h2 style={{ color: '#2cd67c', fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>TARGET DESTROYED</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            The {enemy.name} breaks apart. Bounty: {enemy.reward.toLocaleString()} ISK · <span style={{ color: '#e8a838' }}>+{enemy.spReward.toLocaleString()} SP</span>
          </p>
          <div style={{ textAlign: 'left', minWidth: '260px', marginBottom: '1rem' }}>
            {lootIds.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>No salvageable modules.</p>
            ) : (
              lootIds.map((drop, i) => {
                if (typeof drop === 'string') {
                  const m = MODULES[drop];
                  return (
                    <p key={i} style={{ color: TIER_COLORS[m.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                      + {m.name} <span style={{ opacity: 0.7 }}>({m.tier})</span>
                    </p>
                  );
                }
                if (drop.droneId) {
                  const d = DRONES[drop.droneId];
                  return (
                    <p key={i} style={{ color: TIER_COLORS[d?.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                      + {d?.name ?? drop.droneId} ×{drop.qty} <span style={{ opacity: 0.7 }}>({d?.tier})</span>
                    </p>
                  );
                }
                const a = AMMO[drop.ammoId];
                return (
                  <p key={i} style={{ color: TIER_COLORS[a?.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                    + {a?.name ?? drop.ammoId} ×{drop.qty} <span style={{ opacity: 0.7 }}>({a?.tier})</span>
                  </p>
                );
              })
            )}
          </div>
          {Object.keys(consumedSnapshot).length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: '1rem' }}>
              Expended: {Object.entries(consumedSnapshot).map(([id, qty]) => `${qty}× ${AMMO[id]?.name ?? id}`).join(' · ')}
              {' '}(−{Object.entries(consumedSnapshot).reduce((sum, [id, qty]) => sum + qty * (AMMO[id]?.price ?? 0), 0).toLocaleString()} ISK)
            </p>
          )}
          {lostDroneEntries.length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: '1rem' }}>
              Drones lost: {lostDroneEntries.map(([id, qty]) => `${qty}× ${DRONES[id]?.name ?? id}`).join(' · ')}
              {' '}(−{lostDroneIsk.toLocaleString()} ISK)
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => {
              addIsk(enemy.reward);
              addSp(enemy.spReward);
              addLoot(lootIds);
              settleBattleAmmo({ consumed: ammoUsedRef.current, assignments: buildAmmoAssignments() });
              settleBattleDrones({ lost: dronesRef.current.filter((d) => !d.alive).map((d) => d.droneId) });
              onVictory({ ...playerHp.current });
            }} style={{ background: '#2cd67c', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              {isFinalNode ? 'Loot Wreck & Dock' : 'Loot Wreck & Take Gate'}
            </button>
          </div>
        </div>
      )}

      {/* DEFEAT MODAL */}
      {outcome === 'defeat' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(25,10,10,0.95)', border: '1px solid #ff4a4a', padding: '3rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', boxShadow: '0 0 50px rgba(255, 74, 74, 0.2)' }}>
          <h2 style={{ color: '#ff4a4a', fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>SHIP DESTROYED</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem', maxWidth: '380px' }}>
            Your {activeShip.name} and all fitted modules are lost.
            The pod warps back to the station and the abyssal filament collapses — depth resets to 1.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => {
              settleBattleAmmo({ consumed: ammoUsedRef.current });
              shipDestroyed();
              onDefeat();
            }} style={{ background: '#ff4a4a', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              Eject Pod & Return
            </button>
          </div>
        </div>
      )}

      {/* RETREAT MODAL */}
      {outcome === 'retreat' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(20,16,5,0.95)', border: '1px solid #e8a838', padding: '3rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', boxShadow: '0 0 50px rgba(232, 168, 56, 0.2)' }}>
          <h2 style={{ color: '#e8a838', fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>WARP OUT</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', maxWidth: '380px' }}>
            Engagement abandoned. Bounty, SP and salvage forfeited; the site is lost for this dive.
          </p>
          {Object.keys(consumedSnapshot).length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: '1rem' }}>
              Expended: {Object.entries(consumedSnapshot).map(([id, qty]) => `${qty}× ${AMMO[id]?.name ?? id}`).join(' · ')}
              {' '}(−{Object.entries(consumedSnapshot).reduce((sum, [id, qty]) => sum + qty * (AMMO[id]?.price ?? 0), 0).toLocaleString()} ISK)
            </p>
          )}
          {lostDroneEntries.length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginBottom: '1rem' }}>
              Drones lost: {lostDroneEntries.map(([id, qty]) => `${qty}× ${DRONES[id]?.name ?? id}`).join(' · ')}
              {' '}(−{lostDroneIsk.toLocaleString()} ISK)
            </p>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => {
              settleBattleAmmo({ consumed: ammoUsedRef.current, assignments: buildAmmoAssignments() });
              settleBattleDrones({ lost: dronesRef.current.filter((d) => !d.alive).map((d) => d.droneId) });
              onRetreat({ ...playerHp.current });
            }} style={{ background: '#e8a838', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              Return to Map
            </button>
          </div>
        </div>
      )}

      {/* TACTICAL COMMANDS */}
      <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
        <button onClick={() => issueCommand({ type: 'approach', radius: 0 })} style={cmdStyle('approach')}>Approach</button>
        <button onClick={() => issueCommand({ type: 'orbit', radius: 1 })} style={cmdStyle('orbit', 1)}>Orbit 1km</button>
        <button onClick={() => issueCommand({ type: 'orbit', radius: 5 })} style={cmdStyle('orbit', 5)}>Orbit 5km</button>
        <button onClick={() => issueCommand({ type: 'keepAtRange', radius: 7 })} style={cmdStyle('keepAtRange', 7)}>Keep Range 7km</button>
        <button onClick={() => issueCommand({ type: 'stop', radius: 0 })} style={cmdStyle('stop')}>Stop</button>
        <button onClick={() => (alignRef.current != null ? cancelAlign() : startAlign())} style={{ borderColor: '#e8a838', color: '#e8a838', marginLeft: '1rem' }}>
          {alignHud != null ? 'CANCEL ALIGN' : 'ALIGN & WARP'}
        </button>
      </div>
      <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '1.1rem', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #fff', zIndex: 20, display: 'flex', gap: '2rem' }}>
        <span>Distance: {formatDistance(distance)}</span>
        <span>Speed: {Math.round(speed)} m/s</span>
        {alignHud != null && <span style={{ color: '#e8a838' }}>WARPING IN {Math.ceil(alignHud)}s</span>}
      </div>

      {/* COMBAT LOG */}
      <div style={{ position: 'absolute', right: '2rem', top: '6rem', width: '300px', pointerEvents: 'none', display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
        {combatLog.map((log, i) => (
          <div key={i} style={{ color: i === 0 ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
            {log}
          </div>
        ))}
      </div>

      {/* MODULE RACK */}
      <div style={{ position: 'absolute', bottom: '170px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 20, alignItems: 'flex-end' }}>
        {modulesStateRef.current.map((mod, idx) => {
          const ammoInfo = ammoHud[idx];
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '90px' }}>
              <div onClick={() => toggleModule(idx)} title={mod.name} style={{
                width: '48px', height: '48px', borderRadius: '50%', background: mod.active ? 'rgba(44, 214, 124, 0.3)' : 'rgba(0,0,0,0.8)',
                border: `2px solid ${mod.active ? '#2cd67c' : 'rgba(255,255,255,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                boxShadow: mod.active ? '0 0 15px rgba(44, 214, 124, 0.5)' : 'none',
                color: '#fff', fontFamily: 'var(--font-display)', fontSize: ammoInfo?.reload > 0 ? '0.75rem' : '1rem'
              }}>
                {ammoInfo?.reload > 0 ? `${Math.ceil(ammoInfo.reload)}s` : mod.name.charAt(0)}
              </div>
              {ammoInfo && (
                <>
                  <span style={{ fontSize: '0.65rem', color: ammoInfo.qty > 0 ? '#fff' : '#ff4a4a' }}>×{ammoInfo.qty}</span>
                  <select
                    value={ammoInfo.ammoId || ''}
                    onChange={(e) => changeAmmo(idx, e.target.value)}
                    style={{ fontSize: '0.6rem', width: '90px', maxWidth: '90px' }}>
                    {!ammoInfo.ammoId && <option value="">— none —</option>}
                    {compatibleAmmo(mod).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({ammoPoolRef.current[a.id] ?? 0})</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* HUD BARS */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2rem', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* SQUADRON BAR (v0.12) — empty manifest renders nothing, so a
              zero-drone player's combat UI is pixel-identical to pre-v0.12. */}
          {droneHud.chips.length > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(139,224,74,0.5)', padding: '0.75rem 1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#8be04a', fontSize: '0.85rem', fontFamily: 'var(--font-display)' }}>
                  DRONES {droneHud.inSpace}/{droneHud.maxInSpace}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button onClick={launchDrones} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>LAUNCH</button>
                  <button onClick={recallDrones} style={{ fontSize: '0.65rem', padding: '0.25rem 0.5rem' }}>RECALL</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {droneHud.chips.map((chip, i) => (
                  <div key={i} title={`${chip.name} — ${chip.alive ? chip.state : 'destroyed'}`} style={{
                    width: '46px', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', fontSize: '0.6rem',
                    background: !chip.alive
                      ? 'rgba(255,74,74,0.25)'
                      : chip.state === 'bay' ? 'rgba(255,255,255,0.08)'
                      : chip.state === 'returning' ? 'rgba(232,168,56,0.25)'
                      : 'rgba(44,214,124,0.2)',
                    border: chip.locked ? '2px solid #ff4a4a' : '1px solid rgba(255,255,255,0.15)',
                    color: !chip.alive ? '#ff4a4a' : '#fff'
                  }}>
                    <div>{chip.name.charAt(0)}</div>
                    <div>{!chip.alive ? '✕' : `${chip.hpPct}%`}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(77,238,234,0.5)', padding: '1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>{activeShip.name} (You)</h3>
            <HudBar label="Shield" value={playerHud.shield} max={eff.defense.shield.hp} color="var(--color-shield)" />
            <HudBar label="Armor" value={playerHud.armor} max={eff.defense.armor.hp} color="var(--color-armor)" />
            <HudBar label="Structure" value={playerHud.hull} max={eff.defense.hull.hp} color="var(--color-hull)" />
            <HudBar label="Capacitor" value={playerHud.cap} max={eff.resources.cap_capacity} color="#e8a838" />
          </div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,74,74,0.5)', padding: '1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ color: '#ff4a4a', fontSize: '1rem', marginBottom: '0.25rem' }}>{enemy.name}</h3>
          <HudBar label="Shield" value={enemyHud.shield} max={enemy.defense.shield.hp} color="var(--color-shield)" />
          <HudBar label="Armor" value={enemyHud.armor} max={enemy.defense.armor.hp} color="var(--color-armor)" />
          <HudBar label="Structure" value={enemyHud.hull} max={enemy.defense.hull.hp} color="var(--color-hull)" />
          {enemy.cap_capacity != null && (
            <HudBar label="Capacitor" value={enemyHud.cap} max={enemy.cap_capacity} color="#e8a838" />
          )}
        </div>
      </div>
    </div>
  );
}
