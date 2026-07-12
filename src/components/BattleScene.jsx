import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { useGameStore, skillMult } from '../store/gameStore';
import { getEncounter } from '../data/npcs';
import * as THREE from 'three';

// Units: 1 world unit = 1 km. Data files use EVE units (meters, m/s),
// so speeds convert via /1000 and distances via *1000 for weapon math.
const UP = new THREE.Vector3(0, 1, 0);
const PLAYER_SPAWN = [-2, 0, 0];
const ENEMY_SPAWN = [2, 0, 0];
const MAX_DT = 0.1; // clamp frame delta so tab switches don't teleport ships

// --- PHYSICS & MATH HELPERS ---
function getCapacitorRecharge(current, max, rechargeTime, dt) {
  const ratio = Math.max(0.01, Math.min(0.99, current / max));
  const rate = 10 * (max / rechargeTime) * (Math.sqrt(ratio) - ratio);
  return rate * dt;
}

// EVE Turret Hit Chance Formula (Simplified for 2.5D)
// angularVel is in rad/s at real scale (km/s over km), so the 40000 signature
// factor matches EVE's tuning: ~0.4 rad/s vs a frigate is a coin flip.
function calculateHitChance(distance, optimal, falloff, tracking, targetSig, angularVel) {
  const distPenalty = Math.max(0, distance - optimal) / Math.max(1, falloff);
  const trackPenalty = (angularVel * 40000) / (tracking * targetSig);
  const exponent = Math.pow(distPenalty, 2) + Math.pow(trackPenalty, 2);
  return Math.pow(0.5, exponent);
}

// Damage lands on the outermost intact layer, reduced by that layer's resists.
// No bleed-through: a volley never spills into the layer below.
function applyDamage(hp, defense, damageByType, mult = 1) {
  const layer = hp.shield > 0 ? 'shield' : hp.armor > 0 ? 'armor' : 'hull';
  const resists = defense[layer];
  let dmg = 0;
  for (const [type, raw] of Object.entries(damageByType)) {
    dmg += raw * mult * (1 - (resists[type] || 0) / 100);
  }
  hp[layer] = Math.max(0, hp[layer] - dmg);
  return { layer, dmg };
}

// Direction a ship should push toward to satisfy a movement command.
function desiredVelocity(command, dirToTarget, dist, maxSpeed) {
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
function applyInertia(vel, desired, dt, agility) {
  const blend = 1 - Math.exp(-dt / Math.max(0.1, agility));
  vel.lerp(desired, blend);
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

export default function BattleScene({ nodeType = 'patrol', onVictory, onDefeat }) {
  const { activeShip, skills, deadspaceDepth, addIsk, advanceDepth, shipDestroyed } = useGameStore();

  const enemy = useMemo(() => getEncounter(deadspaceDepth, nodeType), [deadspaceDepth, nodeType]);
  const gunneryMult = skillMult(skills.gunnery);
  const navigationMult = skillMult(skills.navigation);

  // Flatten modules for tracking
  const allFittedModules = [
    ...activeShip.fittedModules.high,
    ...activeShip.fittedModules.mid,
    ...activeShip.fittedModules.low
  ];

  // Local React State for UI (synced periodically from the sim refs)
  const [playerHud, setPlayerHud] = useState({
    shield: activeShip.defense.shield.hp,
    armor: activeShip.defense.armor.hp,
    hull: activeShip.defense.hull.hp,
    cap: activeShip.resources.cap_capacity
  });
  const [enemyHud, setEnemyHud] = useState({
    shield: enemy.defense.shield.hp,
    armor: enemy.defense.armor.hp,
    hull: enemy.defense.hull.hp
  });
  const [distance, setDistance] = useState(4);
  const [speed, setSpeed] = useState(0); // m/s
  const [command, setCommand] = useState({ type: 'stop', radius: 0 });
  const [combatLog, setCombatLog] = useState(["Gate activation complete. Hostile on scan."]);
  const [outcome, setOutcome] = useState(null); // null | 'victory' | 'defeat'
  const [, setForceRender] = useState(0);

  // Physics Refs — all simulation state lives here and is mutated every frame
  const playerPos = useRef(new THREE.Vector3(...PLAYER_SPAWN));
  const enemyPos = useRef(new THREE.Vector3(...ENEMY_SPAWN));
  const playerVel = useRef(new THREE.Vector3());
  const enemyVel = useRef(new THREE.Vector3());
  const playerRot = useRef(Math.PI / 2);  // spawns facing each other along +x / -x
  const enemyRot = useRef(-Math.PI / 2);
  const capRef = useRef(activeShip.resources.cap_capacity);
  const playerHp = useRef({
    shield: activeShip.defense.shield.hp,
    armor: activeShip.defense.armor.hp,
    hull: activeShip.defense.hull.hp
  });
  const enemyHp = useRef({
    shield: enemy.defense.shield.hp,
    armor: enemy.defense.armor.hp,
    hull: enemy.defense.hull.hp
  });
  const enemyWeaponTimer = useRef(1.5); // grace period before the first volley
  const angularVelocity = useRef(0);
  const battleOverRef = useRef(false);
  const commandRef = useRef({ type: 'stop', radius: 0 });
  const lastTime = useRef(performance.now());
  const hudAccumulator = useRef(0);

  // Module States Ref (tracks cooldowns and active status independently of React re-renders)
  const modulesStateRef = useRef(allFittedModules.map(m => ({ ...m, active: false, timer: 0 })));

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
    if (!mod.active && capRef.current < (mod.cost.cap || 0)) {
      addLog(`Not enough capacitor to activate ${mod.name}!`);
      return;
    }
    mod.active = !mod.active;
    if (mod.active) mod.timer = 0; // Trigger immediately
    setForceRender(Date.now());
  };

  const syncHud = (dist) => {
    setPlayerHud({
      shield: playerHp.current.shield,
      armor: playerHp.current.armor,
      hull: playerHp.current.hull,
      cap: Math.floor(capRef.current)
    });
    setEnemyHud({ ...enemyHp.current });
    setDistance(dist);
    setSpeed(playerVel.current.length() * 1000);
  };

  const endBattle = (result) => {
    battleOverRef.current = true;
    modulesStateRef.current.forEach(m => { m.active = false; });
    playerVel.current.set(0, 0, 0);
    enemyVel.current.set(0, 0, 0);
    addLog(result === 'victory' ? 'Target destroyed!' : 'Hull breach — your ship is lost!');
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
    let playerMaxSpeed = (activeShip.mobility.base_speed / 1000) * navigationMult; // u/s
    let enemyWebbed = false;

    modulesStateRef.current.forEach((mod) => {
      if (!mod.active) return;

      // Continuous effects of active modules
      if (mod.type === 'propulsion') playerMaxSpeed *= mod.stats.speed_multiplier;
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

      if (capRef.current < (mod.cost.cap || 0)) {
        mod.active = false;
        addLog(`[${mod.name}] Deactivated: Capacitor depleted!`);
        setForceRender(Date.now());
        return;
      }
      capRef.current -= (mod.cost.cap || 0);
      mod.timer = mod.stats.rof || mod.stats.activation_time;

      if (mod.type === 'hybrid_weapon') {
        const hitChance = calculateHitChance(
          distMeters, mod.stats.optimal, mod.stats.falloff, mod.stats.tracking,
          enemy.defense.sig_radius, angularVelocity.current
        );
        const roll = Math.random();
        if (roll < hitChance) {
          const quality = roll < 0.01 ? 3.0 : 0.5 + Math.random() * 0.5; // 1% wrecking shot
          const { dmg } = applyDamage(enemyHp.current, enemy.defense, mod.stats.damage, quality * gunneryMult);
          addLog(`[${mod.name}] ${quality === 3.0 ? 'WRECKS' : 'hits'} for ${Math.floor(dmg)} dmg!`);
        } else {
          addLog(`[${mod.name}] Misses!`);
        }
      } else if (mod.type === 'missile_weapon') {
        const { dmg } = applyDamage(enemyHp.current, enemy.defense, mod.stats.damage, gunneryMult);
        addLog(`[${mod.name}] Hits for ${Math.floor(dmg)} dmg!`);
      } else if (mod.type === 'shield_repair') {
        playerHp.current.shield = Math.min(activeShip.defense.shield.hp, playerHp.current.shield + mod.stats.shield_bonus);
      } else if (mod.type === 'armor_repair') {
        playerHp.current.armor = Math.min(activeShip.defense.armor.hp, playerHp.current.armor + mod.stats.armor_bonus);
      }
      // 'ewar' and 'propulsion' cycles only pay capacitor; effects applied above
    });

    if (enemyHp.current.hull <= 0) {
      endBattle('victory');
      return;
    }

    // 3. Enemy AI: orbit the player at preferred range, fire when in range
    const enemyMaxSpeed = (enemy.mobility.base_speed / 1000) * (enemyWebbed ? 0.5 : 1);
    enemyWeaponTimer.current -= dt;
    if (enemyWeaponTimer.current <= 0) {
      if (distMeters <= enemy.weapon.stats.range) {
        enemyWeaponTimer.current = enemy.weapon.stats.rof;
        const { dmg, layer } = applyDamage(playerHp.current, activeShip.defense, enemy.weapon.stats.damage);
        addLog(`${enemy.name} hits your ${layer} for ${Math.floor(dmg)}!`);
      } else {
        enemyWeaponTimer.current = 0.5;
      }
    }

    if (playerHp.current.hull <= 0) {
      endBattle('defeat');
      return;
    }

    // 4. Movement: velocity eases toward each command's desired vector (inertia)
    const desiredPlayer = desiredVelocity(commandRef.current, dirToEnemy, dist, playerMaxSpeed);
    applyInertia(playerVel.current, desiredPlayer, dt, activeShip.mobility.agility);
    playerPos.current.addScaledVector(playerVel.current, dt);

    const dirToPlayer = dirToEnemy.clone().negate();
    const desiredEnemy = desiredVelocity({ type: 'orbit', radius: enemy.ai.orbitRange }, dirToPlayer, dist, enemyMaxSpeed);
    applyInertia(enemyVel.current, desiredEnemy, dt, enemy.mobility.agility);
    enemyPos.current.addScaledVector(enemyVel.current, dt);

    if (playerVel.current.lengthSq() > 1e-6) playerRot.current = Math.atan2(playerVel.current.x, playerVel.current.z);
    if (enemyVel.current.lengthSq() > 1e-6) enemyRot.current = Math.atan2(enemyVel.current.x, enemyVel.current.z);

    // 5. Capacitor Recharge
    const capMax = activeShip.resources.cap_capacity;
    capRef.current = Math.min(capMax, capRef.current + getCapacitorRecharge(capRef.current, capMax, activeShip.resources.cap_recharge, dt));

    // 6. Sync UI a few times per second
    hudAccumulator.current += dt;
    if (hudAccumulator.current >= 0.15) {
      hudAccumulator.current = 0;
      syncHud(dist);
    }
  };

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
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={40} />
      </Canvas>

      {/* VICTORY MODAL */}
      {outcome === 'victory' && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(10,15,25,0.95)', border: '1px solid #2cd67c', padding: '3rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', boxShadow: '0 0 50px rgba(44, 214, 124, 0.2)' }}>
          <h2 style={{ color: '#2cd67c', fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>TARGET DESTROYED</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
            The {enemy.name} breaks apart. Bounty: {enemy.reward.toLocaleString()} ISK.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => {
              addIsk(enemy.reward);
              advanceDepth();
              onVictory();
            }} style={{ background: '#2cd67c', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              Loot Wreck & Take Gate
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
              shipDestroyed();
              onDefeat();
            }} style={{ background: '#ff4a4a', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              Eject Pod & Return
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
      </div>
      <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '1.1rem', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #fff', zIndex: 20, display: 'flex', gap: '2rem' }}>
        <span>Distance: {formatDistance(distance)}</span>
        <span>Speed: {Math.round(speed)} m/s</span>
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
      <div style={{ position: 'absolute', bottom: '170px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
        {modulesStateRef.current.map((mod, idx) => (
          <div key={idx} onClick={() => toggleModule(idx)} title={mod.name} style={{
            width: '48px', height: '48px', borderRadius: '50%', background: mod.active ? 'rgba(44, 214, 124, 0.3)' : 'rgba(0,0,0,0.8)',
            border: `2px solid ${mod.active ? '#2cd67c' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: mod.active ? '0 0 15px rgba(44, 214, 124, 0.5)' : 'none',
            color: '#fff', fontFamily: 'var(--font-display)'
          }}>
            {mod.name.charAt(0)}
          </div>
        ))}
      </div>

      {/* HUD BARS */}
      <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2rem' }}>
        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(77,238,234,0.5)', padding: '1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.25rem' }}>{activeShip.name} (You)</h3>
          <HudBar label="Shield" value={playerHud.shield} max={activeShip.defense.shield.hp} color="var(--color-shield)" />
          <HudBar label="Armor" value={playerHud.armor} max={activeShip.defense.armor.hp} color="var(--color-armor)" />
          <HudBar label="Structure" value={playerHud.hull} max={activeShip.defense.hull.hp} color="var(--color-hull)" />
          <HudBar label="Capacitor" value={playerHud.cap} max={activeShip.resources.cap_capacity} color="#e8a838" />
        </div>
        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,74,74,0.5)', padding: '1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ color: '#ff4a4a', fontSize: '1rem', marginBottom: '0.25rem' }}>{enemy.name}</h3>
          <HudBar label="Shield" value={enemyHud.shield} max={enemy.defense.shield.hp} color="var(--color-shield)" />
          <HudBar label="Armor" value={enemyHud.armor} max={enemy.defense.armor.hp} color="var(--color-armor)" />
          <HudBar label="Structure" value={enemyHud.hull} max={enemy.defense.hull.hp} color="var(--color-hull)" />
        </div>
      </div>
    </div>
  );
}
