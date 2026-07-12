import React from 'react';
import { useGameStore, skillMult } from '../store/gameStore';
import './FittingWindow.css';

export default function FittingWindow() {
  const { activeShip, inventory, skills, fitModule, unfitModule } = useGameStore();

  const currentPG = activeShip.fittedModules.high.concat(activeShip.fittedModules.mid, activeShip.fittedModules.low)
    .reduce((acc, m) => acc + (m.cost.pg || 0), 0);
  const currentCPU = activeShip.fittedModules.high.concat(activeShip.fittedModules.mid, activeShip.fittedModules.low)
    .reduce((acc, m) => acc + (m.cost.cpu || 0), 0);

  // Effective capacity includes the Engineering skill bonus (matches fitModule's check)
  const engMult = skillMult(skills.engineering);
  const effectivePG = Math.floor(activeShip.resources.pg * engMult);
  const effectiveCPU = Math.floor(activeShip.resources.cpu * engMult);

  const pgPercent = Math.min(100, (currentPG / effectivePG) * 100);
  const cpuPercent = Math.min(100, (currentCPU / effectiveCPU) * 100);

  // Helper to generate positions for slots around a circle
  // EVE style: High slots top-right (270 to 360/0 deg), Mid slots right (0 to 90 deg), Low slots bottom (90 to 180 deg)
  const getSlotStyle = (type, index, totalSlots) => {
    let startAngle, endAngle;
    if (type === 'high') {
      startAngle = -80;
      endAngle = -10;
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
          {inventory.map((module, idx) => (
            <div key={idx} className="inventory-item" onClick={() => fitModule(module, module.slot)}>
              <span className="item-tier">{module.tier}</span>
              <div className="item-details">
                <span className="item-name">{module.name}</span>
                <span className="item-desc">{module.slot.toUpperCase()} SLOT</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: CIRCULAR SHIP VIEW */}
      <div className="fw-center panel">
        <div className="ship-fitting-circle">
          <div className="center-ship-info">
            <h2>{activeShip.name}</h2>
            <p>{activeShip.faction} {activeShip.class}</p>
          </div>
          
          {renderSlotNodes('high', activeShip.slots.high)}
          {renderSlotNodes('mid', activeShip.slots.mid)}
          {renderSlotNodes('low', activeShip.slots.low)}
          
        </div>
      </div>

      {/* RIGHT: STATS */}
      <div className="fw-stats panel">
        
        <div className="stat-group">
          <h3>Fitting <span>PG / CPU</span></h3>
          <div className="stat-row">
            <span>Powergrid</span>
            <span className="stat-val" style={{ color: pgPercent > 100 ? 'red' : '#fff' }}>{currentPG} / {effectivePG} MW</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${pgPercent}%`, background: pgPercent > 100 ? 'red' : 'var(--color-gallente)' }} />
          </div>

          <div className="stat-row">
            <span>CPU</span>
            <span className="stat-val" style={{ color: cpuPercent > 100 ? 'red' : '#fff' }}>{currentCPU} / {effectiveCPU} tf</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${cpuPercent}%`, background: cpuPercent > 100 ? 'red' : 'var(--color-shield)' }} />
          </div>
        </div>

        <div className="stat-group">
          <h3>Defense</h3>
          <div className="stat-row"><span>Shield HP</span><span className="stat-val" style={{ color: 'var(--color-shield)' }}>{activeShip.defense.shield.hp}</span></div>
          <div className="stat-row"><span>Armor HP</span><span className="stat-val" style={{ color: 'var(--color-armor)' }}>{activeShip.defense.armor.hp}</span></div>
          <div className="stat-row"><span>Structure HP</span><span className="stat-val" style={{ color: 'var(--color-hull)' }}>{activeShip.defense.hull.hp}</span></div>
          <div className="stat-row"><span>Signature Radius</span><span className="stat-val">{activeShip.defense.sig_radius} m</span></div>
        </div>

        <div className="stat-group">
          <h3>Capacitor</h3>
          <div className="stat-row"><span>Capacity</span><span className="stat-val">{activeShip.resources.cap_capacity} GJ</span></div>
          <div className="stat-row"><span>Recharge Time</span><span className="stat-val">{activeShip.resources.cap_recharge} s</span></div>
        </div>

        <div className="stat-group">
          <h3>Navigation</h3>
          <div className="stat-row"><span>Base Speed</span><span className="stat-val">{activeShip.mobility.base_speed} m/s</span></div>
          <div className="stat-row"><span>Mass</span><span className="stat-val">{activeShip.mobility.mass.toLocaleString()} kg</span></div>
        </div>

      </div>

    </div>
  );
}
