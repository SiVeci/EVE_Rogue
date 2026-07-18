import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { getEffectiveStats } from '../lib/shipStats';
import { compatibleAmmo } from '../lib/ammo';
import { AMMO } from '../data/ammo';
import { meetsRequiredSkills, describeRequiredSkills } from '../data/skills';
import { SHIPS } from '../data/ships';
import './FittingWindow.css';

export default function FittingWindow() {
  const { isk, activeShip, inventory, cargo, skills, ownedShips, insurance, fitModule, unfitModule, switchShip, buyInsurance, setWeaponAmmo } = useGameStore();

  // Single source of truth for stats: this is the same function fitModule's
  // validation and BattleScene's combat init use, so what's shown here is
  // exactly what governs fitting checks and the fight.
  const eff = useMemo(
    () => (activeShip ? getEffectiveStats(activeShip, activeShip.fittedModules, skills) : null),
    [activeShip, skills]
  );

  const distinctOwned = [...new Set(ownedShips)];
  const insurancePremium = activeShip ? Math.round(SHIPS[activeShip.id].price * 0.3) : 0;
  const isInsured = activeShip && insurance?.shipId === activeShip.id;

  // Podded: no hull to fit — offer boarding or point to the market
  if (!activeShip) {
    return (
      <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <h2 style={{ color: '#ff4a4a' }}>NO ACTIVE SHIP</h2>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', textAlign: 'center' }}>
          Your ship was lost in the abyss. Board a hull from your hangar, or buy a new one on the MARKET tab.
        </p>
        {distinctOwned.map((id) => {
          const ship = SHIPS[id];
          const locked = !meetsRequiredSkills(ship.requiredSkills, skills);
          return (
            <button key={id} onClick={() => switchShip(id)} style={locked ? { color: '#ff4a4a' } : undefined} title={locked ? `Requires ${describeRequiredSkills(ship.requiredSkills)}` : undefined}>
              Board {ship.name}{locked && ' (locked)'}
            </button>
          );
        })}
      </div>
    );
  }

  // Display floored, gate (in gameStore.fitModule) unfloored — matches the
  // previous engineering-multiplier rounding behavior.
  const effectivePG = Math.floor(eff.resources.pg);
  const effectiveCPU = Math.floor(eff.resources.cpu);
  const pgPercent = Math.min(100, (eff.used.pg / effectivePG) * 100);
  const cpuPercent = Math.min(100, (eff.used.cpu / effectiveCPU) * 100);
  const fmtResist = (layer) => `${Math.round(layer.em)}/${Math.round(layer.th)}/${Math.round(layer.kin)}/${Math.round(layer.exp)}`;

  // AMMUNITION (v0.11): one selector row per fitted weapon, index-aligned
  // with activeShip.ammo (see gameStore's fitModule/unfitModule/merge for the
  // invariant this depends on). No weapons-row space in the circular fit
  // view itself (v0.7's slot dots have no room for a selector), so this
  // lives in the right stat panel instead.
  const weaponRows = activeShip.fittedModules.high
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.ammoFamily);
  const cargoEntries = Object.entries(cargo).filter(([, qty]) => qty > 0);

  // Helper to generate positions for slots around a circle
  // EVE style: High slots top-right (270 to 360/0 deg), Mid slots right (0 to 90 deg), Low slots bottom (90 to 180 deg)
  const getSlotStyle = (type, index, totalSlots) => {
    let startAngle, endAngle;
    if (type === 'high') {
      // Widened from the original 70deg span (-80/-10) to fit Catalyst's 8
      // high slots without adjacent slot circles overlapping: at 250px
      // radius, 90deg / 7 gaps is a ~56px arc between slot centers, safely
      // clear of the 48px slot diameter.
      startAngle = -95;
      endAngle = -5;
    } else if (type === 'mid') {
      startAngle = 10;
      endAngle = 80;
    } else if (type === 'low') {
      startAngle = 100;
      endAngle = 170;
    }

    // Distribute slots evenly within the angle range
    const angleRange = endAngle - startAngle;
    const step = totalSlots > 1 ? angleRange / (totalSlots - 1) : 0;
    const angleDeg = startAngle + (step * index);
    const angleRad = angleDeg * (Math.PI / 180);
    
    // Radius of the circle (500px diameter = 250px radius)
    const radius = 250;
    
    // Calculate X and Y from center (50%, 50%)
    const x = Math.cos(angleRad) * radius + 250;
    const y = Math.sin(angleRad) * radius + 250;

    return {
      left: `${x}px`,
      top: `${y}px`
    };
  };

  const renderSlotNodes = (slotType, maxSlots) => {
    const fitted = activeShip.fittedModules[slotType];
    const nodes = [];

    for (let i = 0; i < maxSlots; i++) {
      const module = fitted[i];
      const style = getSlotStyle(slotType, i, maxSlots);
      
      if (module) {
        nodes.push(
          <div key={`${slotType}-${i}`} className="fitting-slot fitted" style={style} onClick={() => unfitModule(module, slotType, i)} title={module.name}>
            <div className="slot-icon">{module.name.charAt(0)}</div>
          </div>
        );
      } else {
        nodes.push(
          <div key={`${slotType}-${i}`} className="fitting-slot empty" style={style}>
            {slotType[0].toUpperCase()}
          </div>
        );
      }
    }
    return nodes;
  };

  return (
    <div className="fitting-window">
      
      {/* LEFT: INVENTORY */}
      <div className="fw-inventory panel">
        <h3 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>STATION HANGAR</h3>
        <div className="inventory-list" style={{ overflowY: 'auto', flex: 1 }}>
          {inventory.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Hangar is empty.</p>}
          {inventory.map((module, idx) => {
            const locked = !meetsRequiredSkills(module.requiredSkills, skills);
            return (
              <div key={idx} className="inventory-item" onClick={() => fitModule(module, module.slot)} style={locked ? { opacity: 0.6 } : undefined}>
                <span className="item-tier">{module.tier}</span>
                <div className="item-details">
                  <span className="item-name">{module.name}</span>
                  <span className="item-desc">
                    {module.slot.toUpperCase()} SLOT
                    {locked && <span style={{ color: '#ff4a4a' }}> · requires {describeRequiredSkills(module.requiredSkills)}</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER: CIRCULAR SHIP VIEW */}
      <div className="fw-center panel">
        {/* Owned-hull switcher: boarding another hull strips the current fit back to the hangar */}
        <div style={{ position: 'absolute', top: '1rem', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '0.5rem', zIndex: 2 }}>
          {distinctOwned.map((id) => {
            const ship = SHIPS[id];
            const isActive = activeShip.id === id;
            const locked = !meetsRequiredSkills(ship.requiredSkills, skills);
            const count = ownedShips.filter((s) => s === id).length;
            return (
              <button
                key={id}
                onClick={() => switchShip(id)}
                title={locked ? `Requires ${describeRequiredSkills(ship.requiredSkills)}` : undefined}
                style={{
                  background: isActive ? 'rgba(90,150,255,0.2)' : 'transparent',
                  color: locked ? '#ff4a4a' : (isActive ? '#fff' : '#888'),
                  fontSize: '0.75rem'
                }}>
                {ship.name}{count > 1 ? ` ×${count}` : ''}
              </button>
            );
          })}
        </div>
        <div className="ship-fitting-circle">
          <div className="center-ship-info">
            <h2>{activeShip.name}</h2>
            <p>{activeShip.faction} {activeShip.class}</p>
            {isInsured ? (
              <p style={{ color: '#2cd67c', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                ✓ Insured — pays {SHIPS[activeShip.id].price.toLocaleString()} ISK on loss
              </p>
            ) : (
              <button
                onClick={buyInsurance}
                disabled={isk < insurancePremium}
                style={{ fontSize: '0.7rem', marginTop: '0.5rem', opacity: isk < insurancePremium ? 0.4 : 1 }}>
                Insure hull — {insurancePremium.toLocaleString()} ISK (pays {SHIPS[activeShip.id].price.toLocaleString()} on loss)
              </button>
            )}
          </div>
          
          {renderSlotNodes('high', activeShip.slots.high)}
          {renderSlotNodes('mid', activeShip.slots.mid)}
          {renderSlotNodes('low', activeShip.slots.low)}
          
        </div>
      </div>

      {/* RIGHT: STATS */}
      <div className="fw-stats panel">

        <div className="stat-group">
          <h3>Ammunition</h3>
          {weaponRows.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', margin: 0 }}>No weapons fitted.</p>
          )}
          {weaponRows.map(({ m, i }) => {
            const ammoId = activeShip.ammo?.[i] ?? null;
            const qty = ammoId ? (cargo[ammoId] ?? 0) : 0;
            return (
              <div key={i} className="stat-row" style={{ gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem' }}>H{i + 1} · {m.name}</span>
                <select
                  value={ammoId || ''}
                  onChange={(e) => setWeaponAmmo(i, e.target.value)}
                  style={{ fontSize: '0.68rem', maxWidth: '130px' }}>
                  {!ammoId && <option value="">— none —</option>}
                  {compatibleAmmo(m).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <span className="stat-val" style={{ fontSize: '0.7rem', color: qty > 0 ? '#fff' : '#ff4a4a' }}>{qty.toLocaleString()}</span>
              </div>
            );
          })}
          <div className="stat-row" style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
            <span>Cargo Hold</span>
            <span className="stat-val" style={{ fontSize: '0.68rem', textAlign: 'right' }}>
              {cargoEntries.length === 0
                ? 'Empty'
                : cargoEntries.map(([id, qty]) => `${AMMO[id]?.name ?? id} ×${qty.toLocaleString()}`).join(' · ')}
            </span>
          </div>
        </div>

        <div className="stat-group">
          <h3>Fitting <span>PG / CPU</span></h3>
          <div className="stat-row">
            <span>Powergrid</span>
            <span className="stat-val" style={{ color: pgPercent > 100 ? 'red' : '#fff' }}>{eff.used.pg} / {effectivePG} MW</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${pgPercent}%`, background: pgPercent > 100 ? 'red' : 'var(--color-gallente)' }} />
          </div>

          <div className="stat-row">
            <span>CPU</span>
            <span className="stat-val" style={{ color: cpuPercent > 100 ? 'red' : '#fff' }}>{eff.used.cpu} / {effectiveCPU} tf</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${cpuPercent}%`, background: cpuPercent > 100 ? 'red' : 'var(--color-shield)' }} />
          </div>
        </div>

        <div className="stat-group">
          <h3>Defense</h3>
          <div className="stat-row"><span>Shield HP</span><span className="stat-val" style={{ color: 'var(--color-shield)' }}>{Math.round(eff.defense.shield.hp)}</span></div>
          <div className="stat-row"><span>Shield Resists</span><span className="stat-val" style={{ fontSize: '0.75rem' }}>{fmtResist(eff.defense.shield)}</span></div>
          <div className="stat-row"><span>Armor HP</span><span className="stat-val" style={{ color: 'var(--color-armor)' }}>{Math.round(eff.defense.armor.hp)}</span></div>
          <div className="stat-row"><span>Armor Resists</span><span className="stat-val" style={{ fontSize: '0.75rem' }}>{fmtResist(eff.defense.armor)}</span></div>
          <div className="stat-row"><span>Structure HP</span><span className="stat-val" style={{ color: 'var(--color-hull)' }}>{Math.round(eff.defense.hull.hp)}</span></div>
          <div className="stat-row"><span>Structure Resists</span><span className="stat-val" style={{ fontSize: '0.75rem' }}>{fmtResist(eff.defense.hull)}</span></div>
          <div className="stat-row"><span>Signature Radius</span><span className="stat-val">{Math.round(eff.defense.sig_radius)} m</span></div>
        </div>

        <div className="stat-group">
          <h3>Offense</h3>
          <div className="stat-row"><span>Hybrid Damage</span><span className="stat-val">×{eff.damageMult.hybrid_weapon.toFixed(2)}</span></div>
          <div className="stat-row"><span>Missile Damage</span><span className="stat-val">×{eff.damageMult.missile_weapon.toFixed(2)}</span></div>
        </div>

        <div className="stat-group">
          <h3>Capacitor</h3>
          <div className="stat-row"><span>Capacity</span><span className="stat-val">{Math.round(eff.resources.cap_capacity)} GJ</span></div>
          <div className="stat-row"><span>Recharge Time</span><span className="stat-val">{eff.resources.cap_recharge} s</span></div>
        </div>

        <div className="stat-group">
          <h3>Navigation</h3>
          <div className="stat-row"><span>Base Speed</span><span className="stat-val">{Math.round(eff.mobility.base_speed)} m/s</span></div>
          <div className="stat-row"><span>Agility</span><span className="stat-val">{eff.mobility.agility.toFixed(2)} s</span></div>
          <div className="stat-row"><span>Mass</span><span className="stat-val">{eff.mobility.mass.toLocaleString()} kg</span></div>
        </div>

      </div>

    </div>
  );
}
