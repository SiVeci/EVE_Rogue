// Segment map generator (v0.9): a Slay the Spire-style branching graph for
// one deadspace dive. Pure function — the same rng-injection convention as
// rollEncounter, so a seed reproduces an identical map for tests.
//
// Roll order is a locked protocol (changing it changes every seeded test's
// output): per-layer node count -> per-layer node type -> distribution
// constraint fixes -> per-layer-pair edges -> per-node content (encounter /
// wreck loot+ambush).
import { rollEncounter, pickWeightedNpc } from '../data/npcs';
import { rollLoot } from './loot';

export const SEGMENT_LAYERS = 5;

const NODE_TYPE_WEIGHTS = [
  ['patrol', 0.55],
  ['elite', 0.15],
  ['wreck', 0.20],
  ['repair', 0.10]
];

function rollNodeType(rng) {
  const r = rng();
  let acc = 0;
  for (const [type, weight] of NODE_TYPE_WEIGHTS) {
    acc += weight;
    if (r < acc) return type;
  }
  return NODE_TYPE_WEIGHTS[NODE_TYPE_WEIGHTS.length - 1][0];
}

const rollNodeCount = (rng) => (rng() < 0.5 ? 2 : 3);

// Segment start + layer index is the one true depth anchor for every node —
// combat scaling, loot tier gates, and wreck NPC weighting all key off it.
export function generateRunMap(startDepth, rng = Math.random) {
  const counts = [];
  for (let layer = 0; layer < SEGMENT_LAYERS; layer++) counts.push(rollNodeCount(rng));

  const layers = counts.map((count, layer) => {
    const nodes = [];
    for (let index = 0; index < count; index++) {
      let type;
      if (layer === 0) type = 'patrol';
      else if (layer === SEGMENT_LAYERS - 1) type = 'elite';
      else type = rollNodeType(rng);
      nodes.push({ id: `l${layer}n${index}`, layer, index, type, depth: startDepth + layer, edges: [] });
    }
    return nodes;
  });

  // Distribution constraint fixes — only layers 2..(SEGMENT_LAYERS-1) (1-based
  // "L2-4") carry the risk/reward mix; first and last layer are fixed types.
  const middleLayerIdx = [];
  for (let l = 1; l < SEGMENT_LAYERS - 1; l++) middleLayerIdx.push(l);

  const middleNodes = middleLayerIdx.flatMap((l) => layers[l]);
  if (!middleNodes.some((n) => n.type === 'repair')) {
    // Force one into the last two middle layers (pre-final-decision pressure),
    // never displacing an elite slot.
    const targetLayers = middleLayerIdx.slice(-2);
    const candidates = targetLayers.flatMap((l) => layers[l]).filter((n) => n.type !== 'elite');
    if (candidates.length > 0) {
      candidates[Math.floor(rng() * candidates.length)].type = 'repair';
    }
  }

  // Per-layer cap: at most 1 repair; excess (by node order) downgrades to patrol.
  for (const l of middleLayerIdx) {
    const repairs = layers[l].filter((n) => n.type === 'repair');
    for (let i = 1; i < repairs.length; i++) repairs[i].type = 'patrol';
  }
  // Per-segment cap: at most 2 repairs total; excess (by layer then node order) downgrades.
  const allRepairs = middleLayerIdx.flatMap((l) => layers[l]).filter((n) => n.type === 'repair');
  for (let i = 2; i < allRepairs.length; i++) allRepairs[i].type = 'patrol';

  // Edges between each adjacent layer pair: basic coverage, gap-fill, then a
  // widening pass that never crosses an already-accepted edge.
  for (let l = 0; l < SEGMENT_LAYERS - 1; l++) {
    const A = layers[l];
    const B = layers[l + 1];
    const edgeSet = [];
    const hasEdge = (i, j) => edgeSet.some(([ei, ej]) => ei === i && ej === j);
    const crosses = (i, j) => edgeSet.some(([ei, ej]) => (ei - i) * (ej - j) < 0);
    const addEdge = (i, j) => { if (!hasEdge(i, j)) edgeSet.push([i, j]); };

    for (let i = 0; i < A.length; i++) {
      addEdge(i, Math.round((i * (B.length - 1)) / (A.length - 1)));
    }
    for (let j = 0; j < B.length; j++) {
      if (!edgeSet.some(([, ej]) => ej === j)) {
        addEdge(Math.round((j * (A.length - 1)) / (B.length - 1)), j);
      }
    }
    for (let i = 0; i < A.length; i++) {
      const jStar = Math.round((i * (B.length - 1)) / (A.length - 1));
      for (const offset of [1, -1]) {
        const j = jStar + offset;
        if (j < 0 || j >= B.length) continue;
        if (rng() < 0.5 && !crosses(i, j)) addEdge(i, j);
      }
    }

    for (const [i, j] of edgeSet) A[i].edges.push(j);
    for (const node of A) node.edges.sort((a, b) => a - b);
  }

  // Content: combat nodes pre-roll their encounter (what you scan is what you
  // fight); wreck nodes pre-roll their salvage pass and ambush chance.
  for (const nodes of layers) {
    for (const node of nodes) {
      if (node.type === 'patrol' || node.type === 'elite') {
        node.encounter = rollEncounter(node.depth, node.type, rng);
      } else if (node.type === 'wreck') {
        const npc = pickWeightedNpc(node.depth, rng);
        node.loot = rollLoot({ lootTable: npc.lootTable }, node.depth, 'patrol', rng);
        node.ambush = rng() < 0.25 ? rollEncounter(node.depth, 'patrol', rng) : null;
      }
    }
  }

  return { startDepth, layers };
}

// Node ids reachable from the current position, minus any closed (retreated
// from) nodes. atNodeId === null means the segment hasn't started: every
// first-layer node is selectable.
export function reachableNodeIds(map, atNodeId, closedIds = []) {
  if (atNodeId == null) return map.layers[0].map((n) => n.id);
  const node = map.layers.flat().find((n) => n.id === atNodeId);
  if (!node) return [];
  const nextLayer = map.layers[node.layer + 1] || [];
  return node.edges
    .map((j) => nextLayer[j]?.id)
    .filter((id) => id && !closedIds.includes(id));
}

export function isFinalLayer(map, nodeId) {
  const node = map.layers.flat().find((n) => n.id === nodeId);
  return !!node && node.layer === SEGMENT_LAYERS - 1;
}
