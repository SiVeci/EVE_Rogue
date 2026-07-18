import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SHIPS } from '../data/ships';
import { MODULES } from '../data/modules';
import { getEffectiveStats, skillMult } from '../lib/shipStats';
import { meetsRequiredSkills, describeRequiredSkills } from '../data/skills';
import { SEGMENT_LAYERS } from '../lib/runmap';

export { skillMult };

const SAVE_KEY = 'eve-rogue-save';
const SAVE_VERSION = 2;

const freshShip = (shipId) => ({
  ...SHIPS[shipId],
  fittedModules: { high: [], mid: [], low: [] }
});

const cheapestShipPrice = () => Math.min(...Object.values(SHIPS).map((s) => s.price));

// A ship's requiredSkills gates boarding, not ownership — EVE semantics:
// you can own a hull you can't yet fly.
const canBoard = (ship, skills) => meetsRequiredSkills(ship.requiredSkills, skills);

// Fresh-start player state; shared by store creation and resetProgress.
// blueprints are static content for now and are intentionally not persisted.
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
    electronic_warfare: 0
  },
  // Manufacturing runs ~25% below market price to keep INDUSTRY relevant
  blueprints: [
    { id: 'bp_rocket', name: 'Rocket Launcher I Blueprint', produces: 'rocket_launcher_i', cost: 4500 },
    { id: 'bp_booster', name: 'Small Shield Booster I Blueprint', produces: 'small_shield_booster_i', cost: 6000 }
  ],
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
  // Combat loot (see src/lib/loot.js rollLoot) — unknown ids are silently
  // dropped, same tolerance fromIds already gives save-file rehydration.
  addLoot: (moduleIds) => set(state => ({ inventory: [...state.inventory, ...fromIds(moduleIds)] })),
  trainSkill: (skillName, cost) => set(state => {
    if (state.sp >= cost) {
      return {
        sp: state.sp - cost,
        skills: { ...state.skills, [skillName]: state.skills[skillName] + 1 }
      };
    }
    return state;
  }),
  manufacture: (blueprint) => set(state => {
    const product = MODULES[blueprint.produces];
    if (!product || state.isk < blueprint.cost) return state;
    return {
      isk: state.isk - blueprint.cost,
      inventory: [...state.inventory, product]
    };
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
    return {
      // Boarding another hull voids any policy on the old one — no refund.
      inventory: [...state.inventory, ...stripped],
      activeShip: freshShip(shipId),
      insurance: null
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
        insurance: null
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

    return {
      inventory: newInventory,
      activeShip: { ...ship, fittedModules: candidateFitted }
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

    return {
      inventory: [...state.inventory, module],
      activeShip: { ...ship, fittedModules: candidateFitted }
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
    activeShip: state.activeShip
      ? {
          shipId: state.activeShip.id,
          fitted: {
            high: toIds(state.activeShip.fittedModules.high),
            mid: toIds(state.activeShip.fittedModules.mid),
            low: toIds(state.activeShip.fittedModules.low)
          }
        }
      : null,
    insurance: state.insurance
  }),
  // Called on version mismatch only. Known older versions are upgraded;
  // anything else is discarded (merge then falls back to a fresh start).
  migrate: (persisted, version) => {
    if (version === 1) {
      // v1 saves always had an active ship and implicitly owned exactly that hull
      return { ...persisted, ownedShips: [persisted?.activeShip?.shipId ?? 'incursus'] };
    }
    return undefined;
  },
  merge: (persisted, current) => {
    try {
      if (!persisted) return current;

      const ownedShips = (Array.isArray(persisted.ownedShips) ? persisted.ownedShips : [])
        .filter((id) => SHIPS[id]);
      const shipId = persisted.activeShip?.shipId;
      let activeShip = null;
      if (shipId && SHIPS[shipId]) {
        activeShip = {
          ...SHIPS[shipId],
          fittedModules: {
            high: fromIds(persisted.activeShip?.fitted?.high),
            mid: fromIds(persisted.activeShip?.fitted?.mid),
            low: fromIds(persisted.activeShip?.fitted?.low)
          }
        };
        // The boarded hull is always an owned hull
        if (!ownedShips.includes(shipId)) ownedShips.push(shipId);
      }
      const isk = Number.isFinite(persisted.isk) ? persisted.isk : current.isk;
      // Same insurance clause as shipDestroyed: never load into a soft-lock
      if (!activeShip && ownedShips.length === 0 && isk < cheapestShipPrice()) {
        ownedShips.push('incursus');
        activeShip = freshShip('incursus');
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
        activeShip,
        insurance
      };
    } catch (err) {
      console.warn('EVE Rogue: unreadable save discarded', err);
      return current;
    }
  }
}));
