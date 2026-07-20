import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHIPS } from '../data/ships';
import { MODULES } from '../data/modules';
import { AMMO, AMMO_LOT, STARTER_CARGO, AMMO_SAFETY_QTY, DEFAULT_AMMO } from '../data/ammo';
import { DRONES } from '../data/drones';
import { getEffectiveStats, skillMult } from '../lib/shipStats';
import { defaultAmmoIdFor } from '../lib/ammo';
import { droneBayUsed, canLoadDrone } from '../lib/drones';
import { meetsRequiredSkills, describeRequiredSkills } from '../data/skills';
import { SEGMENT_LAYERS } from '../lib/runmap';

export { skillMult };

const SAVE_KEY = 'eve-rogue-save';
const SAVE_VERSION = 3;

// activeShip.ammo is a parallel array to fittedModules.high (index-aligned):
// weapons get a family default, non-weapon high-slot modules get null.
// freshShip/fitModule/unfitModule/migrate/merge all maintain the invariant
// ammo.length === fittedModules.high.length.
// activeShip.drones (v0.12) is the loadout manifest — a droneId[] array,
// order = launch priority. It carries no ammo-style index alignment (it's
// not parallel to any fittedModules slot), just a flat manifest.
const freshShip = (shipId) => ({
  ...SHIPS[shipId],
  fittedModules: { high: [], mid: [], low: [] },
  ammo: [],
  drones: []
});

const cheapestShipPrice = () => Math.min(...Object.values(SHIPS).map((s) => s.price));

// Soft-lock clause extension (v0.11 FR-6): whenever the free-Incursus grant
// fires, cargo is topped up to at least AMMO_SAFETY_QTY of each family
// default — the freebie hull must be able to shoot with any surviving weapon.
const topUpAmmoSafety = (cargo) => {
  const next = { ...cargo };
  for (const ammoId of Object.values(DEFAULT_AMMO)) {
    next[ammoId] = Math.max(next[ammoId] ?? 0, AMMO_SAFETY_QTY);
  }
  return next;
};

// A ship's requiredSkills gates boarding, not ownership — EVE semantics:
// you can own a hull you can't yet fly.
const canBoard = (ship, skills) => meetsRequiredSkills(ship.requiredSkills, skills);

// Fresh-start player state; shared by store creation and resetProgress.
// Blueprints are static content (src/data/blueprints.js) and are never
// persisted or held in store state at all.
const initialState = () => ({
  isk: 50000,
  sp: 1500, // Skill Points
  skills: {
    // Stat skills: skillMult()'s baseline is level 1 (no bonus yet).
    engineering: 1, // Boosts PG/CPU
    gunnery: 1,     // Boosts damage
    navigation: 1,  // Boosts speed
    // Gate skills: never feed skillMult, only unlock hulls/modules via
    // requiredSkills — 0 (untrained) is the correct floor (see docs/balance.md).
    destroyers: 0,
    small_hybrid_turret: 0,
    missiles: 0,
    shield_operation: 0,
    repair_systems: 0,
    high_speed_maneuvering: 0,
    electronic_warfare: 0,
    drones: 0
  },
  // Stacked ammo cargo (v0.11) — separate from `inventory` (module inventory
  // is a per-item array; ammo is a { id: qty } stack). New saves and the
  // v2->v3 migration both grant STARTER_CARGO (FR-6: new pilots start armed).
  cargo: { ...STARTER_CARGO },
  // Station-side drone stock (v0.12), stacked-quantity like cargo but a
  // separate key: droneHangar survives ship loss (activeShip.drones does
  // not), and merge's per-key validation would silently wipe drone ids if
  // they shared cargo's AMMO-only check. Not gifted on a fresh save —
  // drones are a pure increment, no "must have to fight" pressure like ammo.
  droneHangar: {},
  inventory: [
    MODULES.light_electron_blaster_i,
    MODULES.light_electron_blaster_i,
    MODULES.rocket_launcher_i,
    MODULES.small_shield_booster_i,
    MODULES.small_armor_repairer_i,
    MODULES.mn1_afterburner_i,
    MODULES.stasis_webifier_i,
  ],

  // Progression
  deadspaceDepth: 1,

  // Hulls the player owns (ids; duplicates allowed) and the one currently boarded.
  // activeShip is null between losing a ship and boarding the next one.
  ownedShips: ['incursus'],
  activeShip: freshShip('incursus'),

  // One-time hull insurance policy: { shipId } | null. Bound to the boarded
  // hull — switching/losing it clears the policy (see switchShip/shipDestroyed).
  insurance: null
});

// The save file stores content ids, not objects, so balance changes in
// src/data/ apply to old saves. Ids no longer present in the data files
// are silently dropped on load.
const toIds = (modules) => modules.map((m) => m.id);
const fromIds = (ids) => (Array.isArray(ids) ? ids : []).map((id) => MODULES[id]).filter(Boolean);

export const useGameStore = create(persist((set) => ({
  ...initialState(),

  // Actions
  addIsk: (amount) => set(state => ({ isk: state.isk + amount })),
  addSp: (amount) => set(state => ({ sp: state.sp + amount })),
  // The only way depth advances (v0.9): a full segment (SEGMENT_LAYERS deep),
  // not each individual victory. Retreat dead-ends, ABORT & DOCK, and page
  // refresh all leave depth at the segment's start.
  advanceSegment: () => set(state => ({ deadspaceDepth: state.deadspaceDepth + SEGMENT_LAYERS })),
  // Combat loot (see src/lib/loot.js rollLoot) — a mixed-shape array: string
  // module ids route to inventory (unchanged since v0.6), { ammoId, qty }
  // objects (v0.11) route to cargo, { droneId, qty } objects (v0.12) route to
  // droneHangar. Unknown ids in any shape are silently dropped, same
  // tolerance fromIds already gives save-file rehydration.
  addLoot: (drops) => set(state => {
    const moduleIds = drops.filter((d) => typeof d === 'string');
    const ammoDrops = drops.filter((d) => d && typeof d === 'object' && d.ammoId);
    const droneDrops = drops.filter((d) => d && typeof d === 'object' && d.droneId);
    const cargo = { ...state.cargo };
    for (const { ammoId, qty } of ammoDrops) {
      if (!AMMO[ammoId]) continue;
      cargo[ammoId] = (cargo[ammoId] ?? 0) + qty;
    }
    const droneHangar = { ...state.droneHangar };
    for (const { droneId, qty } of droneDrops) {
      if (!DRONES[droneId]) continue;
      droneHangar[droneId] = (droneHangar[droneId] ?? 0) + qty;
    }
    return {
      inventory: [...state.inventory, ...fromIds(moduleIds)],
      cargo,
      droneHangar
    };
  }),
  trainSkill: (skillName, cost) => set(state => {
    if (state.sp >= cost) {
      return {
        sp: state.sp - cost,
        skills: { ...state.skills, [skillName]: state.skills[skillName] + 1 }
      };
    }
    return state;
  }),
  // Routes by product type: a MODULES id adds one unit to inventory
  // (unchanged since v0.3); an AMMO id (v0.11) adds `qty` rounds to cargo.
  manufacture: (blueprint) => set(state => {
    if (state.isk < blueprint.cost) return state;
    const moduleProduct = MODULES[blueprint.produces];
    if (moduleProduct) {
      return {
        isk: state.isk - blueprint.cost,
        inventory: [...state.inventory, moduleProduct]
      };
    }
    const ammoProduct = AMMO[blueprint.produces];
    if (ammoProduct) {
      return {
        isk: state.isk - blueprint.cost,
        cargo: { ...state.cargo, [blueprint.produces]: (state.cargo[blueprint.produces] ?? 0) + (blueprint.qty || 0) }
      };
    }
    return state;
  }),

  // Market: ammo (v0.11) — buy/sell in whole lots/stacks, mirroring
  // buyModule/sellModule's silent-failure pattern.
  buyAmmo: (ammoId) => set(state => {
    const ammo = AMMO[ammoId];
    if (!ammo) return state;
    const cost = ammo.price * AMMO_LOT;
    if (state.isk < cost) return state;
    return {
      isk: state.isk - cost,
      cargo: { ...state.cargo, [ammoId]: (state.cargo[ammoId] ?? 0) + AMMO_LOT }
    };
  }),
  // Sells the entire stack at once (50% of market price/round, same ratio as
  // sellModule). Zero-value keys are kept, not deleted (same convention
  // settleBattleAmmo uses).
  sellAmmo: (ammoId) => set(state => {
    const ammo = AMMO[ammoId];
    const qty = state.cargo[ammoId] ?? 0;
    if (!ammo || qty <= 0) return state;
    return {
      isk: state.isk + Math.round(qty * ammo.price * 0.5),
      cargo: { ...state.cargo, [ammoId]: 0 }
    };
  }),
  // FittingWindow's sole write path for a weapon's ammo assignment; also
  // reused by settleBattleAmmo to write back an in-battle reload.
  setWeaponAmmo: (highIndex, ammoId) => set(state => {
    if (!state.activeShip) return state;
    const module = state.activeShip.fittedModules.high[highIndex];
    const ammo = AMMO[ammoId];
    if (!module || !ammo || ammo.family !== module.ammoFamily) return state;
    const newAmmo = [...(state.activeShip.ammo || [])];
    newAmmo[highIndex] = ammoId;
    return { activeShip: { ...state.activeShip, ammo: newAmmo } };
  }),
  // Battle-end ammo settlement (v0.11): all three outcomes (victory/defeat/
  // retreat) call this on their confirm button, alongside addIsk/addSp/
  // addLoot — this is the one exception to v0.9's "retreat writes nothing to
  // the store" rule (scoped to ammo consumption only; bounty/SP/loot stay
  // forfeit on retreat). `consumed` decrements cargo (floored at 0, unknown
  // ids ignored); `assignments` (absent on defeat — a destroyed hull has
  // nothing to reassign) writes back any ammo the player switched to
  // mid-battle so the next node/session continues with it.
  settleBattleAmmo: ({ consumed, assignments }) => set(state => {
    const cargo = { ...state.cargo };
    if (consumed) {
      for (const [id, used] of Object.entries(consumed)) {
        cargo[id] = Math.max(0, (cargo[id] ?? 0) - used);
      }
    }
    let activeShip = state.activeShip;
    if (assignments && activeShip) {
      const ammo = [...(activeShip.ammo || [])];
      for (const [idxStr, ammoId] of Object.entries(assignments)) {
        const idx = Number(idxStr);
        const module = activeShip.fittedModules.high[idx];
        if (module && AMMO[ammoId] && AMMO[ammoId].family === module.ammoFamily) {
          ammo[idx] = ammoId;
        }
      }
      activeShip = { ...activeShip, ammo };
    }
    return { cargo, activeShip };
  }),

  // Drones (v0.12): per-unit market trade (unlike ammo's whole-lot trade —
  // a drone is bought/sold at module granularity), mirroring buyModule's/
  // sellModule's silent-failure pattern.
  buyDrone: (droneId) => set(state => {
    const drone = DRONES[droneId];
    if (!drone || state.isk < drone.price) return state;
    return {
      isk: state.isk - drone.price,
      droneHangar: { ...state.droneHangar, [droneId]: (state.droneHangar[droneId] ?? 0) + 1 }
    };
  }),
  sellDrone: (droneId) => set(state => {
    const drone = DRONES[droneId];
    const qty = state.droneHangar[droneId] ?? 0;
    if (!drone || qty <= 0) return state;
    return {
      isk: state.isk + Math.round(drone.price * 0.5),
      droneHangar: { ...state.droneHangar, [droneId]: qty - 1 }
    };
  }),
  // Hangar -> loadout manifest. Gated by both hangar stock and the bay's
  // volume budget (canLoadDrone); silently no-ops otherwise (buy*/loadDrone
  // family convention — no new alert paths this version).
  loadDrone: (droneId) => set(state => {
    if (!state.activeShip) return state;
    const qty = state.droneHangar[droneId] ?? 0;
    if (qty <= 0 || !DRONES[droneId]) return state;
    if (!canLoadDrone(state.activeShip, state.activeShip.drones, droneId)) return state;
    return {
      droneHangar: { ...state.droneHangar, [droneId]: qty - 1 },
      activeShip: { ...state.activeShip, drones: [...state.activeShip.drones, droneId] }
    };
  }),
  // Loadout manifest -> hangar, by manifest index (order matters: launch
  // priority is expressed by load order, so removal is index-addressed).
  unloadDrone: (index) => set(state => {
    if (!state.activeShip) return state;
    const droneId = state.activeShip.drones[index];
    if (!droneId) return state;
    const drones = [...state.activeShip.drones];
    drones.splice(index, 1);
    return {
      activeShip: { ...state.activeShip, drones },
      droneHangar: { ...state.droneHangar, [droneId]: (state.droneHangar[droneId] ?? 0) + 1 }
    };
  }),
  // Battle-end drone loss settlement (v0.12): victory/retreat confirm call
  // this with the ids of drones destroyed this fight — each is spliced out
  // of the manifest once (mirrors settleBattleAmmo's tolerance for unknown/
  // empty input). Defeat never calls this: the destroyed hull's entire
  // manifest is lost with it (shipDestroyed already discards activeShip),
  // and droneHangar (station stock) is untouched either way.
  settleBattleDrones: ({ lost }) => set(state => {
    if (!lost || !lost.length || !state.activeShip) return state;
    const drones = [...state.activeShip.drones];
    for (const droneId of lost) {
      const idx = drones.indexOf(droneId);
      if (idx > -1) drones.splice(idx, 1);
    }
    return { activeShip: { ...state.activeShip, drones } };
  }),

  // Market
  buyModule: (moduleId) => set(state => {
    const module = MODULES[moduleId];
    if (!module || state.isk < module.price) return state;
    return {
      isk: state.isk - module.price,
      inventory: [...state.inventory, module]
    };
  }),
  // Hangar modules sell back at 50% of market price
  sellModule: (index) => set(state => {
    const module = state.inventory[index];
    if (!module) return state;
    const newInventory = [...state.inventory];
    newInventory.splice(index, 1);
    return {
      isk: state.isk + Math.round(module.price * 0.5),
      inventory: newInventory
    };
  }),
  buyShip: (shipId) => set(state => {
    const ship = SHIPS[shipId];
    if (!ship || state.isk < ship.price) return state;
    return {
      isk: state.isk - ship.price,
      ownedShips: [...state.ownedShips, shipId],
      // Auto-board when podded and qualified to fly it — buying a hull you
      // can't board yet (e.g. a destroyer with no Destroyers skill) is legal,
      // it just doesn't seat you in it.
      ...(!state.activeShip && canBoard(ship, state.skills) ? { activeShip: freshShip(shipId) } : {})
    };
  }),
  // Board another owned hull; the current fit is stripped back to the hangar
  switchShip: (shipId) => set(state => {
    const ship = SHIPS[shipId];
    if (!ship || !state.ownedShips.includes(shipId)) return state;
    if (state.activeShip?.id === shipId) return state;
    if (!canBoard(ship, state.skills)) {
      alert(`${ship.name} requires ${describeRequiredSkills(ship.requiredSkills)} to board.`);
      return state;
    }
    const stripped = state.activeShip
      ? [
          ...state.activeShip.fittedModules.high,
          ...state.activeShip.fittedModules.mid,
          ...state.activeShip.fittedModules.low
        ]
      : [];
    // Drones strip back to the hangar by id count, same as fittings strip
    // back to inventory — the easiest v0.12 touchpoint to miss (skipping
    // this evaporates the manifest instead of banking it).
    const droneHangar = { ...state.droneHangar };
    for (const droneId of state.activeShip?.drones ?? []) {
      droneHangar[droneId] = (droneHangar[droneId] ?? 0) + 1;
    }
    return {
      // Boarding another hull voids any policy on the old one — no refund.
      inventory: [...state.inventory, ...stripped],
      activeShip: freshShip(shipId),
      insurance: null,
      droneHangar
    };
  }),

  // Ship blown up in deadspace: the hull and its fitted modules are lost,
  // the run resets to depth 1. Hangar inventory and ISK survive with the pod.
  // Insurance payout (if the lost hull was covered) lands first; the
  // free-Incursus soft-lock check is evaluated against the post-payout ISK.
  shipDestroyed: () => set(state => {
    const owned = [...state.ownedShips];
    if (state.activeShip) {
      const idx = owned.indexOf(state.activeShip.id);
      if (idx > -1) owned.splice(idx, 1);
    }
    const payout = (state.insurance && state.insurance.shipId === state.activeShip?.id)
      ? (SHIPS[state.insurance.shipId]?.price || 0)
      : 0;
    const isk = state.isk + payout;
    if (owned.length === 0 && isk < cheapestShipPrice()) {
      return {
        isk,
        deadspaceDepth: 1,
        ownedShips: ['incursus'],
        activeShip: freshShip('incursus'),
        insurance: null,
        cargo: topUpAmmoSafety(state.cargo)
      };
    }
    return {
      isk,
      deadspaceDepth: 1,
      ownedShips: owned,
      activeShip: null,
      insurance: null
    };
  }),
  // One-time policy on the boarded hull: premium = 30% of hull price, payout
  // = 100% on loss (fittings never covered). Podded / already-insured /
  // insufficient-ISK all silently no-op (mirrors buyModule/buyShip's pattern).
  buyInsurance: () => set(state => {
    if (!state.activeShip || state.insurance) return state;
    const premium = Math.round(SHIPS[state.activeShip.id].price * 0.3);
    if (state.isk < premium) return state;
    return { isk: state.isk - premium, insurance: { shipId: state.activeShip.id } };
  }),
  // Wipe the save and start over (station Reset Progress button).
  resetProgress: () => set(initialState()),
  fitModule: (module, targetSlot) => set((state) => {
    // Validate slot type
    if (!state.activeShip || module.slot !== targetSlot) return state;

    const ship = state.activeShip;
    // Check if there's an empty slot of this type
    if (ship.fittedModules[targetSlot].length >= ship.slots[targetSlot]) {
      return state; // No empty slots
    }

    if (module.maxPerShip) {
      const fittedCount = ship.fittedModules.high.concat(ship.fittedModules.mid, ship.fittedModules.low)
        .filter((m) => m.id === module.id).length;
      if (fittedCount >= module.maxPerShip) {
        alert(`Only ${module.maxPerShip} ${module.name} can be fitted per ship!`);
        return state;
      }
    }

    if (module.requiredSkills && !meetsRequiredSkills(module.requiredSkills, state.skills)) {
      alert(`${module.name} requires ${describeRequiredSkills(module.requiredSkills)}.`);
      return state;
    }

    // Candidate-inclusive: PG/CPU capacity itself can depend on the module
    // being fitted (e.g. a Co-Processor), so check with it already in place.
    const candidateFitted = {
      ...ship.fittedModules,
      [targetSlot]: [...ship.fittedModules[targetSlot], module]
    };
    const eff = getEffectiveStats(ship, candidateFitted, state.skills);
    if (eff.used.pg > eff.resources.pg || eff.used.cpu > eff.resources.cpu) {
      alert("Not enough Powergrid or CPU!");
      return state;
    }

    // Remove from inventory, add to ship
    const newInventory = [...state.inventory];
    const index = newInventory.findIndex(m => m.id === module.id);
    if (index > -1) newInventory.splice(index, 1);

    // High-slot fits keep `ammo` parallel to fittedModules.high: a weapon
    // gets its family default auto-assigned (v0.11 FR-6), a non-weapon
    // high-slot module gets null. Mid/low fits never touch `ammo`.
    const newAmmo = targetSlot === 'high'
      ? [...(ship.ammo || []), defaultAmmoIdFor(module)]
      : ship.ammo;

    return {
      inventory: newInventory,
      activeShip: { ...ship, fittedModules: candidateFitted, ammo: newAmmo }
    };
  }),

  unfitModule: (module, fromSlot, index) => set((state) => {
    if (!state.activeShip) return state;
    const ship = state.activeShip;
    const newFitted = [...ship.fittedModules[fromSlot]];
    newFitted.splice(index, 1);
    const candidateFitted = { ...ship.fittedModules, [fromSlot]: newFitted };

    // Removing a module can drop PG/CPU capacity below what's still used
    // (e.g. unfitting a Co-Processor while at capacity) — block that rather
    // than silently leaving the ship over-fit. Exception (v0.10 stacking
    // penalty): a legacy fit can already be over capacity (a penalized
    // Co-Processor's capacity boost shrinks below what an old save's fit
    // uses) — for those, unfitting is allowed as long as it doesn't worsen
    // the overage, since otherwise no module could ever be removed from it.
    const currentEff = getEffectiveStats(ship, ship.fittedModules, state.skills);
    const eff = getEffectiveStats(ship, candidateFitted, state.skills);
    const pgOverageNow = Math.max(0, currentEff.used.pg - currentEff.resources.pg);
    const cpuOverageNow = Math.max(0, currentEff.used.cpu - currentEff.resources.cpu);
    const pgOverageAfter = Math.max(0, eff.used.pg - eff.resources.pg);
    const cpuOverageAfter = Math.max(0, eff.used.cpu - eff.resources.cpu);
    if (pgOverageAfter > pgOverageNow || cpuOverageAfter > cpuOverageNow) {
      alert(`Cannot unfit ${module.name}: the remaining fit would exceed Powergrid/CPU capacity!`);
      return state;
    }

    // Keep `ammo` parallel to fittedModules.high (see fitModule above).
    const newAmmo = fromSlot === 'high'
      ? (() => { const a = [...(ship.ammo || [])]; a.splice(index, 1); return a; })()
      : ship.ammo;

    return {
      inventory: [...state.inventory, module],
      activeShip: { ...ship, fittedModules: candidateFitted, ammo: newAmmo }
    };
  })
}), {
  name: SAVE_KEY,
  version: SAVE_VERSION,
  // Custom storage instead of createJSONStorage: a corrupted (unparseable)
  // save must read as "no save" rather than throw during rehydration.
  storage: {
    getItem: (name) => {
      try {
        return JSON.parse(localStorage.getItem(name));
      } catch {
        console.warn('EVE Rogue: corrupted save discarded');
        return null;
      }
    },
    setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => localStorage.removeItem(name)
  },
  partialize: (state) => ({
    isk: state.isk,
    sp: state.sp,
    skills: state.skills,
    deadspaceDepth: state.deadspaceDepth,
    inventory: toIds(state.inventory),
    ownedShips: state.ownedShips,
    cargo: state.cargo,
    droneHangar: state.droneHangar,
    activeShip: state.activeShip
      ? {
          shipId: state.activeShip.id,
          fitted: {
            high: toIds(state.activeShip.fittedModules.high),
            mid: toIds(state.activeShip.fittedModules.mid),
            low: toIds(state.activeShip.fittedModules.low)
          },
          ammo: state.activeShip.ammo,
          drones: state.activeShip.drones
        }
      : null,
    insurance: state.insurance
  }),
  // Called on version mismatch only. Known older versions are upgraded;
  // anything else is discarded (merge then falls back to a fresh start).
  // v3 (v0.11): v1 and v2 both chain through the same ammo migration — a v2
  // save has no `cargo`/`ammo` fields at all (ammo didn't exist yet), so it
  // takes exactly the same gift + auto-assignment a v1 save gets after its
  // v1-specific ownedShips backfill.
  migrate: (persisted, version) => {
    if (version !== 1 && version !== 2) return undefined; // unknown version: discard
    const p = { ...persisted };
    if (version === 1) {
      // v1 saves always had an active ship and implicitly owned exactly that hull
      p.ownedShips = [p?.activeShip?.shipId ?? 'incursus'];
    }
    p.cargo = { ...STARTER_CARGO }; // FR-6: every pre-v3 save is gifted starter ammo
    if (p.activeShip) {
      p.activeShip = {
        ...p.activeShip,
        // Already-fitted weapons get auto-assigned their family default —
        // merge() re-validates this below, but computing it here means a
        // save that skips merge's fallback path still ends up armed.
        ammo: (p.activeShip.fitted?.high ?? []).map((id) => defaultAmmoIdFor(MODULES[id]))
      };
    }
    return p;
  },
  merge: (persisted, current) => {
    try {
      if (!persisted) return current;

      const ownedShips = (Array.isArray(persisted.ownedShips) ? persisted.ownedShips : [])
        .filter((id) => SHIPS[id]);
      const shipId = persisted.activeShip?.shipId;
      let activeShip = null;
      if (shipId && SHIPS[shipId]) {
        const rawHighIds = Array.isArray(persisted.activeShip?.fitted?.high) ? persisted.activeShip.fitted.high : [];
        const rawAmmo = Array.isArray(persisted.activeShip?.ammo) ? persisted.activeShip.ammo : null;
        // ammo is re-aligned by walking the ORIGINAL (unfiltered) high id
        // sequence in lockstep with the persisted ammo array: an unknown
        // module id is dropped together with its ammo entry, which is what
        // keeps this aligned with fromIds()'s own silent-drop below. A
        // surviving weapon's ammoId self-heals to its family default if it's
        // unknown or the wrong family; a missing `ammo` key entirely (a
        // hand-edited save) rebuilds the whole array from defaults.
        let ammo;
        if (rawAmmo) {
          ammo = [];
          for (let i = 0; i < rawHighIds.length; i++) {
            const module = MODULES[rawHighIds[i]];
            if (!module) continue;
            const assigned = rawAmmo[i];
            const valid = module.ammoFamily && assigned && AMMO[assigned] && AMMO[assigned].family === module.ammoFamily;
            ammo.push(valid ? assigned : defaultAmmoIdFor(module));
          }
        } else {
          ammo = fromIds(rawHighIds).map((m) => defaultAmmoIdFor(m));
        }

        // activeShip.drones (v0.12): unknown ids filtered out (fromIds'
        // silent-drop tolerance), then truncated from the tail against the
        // boarded hull's own drone_bay if a hand-edited save overloaded it —
        // same defensive shape as the cargo/ammo validation above.
        let drones = (Array.isArray(persisted.activeShip?.drones) ? persisted.activeShip.drones : [])
          .filter((id) => DRONES[id]);
        while (droneBayUsed(drones) > (SHIPS[shipId].drone_bay || 0)) drones.pop();

        activeShip = {
          ...SHIPS[shipId],
          fittedModules: {
            high: fromIds(persisted.activeShip?.fitted?.high),
            mid: fromIds(persisted.activeShip?.fitted?.mid),
            low: fromIds(persisted.activeShip?.fitted?.low)
          },
          ammo,
          drones
        };
        // The boarded hull is always an owned hull
        if (!ownedShips.includes(shipId)) ownedShips.push(shipId);
      }
      const isk = Number.isFinite(persisted.isk) ? persisted.isk : current.isk;

      // cargo (v0.11): per-key validation, unknown ammo ids silently
      // dropped (same tolerance fromIds already gives module ids); a
      // non-object cargo falls back to empty rather than the fresh-start
      // STARTER_CARGO (an intact save with a legitimately-empty cargo should
      // stay empty, not be re-gifted).
      const cargo = {};
      if (persisted.cargo && typeof persisted.cargo === 'object') {
        for (const [id, qty] of Object.entries(persisted.cargo)) {
          if (AMMO[id] && Number.isFinite(qty) && qty >= 0) cargo[id] = Math.floor(qty);
        }
      }

      // droneHangar (v0.12): same per-key validation shape as cargo, against
      // DRONES instead of AMMO — a separate stock, so it needs its own pass
      // rather than sharing cargo's AMMO-keyed check.
      const droneHangar = {};
      if (persisted.droneHangar && typeof persisted.droneHangar === 'object') {
        for (const [id, qty] of Object.entries(persisted.droneHangar)) {
          if (DRONES[id] && Number.isFinite(qty) && qty >= 0) droneHangar[id] = Math.floor(qty);
        }
      }

      // Same insurance clause as shipDestroyed: never load into a soft-lock.
      // The soft-lock clause extends to ammo (v0.11 FR-6): the free hull
      // must be able to shoot with whatever survived.
      let finalCargo = cargo;
      if (!activeShip && ownedShips.length === 0 && isk < cheapestShipPrice()) {
        ownedShips.push('incursus');
        activeShip = freshShip('incursus');
        finalCargo = topUpAmmoSafety(cargo);
      }

      // Insurance invariant (non-null => shipId === boarded hull): re-checked
      // here in case a hand-edited save breaks it. Unknown shipId, or a
      // shipId that no longer matches the boarded hull, both fall back to null.
      const insuredId = persisted.insurance?.shipId;
      const insurance = (insuredId && SHIPS[insuredId] && activeShip?.id === insuredId)
        ? { shipId: insuredId }
        : null;

      return {
        ...current,
        isk,
        sp: Number.isFinite(persisted.sp) ? persisted.sp : current.sp,
        // Shallow-merge over defaults so skills added in later versions
        // backfill to their default (1 for stat skills, 0 for gate skills —
        // see initialState above and docs/balance.md)
        skills: { ...current.skills, ...persisted.skills },
        deadspaceDepth: Number.isFinite(persisted.deadspaceDepth) ? persisted.deadspaceDepth : current.deadspaceDepth,
        inventory: fromIds(persisted.inventory),
        ownedShips,
        cargo: finalCargo,
        droneHangar,
        activeShip,
        insurance
      };
    } catch (err) {
      console.warn('EVE Rogue: unreadable save discarded', err);
      return current;
    }
  }
}));
