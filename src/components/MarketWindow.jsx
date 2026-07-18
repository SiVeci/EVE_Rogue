import React from 'react';
import { useGameStore } from '../store/gameStore';
import { MODULES } from '../data/modules';
import { SHIPS } from '../data/ships';
import { TIER_COLORS } from '../lib/tiers';

const SLOT_GROUPS = [
  { key: 'high', label: 'HIGH SLOT MODULES' },
  { key: 'mid', label: 'MID SLOT MODULES' },
  { key: 'low', label: 'LOW SLOT MODULES' }
];

// Passive modules have no `stats` block — describe them from `modifiers` instead.
const MODIFIER_LABELS = {
  'defense.shield.hp': 'Shield HP',
  'defense.armor.hp': 'Armor HP',
  'defense.hull.hp': 'Hull HP',
  'defense.shield.resists': 'Shield resist',
  'defense.armor.resists': 'Armor resist',
  'defense.hull.resists': 'Hull resist',
  'defense.sig_radius': 'Signature',
  'mobility.base_speed': 'Speed',
  'mobility.agility': 'Agility',
  'resources.pg': 'Powergrid',
  'resources.cpu': 'CPU',
  'damage.hybrid_weapon': 'Hybrid dmg',
  'damage.missile_weapon': 'Missile dmg'
};

const formatModifier = (mod) => {
  const label = MODIFIER_LABELS[mod.stat] || mod.stat;
  if (mod.op === 'mult') return `${label} ×${mod.value}`;
  return `${label} ${mod.value >= 0 ? '+' : ''}${mod.value}`;
};

// One-line stat summary per module type for the market listing
const keyStats = (m) => {
  if (m.passive) return m.modifiers.map(formatModifier).join(' · ');
  const s = m.stats;
  switch (m.type) {
    case 'hybrid_weapon': {
      const dmg = Object.values(s.damage).reduce((a, b) => a + b, 0);
      return `${dmg} dmg / ${s.rof}s · optimal ${(s.optimal / 1000).toFixed(1)} km`;
    }
    case 'missile_weapon': {
      const dmg = Object.values(s.damage).reduce((a, b) => a + b, 0);
      return `${dmg} dmg / ${s.rof}s · range ${(s.range / 1000).toFixed(1)} km`;
    }
    case 'shield_repair': return `+${s.shield_bonus} shield / ${s.activation_time}s`;
    case 'armor_repair': return `+${s.armor_bonus} armor / ${s.activation_time}s`;
    case 'propulsion': return `max speed ×${s.speed_multiplier}`;
    case 'ewar': return `target speed −${s.speed_reduction_pct}%`;
    case 'energy_neut': return `−${s.neut_amount} GJ / ${s.activation_time}s · optimal ${(s.optimal / 1000).toFixed(1)} km`;
    default: return '';
  }
};

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: '0.75rem',
  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(90,150,255,0.2)',
  padding: '0.6rem 0.8rem', marginBottom: '0.5rem'
};

export default function MarketWindow() {
  const { isk, inventory, ownedShips, activeShip, buyModule, sellModule, buyShip } = useGameStore();

  // Meta/T2 are loot-only (see src/lib/loot.js) — the market only stocks T1.
  const modulesBySlot = (slot) => Object.values(MODULES).filter((m) => m.slot === slot && m.tier === 'T1');
  const ownedCount = (shipId) => ownedShips.filter((id) => id === shipId).length;

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>

      {/* LEFT: MARKET CATALOG */}
      <div className="panel" style={{ flex: 2, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h2 style={{ color: '#fff' }}>Regional Market</h2>
          <span style={{ color: '#e8a838' }}>Wallet: {isk.toLocaleString()} ISK</span>
        </div>

        {!activeShip && (
          <p style={{ color: '#ff4a4a', marginBottom: '1rem', fontSize: '0.85rem' }}>
            You are in your pod. Buy a ship (or board one from the FITTING tab) before undocking.
          </p>
        )}

        <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', letterSpacing: '1px', margin: '0.5rem 0' }}>SHIPS</h3>
        {Object.values(SHIPS).map((ship) => (
          <div key={ship.id} style={rowStyle}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#fff' }}>{ship.name}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                {ship.faction} {ship.class} · {ship.slots.high}H/{ship.slots.mid}M/{ship.slots.low}L
                {ownedCount(ship.id) > 0 && ` · owned ×${ownedCount(ship.id)}`}
              </span>
            </div>
            <span style={{ color: 'var(--color-gallente)', fontSize: '0.85rem' }}>{ship.price.toLocaleString()} ISK</span>
            <button
              onClick={() => buyShip(ship.id)}
              disabled={isk < ship.price}
              style={{ opacity: isk < ship.price ? 0.4 : 1, cursor: isk < ship.price ? 'not-allowed' : 'pointer' }}>
              Buy
            </button>
          </div>
        ))}

        {SLOT_GROUPS.map((group) => (
          <React.Fragment key={group.key}>
            <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', letterSpacing: '1px', margin: '1rem 0 0.5rem' }}>{group.label}</h3>
            {modulesBySlot(group.key).map((m) => (
              <div key={m.id} style={rowStyle}>
                <span style={{ color: TIER_COLORS[m.tier] || 'var(--color-text-muted)', fontSize: '0.7rem', width: '2.5rem' }}>{m.tier}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontSize: '0.9rem' }}>{m.name}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', display: 'block' }}>
                    {keyStats(m)} · {m.cost.pg} MW / {m.cost.cpu} tf
                  </span>
                </div>
                <span style={{ color: 'var(--color-gallente)', fontSize: '0.85rem' }}>{m.price.toLocaleString()} ISK</span>
                <button
                  onClick={() => buyModule(m.id)}
                  disabled={isk < m.price}
                  style={{ opacity: isk < m.price ? 0.4 : 1, cursor: isk < m.price ? 'not-allowed' : 'pointer' }}>
                  Buy
                </button>
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* RIGHT: SELL FROM HANGAR */}
      <div className="panel" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <h3 style={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>SELL FROM HANGAR</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginBottom: '1rem' }}>Modules sell for 50% of market price.</p>
        {inventory.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Hangar is empty.</p>}
        {inventory.map((m, idx) => (
          <div key={idx} style={rowStyle}>
            <span style={{ color: TIER_COLORS[m.tier] || 'var(--color-text-muted)', fontSize: '0.7rem', width: '2.5rem' }}>{m.tier}</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#fff', fontSize: '0.85rem' }}>{m.name}</span>
            </div>
            <button onClick={() => sellModule(idx)}>
              Sell {Math.round(m.price * 0.5).toLocaleString()}
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
