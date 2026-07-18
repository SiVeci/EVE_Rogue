// Blueprint Definitions (moved out of gameStore's initialState in v0.11 —
// blueprints are static content, same as ships/modules/ammo, and were never
// persisted; this is a zero-save-impact move that also paves the way for a
// future blueprint-drop mechanic, not implemented in this version).
//
// `manufacture(bp)` (gameStore.js) routes by `produces`: a MODULES id adds
// one unit to inventory (unchanged since v0.3); an AMMO id adds `qty` rounds
// to cargo (v0.11). Ammo batches are priced at exactly 75% of the market
// per-round price × qty — the same discount ratio the two original module
// blueprints already used.

export const BLUEPRINTS = [
  { id: 'bp_rocket', name: 'Rocket Launcher I Blueprint', produces: 'rocket_launcher_i', cost: 4500 },
  { id: 'bp_booster', name: 'Small Shield Booster I Blueprint', produces: 'small_shield_booster_i', cost: 6000 },

  // --- AMMO BLUEPRINTS (v0.11): 200 rounds/run, cost = 200 * price * 0.75 ---
  { id: 'bp_lead_charge_s', name: 'Lead Charge S Blueprint', produces: 'lead_charge_s', qty: 200, cost: 5250 },
  { id: 'bp_antimatter_charge_s', name: 'Antimatter Charge S Blueprint', produces: 'antimatter_charge_s', qty: 200, cost: 9000 },
  { id: 'bp_iridium_charge_s', name: 'Iridium Charge S Blueprint', produces: 'iridium_charge_s', qty: 200, cost: 6750 },
  { id: 'bp_mjolnir_rocket', name: 'Mjolnir Rocket Blueprint', produces: 'mjolnir_rocket', qty: 200, cost: 5250 },
  { id: 'bp_inferno_rocket', name: 'Inferno Rocket Blueprint', produces: 'inferno_rocket', qty: 200, cost: 5250 },
  { id: 'bp_scourge_rocket', name: 'Scourge Rocket Blueprint', produces: 'scourge_rocket', qty: 200, cost: 5250 },
  { id: 'bp_nova_rocket', name: 'Nova Rocket Blueprint', produces: 'nova_rocket', qty: 200, cost: 5250 },
  { id: 'bp_mjolnir_light_missile', name: 'Mjolnir Light Missile Blueprint', produces: 'mjolnir_light_missile', qty: 200, cost: 5250 },
  { id: 'bp_inferno_light_missile', name: 'Inferno Light Missile Blueprint', produces: 'inferno_light_missile', qty: 200, cost: 5250 },
  { id: 'bp_scourge_light_missile', name: 'Scourge Light Missile Blueprint', produces: 'scourge_light_missile', qty: 200, cost: 5250 },
  { id: 'bp_nova_light_missile', name: 'Nova Light Missile Blueprint', produces: 'nova_light_missile', qty: 200, cost: 5250 }
];
