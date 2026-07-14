import React from 'react';
import { useGameStore } from '../store/gameStore';

// Weapon intel line shown on each node so the player can refit before diving
const threatLabel = (enc) => {
  const w = enc.weapon;
  const range = w.type === 'hybrid_weapon'
    ? `Turrets · optimal ${(w.stats.optimal / 1000).toFixed(1)} km`
    : `Missiles · range ${(w.stats.range / 1000).toFixed(1)} km`;
  return enc.ewar ? `${range} · Stasis Web` : range;
};

// Primary damage type(s) so the player can pick a resist swap before diving
const DAMAGE_TYPE_COLORS = { em: '#c060ff', th: '#ff8a4a', kin: '#9fb3c8', exp: '#ff4a4a' };
const DAMAGE_TYPE_LABELS = { em: 'EM', th: 'Thermal', kin: 'Kinetic', exp: 'Explosive' };

function primaryDamageTypes(damage) {
  const dealt = Object.entries(damage).filter(([, v]) => v > 0);
  const max = Math.max(...dealt.map(([, v]) => v));
  return dealt.filter(([, v]) => v === max).map(([type]) => type);
}

// Faction name + primary damage type badges — the "what do I fit against
// this?" line shown on every node.
function FactionIntel({ enc }) {
  return (
    <div style={{ marginTop: '0.25rem' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{enc.faction}</p>
      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '2px' }}>
        {primaryDamageTypes(enc.weapon.stats.damage).map((t) => (
          <span key={t} style={{
            color: DAMAGE_TYPE_COLORS[t], fontSize: '0.6rem',
            border: `1px solid ${DAMAGE_TYPE_COLORS[t]}`, borderRadius: '3px', padding: '0px 4px'
          }}>
            {DAMAGE_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MapScreen({ encounters, onEnterNode, onDock }) {
  const { deadspaceDepth } = useGameStore();

  const strengthPct = Math.round((1 + 0.15 * (deadspaceDepth - 1)) * 100 - 100);

  return (
    <div className="panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem' }}>Abyssal Deadspace</h1>
      <p style={{ color: '#ff4a4a', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Depth Level: {deadspaceDepth}</p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '3rem' }}>
        Local hostiles: {strengthPct > 0 ? `+${strengthPct}% stronger` : 'baseline strength'}
      </p>

      <div style={{ display: 'flex', gap: '3rem' }}>
        <div
          onClick={() => onEnterNode('patrol')}
          style={{
            width: '220px', height: '220px',
            borderRadius: '50%', border: '2px solid rgba(90,150,255,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', background: 'radial-gradient(circle, rgba(90,150,255,0.2), transparent)',
            boxShadow: '0 0 30px rgba(90,150,255,0.2)', textAlign: 'center', padding: '0.5rem'
          }}>
          <h2 style={{ color: '#fff' }}>Acceleration Gate</h2>
          <p style={{ color: '#fff', fontSize: '0.85rem', marginTop: '0.5rem' }}>{encounters.patrol.name}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{threatLabel(encounters.patrol)}</p>
          <FactionIntel enc={encounters.patrol} />
          <p style={{ color: 'var(--color-gallente)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Bounty: {encounters.patrol.reward.toLocaleString()} ISK</p>
        </div>

        <div
          onClick={() => onEnterNode('elite')}
          style={{
            width: '220px', height: '220px',
            borderRadius: '50%', border: '2px dashed rgba(255,74,74,0.8)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', background: 'radial-gradient(circle, rgba(255,74,74,0.1), transparent)',
            textAlign: 'center', padding: '0.5rem'
          }}>
          <h2 style={{ color: '#ff4a4a' }}>Smuggler Stargate</h2>
          <p style={{ color: '#fff', fontSize: '0.85rem', marginTop: '0.5rem' }}>{encounters.elite.name}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{threatLabel(encounters.elite)}</p>
          <FactionIntel enc={encounters.elite} />
          <p style={{ color: 'var(--color-gallente)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Bounty: {encounters.elite.reward.toLocaleString()} ISK</p>
        </div>
      </div>

      <button onClick={onDock} style={{ marginTop: '4rem', padding: '1rem 3rem', fontSize: '1.1rem' }}>Return to Station</button>
    </div>
  );
}
