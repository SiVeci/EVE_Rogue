import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Grid } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import * as THREE from 'three';

// --- PHYSICS & MATH HELPERS ---
function getCapacitorRecharge(current, max, rechargeTime, dt) {
  const ratio = Math.max(0.01, Math.min(0.99, current / max));
  const rate = 10 * (max / rechargeTime) * (Math.sqrt(ratio) - ratio);
  return rate * dt;
}

// EVE Turret Hit Chance Formula (Simplified for 2.5D)
function calculateHitChance(distance, optimal, falloff, tracking, targetSig, angularVel) {
  const distPenalty = Math.max(0, distance - optimal) / Math.max(1, falloff);
  const trackPenalty = (angularVel * 40000) / (tracking * targetSig); // 40000 is an arbitrary scale factor for our 2.5D distances
  const exponent = Math.pow(distPenalty, 2) + Math.pow(trackPenalty, 2);
  return Math.pow(0.5, exponent);
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
    <group ref={meshRef}>
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

export default function BattleScene({ onVictory }) {
  const { activeShip, addIsk, advanceDepth } = useGameStore();
  
  // Flatten modules for tracking
  const allFittedModules = [
    ...activeShip.fittedModules.high,
    ...activeShip.fittedModules.mid,
    ...activeShip.fittedModules.low
  ];

  // Local React State for UI
  const [playerCap, setPlayerCap] = useState(activeShip.resources.cap_capacity);
  const [playerShield, setPlayerShield] = useState(activeShip.defense.shield.hp);
  const [enemyShield, setEnemyShield] = useState(500);
  const [enemyArmor, setEnemyArmor] = useState(300);
  const [distance, setDistance] = useState(20);
  const [command, setCommand] = useState({ type: 'stop', radius: 0 });
  const [combatLog, setCombatLog] = useState(["Undock sequence complete. Engage when ready."]);
  const [isVictory, setIsVictory] = useState(false);
  const [, setForceRender] = useState(0);

  // Physics Refs
  const playerPos = useRef(new THREE.Vector3(-10, 0, 0));
  const enemyPos = useRef(new THREE.Vector3(10, 0, 0));
  const playerRot = useRef(0);
  const enemyRot = useRef(Math.PI);
  const capRef = useRef(activeShip.resources.cap_capacity);
  const pShieldRef = useRef(activeShip.defense.shield.hp);
  
  const eShieldRef = useRef(500);
  const eArmorRef = useRef(300);
  const eHullRef = useRef(350);

  const lastTime = useRef(performance.now());
  const prevPlayerPos = useRef(new THREE.Vector3(-10, 0, 0));
  const angularVelocity = useRef(0);

  // Module States Ref (tracks cooldowns and active status independently of React re-renders)
  const modulesStateRef = useRef(allFittedModules.map(m => ({ ...m, active: false, timer: 0 })));

  const addLog = (msg) => {
    setCombatLog(prev => [msg, ...prev].slice(0, 5));
  };

  const toggleModule = (index) => {
    const mod = modulesStateRef.current[index];
    if (!mod.active && capRef.current < (mod.cost.cap || 0)) {
      addLog(`Not enough capacitor to activate ${mod.name}!`);
      return;
    }
    mod.active = !mod.active;
    if (mod.active) mod.timer = 0; // Trigger immediately
    setForceRender(Date.now());
  };

  const PhysicsUpdater = () => {
    useFrame((state) => {
      const time = performance.now();
      const dt = (time - lastTime.current) / 1000;
      lastTime.current = time;

      // 1. Calculate Distances & Velocities
      const dist = playerPos.current.distanceTo(enemyPos.current);
      // Angular velocity roughly = transverse velocity / distance
      const frameVel = new THREE.Vector3().subVectors(playerPos.current, prevPlayerPos.current).divideScalar(dt);
      prevPlayerPos.current.copy(playerPos.current);
      const toTarget = new THREE.Vector3().subVectors(enemyPos.current, playerPos.current).normalize();
      const transverseVel = new THREE.Vector3().crossVectors(toTarget, new THREE.Vector3(0,1,0)).dot(frameVel);
      angularVelocity.current = Math.abs(transverseVel / Math.max(1, dist));

      // 2. Process Modules
      let currentMaxSpeed = activeShip.mobility.base_speed / 50; // default speed

      modulesStateRef.current.forEach((mod, idx) => {
        if (!mod.active) return;
        
        // Passive effects of active modules
        if (mod.type === 'propulsion') {
          currentMaxSpeed *= mod.stats.speed_multiplier;
        }

        if (mod.timer <= 0) {
          // Cycle activation
          if (capRef.current >= (mod.cost.cap || 0)) {
            capRef.current -= (mod.cost.cap || 0);
            mod.timer = mod.stats.rof || mod.stats.activation_time;

            // Execute specific effects
            if (mod.type === 'hybrid_weapon' || mod.type === 'missile_weapon') {
               // Calculate hit
               const isMissile = mod.type === 'missile_weapon';
               let hitChance = 1.0;
               let dmgMult = 1.0;

               if (!isMissile) {
                  hitChance = calculateHitChance(dist * 1000, mod.stats.optimal, mod.stats.falloff, mod.stats.tracking, 45 /* enemy sig */, angularVelocity.current);
               } else {
                  // Missile math (simplified)
                  if (dist * 1000 > mod.stats.range) hitChance = 0;
               }

               const roll = Math.random();
               if (roll < hitChance) {
                 // Hit! (Calculate damage quality based on roll vs hitChance)
                 if (!isMissile) {
                    if (roll < 0.01) dmgMult = 3.0; // Wrecking shot
                    else dmgMult = 0.5 + Math.random() * 0.5; // Glancing to excellent
                 }
                 
                 const rawDmg = Object.values(mod.stats.damage).reduce((a, b) => a + b, 0) * dmgMult;
                 
                 // Apply to enemy
                 if (eShieldRef.current > 0) {
                    eShieldRef.current = Math.max(0, eShieldRef.current - rawDmg);
                 } else {
                    eArmorRef.current = Math.max(0, eArmorRef.current - rawDmg);
                    if (eArmorRef.current <= 0 && eShieldRef.current <= 0) {
                      // Dead!
                      setCommand({ type: 'stop', radius: 0 });
                      setIsVictory(true);
                      addLog("Target Destroyed!");
                    }
                 }
                 addLog(`[${mod.name}] Hits for ${Math.floor(rawDmg)} dmg!`);
               } else {
                 addLog(`[${mod.name}] Misses!`);
               }
            }
            
            if (mod.type === 'shield_repair') {
               pShieldRef.current = Math.min(activeShip.defense.shield.hp, pShieldRef.current + mod.stats.shield_bonus);
            }

          } else {
            mod.active = false; // Cap empty
            addLog(`[${mod.name}] Deactivated: Capacitor depleted!`);
            setForceRender(Date.now());
          }
        } else {
          mod.timer -= dt;
        }
      });

      // 3. Capacitor Recharge
      const capMax = activeShip.resources.cap_capacity;
      const rechargeAmount = getCapacitorRecharge(capRef.current, capMax, activeShip.resources.cap_recharge, dt);
      capRef.current = Math.min(capMax, capRef.current + rechargeAmount);
      
      // 4. Movement Logic
      if (command.type !== 'stop') {
        const vToTarget = new THREE.Vector3().subVectors(enemyPos.current, playerPos.current);
        const dir = vToTarget.clone().normalize();
        let moveDir = new THREE.Vector3(0,0,0);

        if (command.type === 'keepAtRange') {
          if (dist > command.radius + 1) moveDir = dir; 
          else if (dist < command.radius - 1) moveDir = dir.clone().negate();
        } 
        else if (command.type === 'orbit') {
          const up = new THREE.Vector3(0, 1, 0);
          let theta;
          if (dist >= command.radius) {
            theta = Math.asin(command.radius / dist);
          } else {
            theta = Math.PI / 2 + Math.acos(dist / command.radius);
          }
          moveDir = dir.clone().applyAxisAngle(up, theta).normalize();
        }

        playerPos.current.add(moveDir.multiplyScalar(currentMaxSpeed * dt));
        if (moveDir.lengthSq() > 0.01) playerRot.current = Math.atan2(moveDir.x, moveDir.z);
      }

      // Sync UI occasionally
      if (state.clock.elapsedTime * 60 % 10 < 1) {
        setPlayerCap(Math.floor(capRef.current));
        setDistance(Math.floor(dist * 100) / 100);
        setEnemyShield(Math.floor(eShieldRef.current));
        setEnemyArmor(Math.floor(eArmorRef.current));
        setPlayerShield(Math.floor(pShieldRef.current));
      }
    });
    return null;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}>
      <Canvas shadows camera={{ position: [0, 30, 30], fov: 45 }}>
        <PhysicsUpdater />
        <color attach="background" args={['#02040a']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
        <Grid position={[0, -2, 0]} args={[200, 200]} cellSize={2} cellColor="#1e283c" sectionSize={10} sectionColor="#2a3f5f" fadeDistance={100} />

        <ShipMesh positionRef={playerPos} rotationRef={playerRot} color="#5a6b7c" isPlayer={true} />
        {!isVictory && <ShipMesh positionRef={enemyPos} rotationRef={enemyRot} color="#3a2b2c" isPlayer={false} />}
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} minDistance={10} maxDistance={100} />
      </Canvas>

      {/* VICTORY MODAL */}
      {isVictory && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(10,15,25,0.95)', border: '1px solid #2cd67c', padding: '3rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', boxShadow: '0 0 50px rgba(44, 214, 124, 0.2)' }}>
          <h2 style={{ color: '#2cd67c', fontSize: '2rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>TARGET DESTROYED</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>You successfully destroyed the Guristas Pirate. The wreck contains valuable salvage.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={() => {
              addIsk(15000);
              advanceDepth();
              onVictory();
            }} style={{ background: '#2cd67c', color: '#000', border: 'none', padding: '1rem 2rem', fontWeight: 'bold' }}>
              Loot Wreck & Take Gate
            </button>
          </div>
        </div>
      )}

      {/* TACTICAL COMMANDS */}
      <div style={{ position: 'absolute', top: '100px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
        <button onClick={() => setCommand({ type: 'orbit', radius: 1 })} style={{ background: command.type === 'orbit' && command.radius === 1 ? 'rgba(90,150,255,0.4)' : '' }}>Orbit 1km</button>
        <button onClick={() => setCommand({ type: 'orbit', radius: 10 })} style={{ background: command.type === 'orbit' && command.radius === 10 ? 'rgba(90,150,255,0.4)' : '' }}>Orbit 10km</button>
        <button onClick={() => setCommand({ type: 'keepAtRange', radius: 5 })} style={{ background: command.type === 'keepAtRange' && command.radius === 5 ? 'rgba(90,150,255,0.4)' : '' }}>Keep Range 5km</button>
        <button onClick={() => setCommand({ type: 'stop', radius: 0 })} style={{ background: command.type === 'stop' ? 'rgba(255,74,74,0.4)' : '' }}>Stop</button>
      </div>
      <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: '1.2rem', fontFamily: 'var(--font-display)', textShadow: '0 0 10px #fff', zIndex: 20 }}>
        Distance: {distance} km
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
      <div style={{ position: 'absolute', bottom: '150px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
        {modulesStateRef.current.map((mod, idx) => (
          <div key={idx} onClick={() => toggleModule(idx)} style={{
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
          <h3 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>{activeShip.name} (You)</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-shield)', fontSize: '0.85rem' }}><span>Shield</span> <span>{playerShield}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e8a838', fontSize: '0.85rem' }}><span>Capacitor</span> <span>{playerCap} GJ</span></div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,74,74,0.5)', padding: '1rem', borderRadius: '8px', width: '320px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ color: '#ff4a4a', fontSize: '1rem', marginBottom: '0.5rem' }}>Guristas Pirate</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-shield)', fontSize: '0.85rem' }}><span>Shield</span> <span>{enemyShield}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-armor)', fontSize: '0.85rem' }}><span>Armor</span> <span>{enemyArmor}</span></div>
        </div>
      </div>
    </div>
  );
}
