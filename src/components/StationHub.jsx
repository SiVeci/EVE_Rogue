import React, { useState } from 'react';
import FittingWindow from './FittingWindow';
import { useGameStore } from '../store/gameStore';

export default function StationHub({ onUndock }) {
  const [activeTab, setActiveTab] = useState('fitting');
  const { isk, sp, skills, blueprints } = useGameStore();

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Station Navigation */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
        <button onClick={() => setActiveTab('fitting')} style={{ background: activeTab === 'fitting' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'fitting' ? '#fff' : '#888' }}>
          FITTING
        </button>
        <button onClick={() => setActiveTab('industry')} style={{ background: activeTab === 'industry' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'industry' ? '#fff' : '#888' }}>
          INDUSTRY
        </button>
        <button onClick={() => setActiveTab('skills')} style={{ background: activeTab === 'skills' ? 'rgba(90,150,255,0.2)' : 'transparent', color: activeTab === 'skills' ? '#fff' : '#888' }}>
          SKILLS
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'fitting' && <FittingWindow />}
        
        {activeTab === 'industry' && (
          <div className="panel" style={{ padding: '2rem', height: '100%' }}>
            <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Manufacturing Facility</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Construct new modules using acquired Blueprints and ISK.</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {blueprints.map(bp => (
                <div key={bp.id} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(90,150,255,0.3)', padding: '1rem', width: '300px' }}>
                  <h3 style={{ color: '#fff', fontSize: '1rem' }}>{bp.name}</h3>
                  <p style={{ color: 'var(--color-gallente)', marginTop: '0.5rem' }}>Cost: {bp.cost.toLocaleString()} ISK</p>
                  <button style={{ marginTop: '1rem', width: '100%' }}>Manufacture</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="panel" style={{ padding: '2rem', height: '100%' }}>
            <h2 style={{ color: '#fff', marginBottom: '1rem' }}>Neural Enhancement</h2>
            <p style={{ color: '#e8a838', marginBottom: '2rem', fontSize: '1.2rem' }}>Unallocated SP: {sp.toLocaleString()}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff' }}>Gunnery Lv. {skills.gunnery}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>+5% Weapon Damage per level</p>
                </div>
                <button>Train (1000 SP)</button>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff' }}>Engineering Lv. {skills.engineering}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>+5% CPU and Powergrid per level</p>
                </div>
                <button>Train (1000 SP)</button>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ color: '#fff' }}>Navigation Lv. {skills.navigation}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>+5% Base Speed per level</p>
                </div>
                <button>Train (1000 SP)</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
