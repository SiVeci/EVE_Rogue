import React from 'react';
import { SEGMENT_LAYERS, reachableNodeIds } from '../lib/runmap';
import { MODULES } from '../data/modules';
import { AMMO } from '../data/ammo';
import { DRONES } from '../data/drones';
import { TIER_COLORS } from '../lib/tiers';

// Weapon intel line shown on each node so the player can refit before diving.
// Takes a single formation member (v0.13) — internals unchanged.
const threatLabel = (member) => {
  const w = member.weapon;
  const range = w.type === 'hybrid_weapon'
    ? `Turrets · optimal ${(w.stats.optimal / 1000).toFixed(1)} km`
    : `Missiles · range ${(w.stats.range / 1000).toFixed(1)} km`;
  return member.ewar ? `${range} · Stasis Web` : range;
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
// this?" line shown on every combat node. Takes a single formation member
// (v0.13) — internals unchanged.
function FactionIntel({ member }) {
  return (
    <div style={{ marginTop: '0.2rem' }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', margin: 0 }}>{member.faction}</p>
      <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '2px' }}>
        {primaryDamageTypes(member.weapon.stats.damage).map((t) => (
          <span key={t} style={{
            color: DAMAGE_TYPE_COLORS[t], fontSize: '0.55rem',
            border: `1px solid ${DAMAGE_TYPE_COLORS[t]}`, borderRadius: '3px', padding: '0px 3px'
          }}>
            {DAMAGE_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  );
}

// Inline (non-boxed-row) damage badges for a multi-member compact line.
function DamageBadges({ member }) {
  return primaryDamageTypes(member.weapon.stats.damage).map((t) => (
    <span key={t} style={{
      color: DAMAGE_TYPE_COLORS[t], fontSize: '0.5rem',
      border: `1px solid ${DAMAGE_TYPE_COLORS[t]}`, borderRadius: '3px', padding: '0px 2px', marginLeft: '3px'
    }}>
      {DAMAGE_TYPE_LABELS[t]}
    </span>
  ));
}

// Layout constants shared by node cards and the SVG edge overlay so both are
// derived from the same numbers instead of measured from the DOM (keeps this
// component SSR-safe and testable from a plain fixture).
const COL_WIDTH = 200;
const COL_GAP = 40;
const ROW_HEIGHT = 132; // v0.13: raised from 120 so a 3-member intel card fits
const ROW_GAP = 24;
const MAX_ROWS = 3;
const MAP_WIDTH = SEGMENT_LAYERS * COL_WIDTH + (SEGMENT_LAYERS - 1) * COL_GAP;
const MAP_HEIGHT = MAX_ROWS * ROW_HEIGHT + (MAX_ROWS - 1) * ROW_GAP;

function nodeRect(layer, index, countInLayer) {
  const x = layer * (COL_WIDTH + COL_GAP);
  const rowSlot = (MAX_ROWS - countInLayer) / 2 + index;
  const y = rowSlot * (ROW_HEIGHT + ROW_GAP);
  return { x, y };
}

// Reconstructs which edges were actually traveled (cyan) or closed off by a
// retreat (dark red) from runState's flat history — there is no separate
// path log, but `cleared` is append-ordered and at most one node per layer
// is ever visited, so both can be derived unambiguously.
function computeEdgeStatus(map, runState) {
  const cleared = runState.cleared || [];
  const closed = runState.closed || [];
  const walked = new Set();
  for (let i = 0; i < cleared.length - 1; i++) walked.add(`${cleared[i]}->${cleared[i + 1]}`);

  const closedEdges = new Set();
  const byId = {};
  for (const nodes of map.layers) for (const n of nodes) byId[n.id] = n;
  for (const closedId of closed) {
    const target = byId[closedId];
    if (!target) continue;
    const parentLayer = map.layers[target.layer - 1] || [];
    const parent = parentLayer.find((p) => cleared.includes(p.id) && p.edges.includes(target.index));
    if (parent) closedEdges.add(`${parent.id}->${closedId}`);
  }
  return { walked, closedEdges };
}

function nodeStatus(node, runState, reachable) {
  if (runState.at === node.id) return 'current';
  if ((runState.closed || []).includes(node.id)) return 'closed';
  if ((runState.cleared || []).includes(node.id)) return 'cleared';
  if (reachable.has(node.id)) return 'reachable';
  return 'locked';
}

const TYPE_LABELS = { patrol: 'PATROL', elite: 'ELITE', repair: 'REPAIR ANCHOR', wreck: 'DEBRIS FIELD' };

function NodeCardBody({ node }) {
  if (node.type === 'repair') {
    return (
      <>
        <h4 style={{ color: '#4deeea', margin: '0.5rem 0 0.25rem', fontSize: '0.85rem' }}>{TYPE_LABELS.repair}</h4>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', margin: 0 }}>Hull &amp; armor restored</p>
      </>
    );
  }
  if (node.type === 'wreck') {
    return (
      <>
        <h4 style={{ color: '#e8a838', margin: '0.5rem 0 0.25rem', fontSize: '0.85rem' }}>{TYPE_LABELS.wreck}</h4>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', margin: 0 }}>Salvage · sensor ghosts</p>
      </>
    );
  }
  const enc = node.encounter;
  // Single-member node: the pre-v0.13 markup verbatim, fed members[0]
  // (zero visual regression for the whole d1–5 band).
  if (enc.members.length === 1) {
    const member = enc.members[0];
    return (
      <>
        <h4 style={{ color: node.type === 'elite' ? '#ff4a4a' : '#5a96ff', margin: '0.35rem 0 0.15rem', fontSize: '0.75rem' }}>
          {TYPE_LABELS[node.type]}
        </h4>
        <p style={{ color: '#fff', fontSize: '0.78rem', margin: 0 }}>{member.name}</p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.62rem', margin: '2px 0 0' }}>{threatLabel(member)}</p>
        <FactionIntel member={member} />
        <p style={{ color: 'var(--color-gallente)', fontSize: '0.68rem', margin: '2px 0 0' }}>Bounty: {enc.reward.toLocaleString()} ISK</p>
      </>
    );
  }
  // Multi-member formation (v0.13 FR-5): formation badge + one compact line
  // per member (name / faction / range summary / bounty / damage badges) +
  // a group-total bounty line — the avoid/refit decision is fully readable
  // before undocking.
  return (
    <>
      <h4 style={{ color: node.type === 'elite' ? '#ff4a4a' : '#5a96ff', margin: '0.3rem 0 0.1rem', fontSize: '0.72rem' }}>
        {TYPE_LABELS[node.type]} ×{enc.members.length}
      </h4>
      {enc.members.map((member, i) => (
        <div key={i} style={{ margin: '1px 0' }}>
          <p style={{ color: '#fff', fontSize: '0.68rem', margin: 0 }}>{member.name}</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.55rem', margin: 0 }}>
            {member.faction} · {threatLabel(member)} · {member.reward.toLocaleString()} ISK
            <DamageBadges member={member} />
          </p>
        </div>
      ))}
      <p style={{ color: 'var(--color-gallente)', fontSize: '0.65rem', margin: '2px 0 0' }}>Bounty: {enc.reward.toLocaleString()} ISK</p>
    </>
  );
}

function NodeCard({ node, status, onSelectNode }) {
  const clickable = status === 'reachable';
  const borderColor = status === 'current' ? '#4deeea'
    : status === 'closed' ? '#ff4a4a'
    : status === 'reachable' ? (node.type === 'elite' ? '#ff4a4a' : '#5a96ff')
    : 'rgba(255,255,255,0.15)';

  return (
    <div
      onClick={clickable ? () => onSelectNode(node.id) : undefined}
      data-node-id={node.id}
      data-node-status={status}
      style={{
        position: 'absolute',
        left: 0, top: 0,
        width: `${COL_WIDTH}px`, height: `${ROW_HEIGHT}px`,
        border: `2px ${node.type === 'elite' ? 'dashed' : 'solid'} ${borderColor}`,
        borderRadius: '8px',
        background: status === 'current' ? 'rgba(77,238,234,0.1)' : 'rgba(5,8,15,0.75)',
        opacity: status === 'locked' ? 0.35 : (status === 'cleared' || status === 'closed' ? 0.5 : 1),
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'center', padding: '0.4rem',
        boxSizing: 'border-box'
      }}>
      {status === 'cleared' && <span style={{ position: 'absolute', top: '2px', right: '6px', color: '#2cd67c', fontSize: '0.9rem' }}>✓</span>}
      {status === 'closed' && <span style={{ position: 'absolute', top: '2px', right: '6px', color: '#ff4a4a', fontSize: '0.9rem' }}>✕</span>}
      <NodeCardBody node={node} />
    </div>
  );
}

function EdgeLayer({ map, runState }) {
  const { walked, closedEdges } = computeEdgeStatus(map, runState);
  const lines = [];
  for (let l = 0; l < map.layers.length - 1; l++) {
    const A = map.layers[l];
    const B = map.layers[l + 1];
    for (const a of A) {
      const from = nodeRect(l, a.index, A.length);
      for (const j of a.edges) {
        const b = B[j];
        if (!b) continue;
        const to = nodeRect(l + 1, b.index, B.length);
        const key = `${a.id}->${b.id}`;
        const color = walked.has(key) ? '#4deeea' : closedEdges.has(key) ? '#5a1a1a' : 'rgba(255,255,255,0.15)';
        lines.push(
          <line
            key={key}
            x1={from.x + COL_WIDTH} y1={from.y + ROW_HEIGHT / 2}
            x2={to.x} y2={to.y + ROW_HEIGHT / 2}
            stroke={color} strokeWidth={walked.has(key) ? 3 : 2}
          />
        );
      }
    }
  }
  return (
    <svg width={MAP_WIDTH} height={MAP_HEIGHT} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
      {lines}
    </svg>
  );
}

function HpMiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div style={{ width: '90px' }}>
      <div style={{ color, fontSize: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span><span>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function NoticeOverlay({ notice, onDismissNotice }) {
  if (!notice) return null;
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15,12,4,0.95)', border: '1px solid #e8a838', padding: '2rem', borderRadius: '8px', zIndex: 100, textAlign: 'center', minWidth: '260px' }}>
      <h3 style={{ color: '#e8a838', marginBottom: '1rem' }}>DEBRIS FIELD SALVAGED</h3>
      <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        {notice.lootIds.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>Nothing of value.</p>
        ) : (
          notice.lootIds.map((drop, i) => {
            // v0.11: lootIds is a mixed array — string module ids (existing)
            // alongside { ammoId, qty } ammo bundles, and (v0.12) { droneId,
            // qty } bundles, either of which would otherwise render as a
            // bare object and crash here.
            if (typeof drop === 'string') {
              return (
                <p key={i} style={{ color: TIER_COLORS[MODULES[drop]?.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                  + {MODULES[drop]?.name || drop} <span style={{ opacity: 0.7 }}>({MODULES[drop]?.tier})</span>
                </p>
              );
            }
            if (drop.droneId) {
              const d = DRONES[drop.droneId];
              return (
                <p key={i} style={{ color: TIER_COLORS[d?.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                  + {d?.name ?? drop.droneId} ×{drop.qty} <span style={{ opacity: 0.7 }}>({d?.tier})</span>
                </p>
              );
            }
            const a = AMMO[drop.ammoId];
            return (
              <p key={i} style={{ color: TIER_COLORS[a?.tier] || '#fff', fontSize: '0.85rem', margin: '0.25rem 0' }}>
                + {a?.name ?? drop.ammoId} ×{drop.qty} <span style={{ opacity: 0.7 }}>({a?.tier})</span>
              </p>
            );
          })
        )}
      </div>
      <button onClick={onDismissNotice} style={{ padding: '0.6rem 1.5rem' }}>Continue</button>
    </div>
  );
}

export default function MapScreen({ runState, maxHp, onSelectNode, onDismissNotice, onDock }) {
  const { map } = runState;
  const reachable = new Set(reachableNodeIds(map, runState.at, runState.closed));
  const hp = runState.playerHp ?? maxHp;

  return (
    <div className="panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <h1 style={{ color: '#fff', fontSize: '1.6rem', marginBottom: '0.25rem' }}>Abyssal Deadspace</h1>
      <p style={{ color: '#ff4a4a', fontSize: '1rem', marginBottom: '0.5rem' }}>Depth {map.startDepth}–{map.startDepth + SEGMENT_LAYERS - 1}</p>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
        <HpMiniBar label="Shield" value={hp.shield} max={maxHp.shield} color="var(--color-shield)" />
        <HpMiniBar label="Armor" value={hp.armor} max={maxHp.armor} color="var(--color-armor)" />
        <HpMiniBar label="Structure" value={hp.hull} max={maxHp.hull} color="var(--color-hull)" />
      </div>

      <div style={{ position: 'relative', width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT + 40}px` }}>
        {/* Layer headers */}
        {map.layers.map((nodes, l) => (
          <div key={`header-${l}`} style={{
            position: 'absolute', left: `${l * (COL_WIDTH + COL_GAP)}px`, top: `-2rem`, width: `${COL_WIDTH}px`,
            textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.7rem', fontFamily: 'var(--font-display)'
          }}>
            LAYER {l + 1} · DEPTH {map.startDepth + l}
          </div>
        ))}

        <div style={{ position: 'absolute', left: 0, top: '40px', width: `${MAP_WIDTH}px`, height: `${MAP_HEIGHT}px` }}>
          <EdgeLayer map={map} runState={runState} />
          {map.layers.map((nodes, l) => nodes.map((node) => {
            const { x, y } = nodeRect(l, node.index, nodes.length);
            return (
              <div key={node.id} style={{ position: 'absolute', left: `${x}px`, top: `${y}px` }}>
                <NodeCard node={node} status={nodeStatus(node, runState, reachable)} onSelectNode={onSelectNode} />
              </div>
            );
          }))}
        </div>
      </div>

      <button onClick={onDock} style={{ marginTop: '2.5rem', padding: '0.85rem 2.5rem', fontSize: '1rem' }}>Return to Station</button>

      <NoticeOverlay notice={runState.notice} onDismissNotice={onDismissNotice} />
    </div>
  );
}
