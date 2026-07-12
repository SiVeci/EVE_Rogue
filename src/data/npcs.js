// NPC Ship Definitions & Encounter Scaling

export const NPCS = {
  guristas_frigate: {
    id: 'guristas_frigate',
    name: 'Guristas Pirate',
    class: 'Frigate',
    defense: {
      shield: { hp: 220, em: 0, th: 20, kin: 40, exp: 50 },
      armor: { hp: 160, em: 50, th: 35, kin: 25, exp: 10 },
      hull: { hp: 200, em: 0, th: 0, kin: 0, exp: 0 },
      sig_radius: 40 // meters
    },
    mobility: {
      base_speed: 240, // m/s — slower than player frigates so brawlers can close in
      agility: 3.0
    },
    ai: {
      orbitRange: 2.5 // km, preferred engagement orbit
    },
    weapon: {
      name: 'Rocket Launcher',
      type: 'missile_weapon',
      stats: {
        range: 8500, // m
        rof: 3.0,
        damage: { em: 0, th: 0, kin: 12, exp: 0 }
      }
    },
    baseReward: 15000 // ISK
  }
};

// Builds the enemy for a given deadspace depth and map node type.
// Depth raises HP and damage; elite nodes are tougher but pay double.
export function getEncounter(depth, nodeType = 'patrol') {
  const npc = NPCS.guristas_frigate;
  const depthMult = 1 + 0.15 * (depth - 1);
  const statMult = depthMult * (nodeType === 'elite' ? 1.5 : 1);

  const scaleLayer = (layer) => ({ ...layer, hp: Math.round(layer.hp * statMult) });
  const scaleDamage = (damage) =>
    Object.fromEntries(Object.entries(damage).map(([type, val]) => [type, val * statMult]));

  return {
    ...npc,
    name: nodeType === 'elite' ? `Elite ${npc.name}` : npc.name,
    defense: {
      shield: scaleLayer(npc.defense.shield),
      armor: scaleLayer(npc.defense.armor),
      hull: scaleLayer(npc.defense.hull),
      sig_radius: npc.defense.sig_radius
    },
    weapon: {
      ...npc.weapon,
      stats: { ...npc.weapon.stats, damage: scaleDamage(npc.weapon.stats.damage) }
    },
    reward: Math.round(npc.baseReward * depthMult * (nodeType === 'elite' ? 2 : 1))
  };
}
