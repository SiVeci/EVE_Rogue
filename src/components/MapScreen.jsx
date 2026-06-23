import React from 'react';
import { useGameStore } from '../store/gameStore';

export default function MapScreen({ onEnterNode, onDock }) {
  const { deadspaceDepth } = useGameStore();

  return (
    <div className="panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#fff', fontSize: '2rem', marginBottom: '1rem' }}>Abyssal Deadspace</h1>
      <p style={{ color: '#ff4a4a', fontSize: '1.2rem', marginBottom: '3rem' }}>Depth Level: {deadspaceDepth}</p>
      
      <div style={{ display: 'flex', gap: '3rem' }}>
        <div 
          onClick={onEnterNode}
          style={{ 
            width: '200px', height: '200px', 
            borderRadius: '50%', border: '2px solid rgba(90,150,255,0.8)', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', background: 'radial-gradient(circle, rgba(90,150,255,0.2), transparent)',
            boxShadow: '0 0 30px rgba(90,150,255,0.2)'
          }}>
          <h2 style={{ color: '#fff' }}>Acceleration Gate</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Guristas Patrol</p>
        </div>

        <div 
          onClick={onEnterNode}
          style={{ 
            width: '200px', height: '200px', 
            borderRadius: '50%', border: '2px dashed rgba(255,74,74,0.8)', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', background: 'radial-gradient(circle, rgba(255,74,74,0.1), transparent)'
          }}>
          <h2 style={{ color: '#ff4a4a' }}>Smuggler Stargate</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Elite Enemy / High Loot</p>
        </div>
      </div>

      <button onClick={onDock} style={{ marginTop: '4rem', padding: '1rem 3rem', fontSize: '1.1rem' }}>Return to Station</button>
    </div>
  );
}
