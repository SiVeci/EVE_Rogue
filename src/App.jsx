import { useState, useMemo } from 'react'
import './App.css'
import StationHub from './components/StationHub'
import MapScreen from './components/MapScreen'
import BattleScene from './components/BattleScene'
import { useGameStore } from './store/gameStore'
import { getEffectiveStats } from './lib/shipStats'
import { generateRunMap, reachableNodeIds, isFinalLayer } from './lib/runmap'

function findNode(map, nodeId) {
  for (const nodes of map.layers) {
    const n = nodes.find((x) => x.id === nodeId);
    if (n) return n;
  }
  return null;
}

function App() {
  const [view, setView] = useState('station'); // 'station' | 'map' | 'space'
  const { isk, activeShip, skills } = useGameStore();

  // Segment map/position/HP is local, deliberately not persisted (v0.9 FR-3):
  // a refresh is a voluntary dock-out. null = not currently in a dive.
  const [runState, setRunState] = useState(null);
  // The node currently being fought — kept separate from runState so the
  // map's `at`/`cleared`/`closed` only update once the outcome is confirmed.
  const [pendingNodeId, setPendingNodeId] = useState(null);

  const maxHp = useMemo(
    () => (activeShip ? getEffectiveStats(activeShip, activeShip.fittedModules, skills).defense : null),
    [activeShip, skills]
  );

  const pendingNode = runState && pendingNodeId ? findNode(runState.map, pendingNodeId) : null;
  const isFinalNode = runState && pendingNodeId ? isFinalLayer(runState.map, pendingNodeId) : false;

  // Segment map is generated on UNDOCK (what you scan is what you fight —
  // every combat node's encounter is pre-rolled at generation time).
  const startRun = () => {
    const depth = useGameStore.getState().deadspaceDepth;
    const map = generateRunMap(depth);
    setRunState({ map, at: null, playerHp: null, cleared: [], closed: [], notice: null });
    setView('map');
  };

  const handleSelectNode = (nodeId) => {
    const node = findNode(runState.map, nodeId);
    if (!node) return;

    if (node.type === 'repair') {
      setRunState({ ...runState, at: nodeId, cleared: [...runState.cleared, nodeId], playerHp: null });
      return;
    }
    if (node.type === 'wreck' && !node.ambush) {
      useGameStore.getState().addLoot(node.loot);
      setRunState({ ...runState, at: nodeId, cleared: [...runState.cleared, nodeId], notice: { nodeId, lootIds: node.loot } });
      return;
    }
    // patrol / elite / ambushed wreck: all fought in BattleScene
    setPendingNodeId(nodeId);
    setView('space');
  };

  const handleVictory = (hpSnapshot) => {
    const nodeId = pendingNodeId;
    const final = isFinalLayer(runState.map, nodeId);
    setPendingNodeId(null);
    if (final) {
      // The only place depth advances: a full segment, not each individual win.
      useGameStore.getState().advanceSegment();
      setRunState(null);
      setView('station');
    } else {
      setRunState({ ...runState, at: nodeId, cleared: [...runState.cleared, nodeId], playerHp: hpSnapshot });
      setView('map');
    }
  };

  const handleRetreat = (hpSnapshot) => {
    const nodeId = pendingNodeId;
    const closed = [...runState.closed, nodeId];
    const stillReachable = reachableNodeIds(runState.map, runState.at, closed);
    setPendingNodeId(null);
    if (stillReachable.length === 0) {
      // Dead end: every path from here is closed — the segment ends early,
      // banked rewards keep, depth does not advance.
      setRunState(null);
      setView('station');
    } else {
      setRunState({ ...runState, closed, playerHp: hpSnapshot });
      setView('map');
    }
  };

  const handleDefeat = () => {
    setPendingNodeId(null);
    setRunState(null);
    setView('station');
  };

  const handleDockFromMap = () => {
    if (window.confirm('Dock out? Banked ISK/SP/loot are kept, but the segment map is discarded and depth does not advance.')) {
      setRunState(null);
      setView('station');
    }
  };

  return (
    <div className="app-container">
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-panel)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <h2 style={{ color: 'var(--color-text-highlight)' }}>EVE: Rogue</h2>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem', alignItems: 'center' }}>
          <span>ISK: {isk.toLocaleString()}</span>
          <span>Location: {view === 'station' ? 'Station (High Sec)' : 'Abyssal Deadspace'}</span>
          {view === 'station' && (
            <button
              onClick={startRun}
              disabled={!activeShip}
              title={activeShip ? undefined : 'No active ship — buy or board one first'}
              style={{ borderColor: '#ff4a4a', color: '#ff4a4a', opacity: activeShip ? 1 : 0.4, cursor: activeShip ? 'pointer' : 'not-allowed' }}>
              UNDOCK
            </button>
          )}
          {view === 'map' && (
            <button onClick={handleDockFromMap}>ABORT & DOCK</button>
          )}
          {/* view === 'space': no zero-cost escape — retreat (ALIGN & WARP) is the only way out */}
        </div>
      </header>

      <main className="main-content" style={{ padding: view === 'space' ? 0 : '2rem' }}>
        {view === 'station' && <StationHub />}
        {view === 'map' && runState && (
          <MapScreen
            runState={runState}
            maxHp={maxHp}
            onSelectNode={handleSelectNode}
            onDismissNotice={() => setRunState({ ...runState, notice: null })}
            onDock={handleDockFromMap}
          />
        )}
        {view === 'space' && pendingNode && (
          <BattleScene
            encounter={pendingNode.type === 'wreck' ? pendingNode.ambush : pendingNode.encounter}
            nodeType={pendingNode.type === 'wreck' ? 'patrol' : pendingNode.type}
            depth={pendingNode.depth}
            initialHp={runState.playerHp}
            introLog={pendingNode.type === 'wreck' ? 'Ambush! Hostiles decloak among the wrecks.' : undefined}
            isFinalNode={isFinalNode}
            onVictory={handleVictory}
            onRetreat={handleRetreat}
            onDefeat={handleDefeat}
          />
        )}
      </main>
    </div>
  )
}

export default App
