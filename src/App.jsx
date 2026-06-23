import { useState } from 'react'
import './App.css'
import StationHub from './components/StationHub'
import MapScreen from './components/MapScreen'
import BattleScene from './components/BattleScene'
import { useGameStore } from './store/gameStore'

function App() {
  const [view, setView] = useState('station'); // 'station' | 'map' | 'space'
  const { isk } = useGameStore();

  return (
    <div className="app-container">
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-panel)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <h2 style={{ color: 'var(--color-text-highlight)' }}>EVE: Rogue</h2>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', alignItems: 'center' }}>
          <span>ISK: {isk.toLocaleString()}</span>
          <span>Location: {view === 'station' ? 'Station (High Sec)' : 'Abyssal Deadspace'}</span>
          {view === 'station' ? (
            <button onClick={() => setView('map')} style={{ borderColor: '#ff4a4a', color: '#ff4a4a' }}>UNDOCK</button>
          ) : (
            <button onClick={() => setView('station')}>ABORT & DOCK</button>
          )}
        </div>
      </header>
      
      <main className="main-content" style={{ padding: view === 'space' ? 0 : '2rem' }}>
        {view === 'station' && <StationHub />}
        {view === 'map' && <MapScreen onEnterNode={() => setView('space')} onDock={() => setView('station')} />}
        {view === 'space' && <BattleScene onVictory={() => setView('map')} />}
      </main>
    </div>
  )
}

export default App
