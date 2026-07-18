import React, { useState } from 'react';
import FittingWindow from './FittingWindow';
import MarketWindow from './MarketWindow';
import { useGameStore } from '../store/gameStore';
import { SKILLS, skillUnlocks } from '../data/skills';
import { BLUEPRINTS } from '../data/blueprints';
import { AMMO } from '../data/ammo';

// Cost to train the *next* level. A gate skill's first level (0->1) costs
// 1,000 SP, not free; stat skills' first upgrade (1->2) costs 2,000.
const trainCost = (level) => 1000 * (level + 1);

// Extracted so it can be rendered (and SSR-tested) without going through
// StationHub's tab state, which defaults to 'fitting'.
export function SkillsPanel({ sp, skills, trainSkill }) {
  return (
    <div className="panel" style={{ padding: '2rem', height: '100%' }}>
      <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Neural Enhancement</h2>
      <p style={{ color: '#e8a838', marginBottom: '2rem', fontSize: '1.2rem' }}>Unallocated SP: {sp.toLocaleString()}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
        {Object.entries(SKILLS).map(([key, def]) => {
          const level = skills[key] ?? 0;
          const cost = trainCost(level);
          const unlocks = skillUnlocks(key);
          return (
            <div key={key} style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff' }}>{def.name} Lv. {level}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{def.desc}</p>
                {unlocks.map(({ level: reqLevel, names }) => (
                  <p key={reqLevel} style={{ color: level >= reqLevel ? '#2cd67c' : '#5a96ff', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                    {level >= reqLevel ? '✓ ' : ''}Lv {reqLevel} → {names.join(', ')}
                  </p>
                ))}
              </div>
              <button
                onClick={() => trainSkill(key, cost)}
                disabled={sp < cost}
                style={{ opacity: sp < cost ? 0.4 : 1, cursor: sp < cost ? 'not-allowed' : 'pointer' }}>
                Train ({cost.toLocaleString()} SP)
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Extracted (v0.11) so it can be rendered (and SSR-tested) without going
// through StationHub's tab state, same precedent as SkillsPanel above.
// Blueprints are static content (src/data/blueprints.js), not store state.
export function IndustryPanel({ isk, manufacture }) {
  return (
    <div className="panel" style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Manufacturing Facility</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Construct new modules and ammunition using acquired Blueprints and ISK.</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {BLUEPRINTS.map(bp => {
          const ammo = AMMO[bp.produces];
          return (
            <div key={bp.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(90,150,255,0.3)', padding: '1rem', width: '300px' }}>
              <h3 style={{ color: '#fff', fontSize: '1rem' }}>{bp.name}</h3>
              {ammo && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  {bp.qty} rounds · {(bp.cost / bp.qty).toFixed(2)} ISK/round (market {ammo.price})
                </p>
              )}
              <p style={{ color: 'var(--color-gallente)', marginTop: '0.5rem' }}>Cost: {bp.cost.toLocaleString()} ISK</p>
              <button
                onClick={() => manufacture(bp)}
                disabled={isk < bp.cost}
                style={{ marginTop: '1rem', width: '100%', opacity: isk < bp.cost ? 0.4 : 1, cursor: isk < bp.cost ? 'not-allowed' : 'pointer' }}>
                Manufacture
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StationHub({ onUndock }) {
  const [activeTab, setActiveTab] = useState('fitting');
  const { isk, sp, skills, trainSkill, manufacture, resetProgress } = useGameStore();

  const handleReset = () => {
    if (window.confirm('Reset all progress? ISK, skills, hangar and fitting will be wiped.')) {
      resetProgress();
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Station Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('fitting')} style={{ background: activeTab === 'fitting' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'fitting' ? '#fff' : '#888' }}>
          FITTING
        </button>
        <button onClick={() => setActiveTab('market')} style={{ background: activeTab === 'market' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'market' ? '#fff' : '#888' }}>
          MARKET
        </button>
        <button onClick={() => setActiveTab('industry')} style={{ background: activeTab === 'industry' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'industry' ? '#fff' : '#888' }}>
          INDUSTRY
        </button>
        <button onClick={() => setActiveTab('skills')} style={{ background: activeTab === 'skills' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'skills' ? '#fff' : '#888' }}>
          SKILLS
        </button>
        <button onClick={handleReset} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid rgba(255,74,74,0.4)', color: '#ff4a4a' }}>
          RESET PROGRESS
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'fitting' && <FittingWindow />}

        {activeTab === 'market' && <MarketWindow />}

        {activeTab === 'industry' && <IndustryPanel isk={isk} manufacture={manufacture} />}

        {activeTab === 'skills' && <SkillsPanel sp={sp} skills={skills} trainSkill={trainSkill} />}
      </div>
    </div>
  );
}
