import { useState } from 'react'
import './App.css'
import StationHub from './components/StationHub'
import MapScreen from './components/MapScreen'
import BattleScene from './components/BattleScene'
import { useGameStore } from './store/gameStore'
import { rollEncounter } from './data/npcs'

function App() {
  const [view, setView] = useState('station'); // 'station' | 'map' | 'space'
  const [nodeType, setNodeType] = useState('patrol'); // 'patrol' | 'elite'
  const [encounters, setEncounters] = useState(null); // { patrol, elite } for the current map
  const { isk, activeShip } = useGameStore();

  // Encounters are rolled when the map opens so the intel shown on a node is
  // exactly what spawns behind its gate. Read depth from the store directly —
  // after a victory the render closure may still hold the pre-advance value.
  const goToMap = () => {
    const depth = useGameStore.getState().deadspaceDepth;
    setEncounters({
      patrol: rollEncounter(depth, 'patrol'),
      elite: rollEncounter(depth, 'elite')
    });
    setView('map');
  };

  return (
    <div className="app-container">
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-panel)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <h2 style={{ color: 'var(--color-text-highlight)' }}>EVE: Rogue</h2>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', alignItems: 'center' }}>
          <span>ISK: {isk.toLocaleString()}</span>
          <span>Location: {view === 'station' ? 'Station (High Sec)' : 'Abyssal Deadspace'}</span>
          {view === 'station' ? (
            <button
              onClick={goToMap}
              disabled={!activeShip}
              title={activeShip ? undefined : 'No active ship — buy or board one first'}
              style={{ borderColor: '#ff4a4a', color: '#ff4a4a', opacity: activeShip ? 1 : 0.4, cursor: activeShip ? 'pointer' : 'not-allowed' }}>
              UNDOCK
            </button>
          ) : (
            <button onClick={() => setView('station')}>ABORT & DOCK</button>
          )}
        </div>
      </header>
      
      <main className="main-content" style={{ padding: view === 'space' ? 0 : '2rem' }}>
        {view === 'station' && <StationHub />}
        {view === 'map' && <MapScreen encounters={encounters} onEnterNode={(type) => { setNodeType(type); setView('space'); }} onDock={() => setView('station')} />}
        {view === 'space' && <BattleScene encounter={encounters?.[nodeType]} nodeType={nodeType} onVictory={goToMap} onDefeat={() => setView('station')} />}
      </main>
    </div>
  )
}

export default App
