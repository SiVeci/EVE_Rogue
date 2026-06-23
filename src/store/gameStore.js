import { create } from 'zustand';
import { SHIPS } from '../data/ships';
import { MODULES } from '../data/modules';

export const useGameStore = create((set, get) => ({
  // Player state
  isk: 50000,
  sp: 1500, // Skill Points
  skills: {
    engineering: 1, // Boosts PG/CPU
    gunnery: 1,     // Boosts damage
    navigation: 1   // Boosts speed
  },
  blueprints: [
    { id: 'bp_rocket', name: 'Rocket Launcher I Blueprint', produces: 'rocket_launcher_i', cost: 10000 },
    { id: 'bp_booster', name: 'Small Shield Booster I Blueprint', produces: 'small_shield_booster_i', cost: 15000 }
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

  // Current active ship
  activeShip: {
    ...SHIPS.incursus,
    fittedModules: {
      high: [],
      mid: [],
      low: []
    }
  },

  // Actions
  addIsk: (amount) => set(state => ({ isk: state.isk + amount })),
  advanceDepth: () => set(state => ({ deadspaceDepth: state.deadspaceDepth + 1 })),
  trainSkill: (skillName, cost) => set(state => {
    if (state.sp >= cost) {
      return { 
        sp: state.sp - cost, 
        skills: { ...state.skills, [skillName]: state.skills[skillName] + 1 }
      };
    }
    return state;
  }),
  fitModule: (module, targetSlot) => set((state) => {
    // Validate slot type
    if (module.slot !== targetSlot) return state;
    
    const ship = state.activeShip;
    // Check if there's an empty slot of this type
    if (ship.fittedModules[targetSlot].length >= ship.slots[targetSlot]) {
      return state; // No empty slots
    }

    // Check PG and CPU constraints (basic check without skills)
    const currentPG = ship.fittedModules.high.concat(ship.fittedModules.mid, ship.fittedModules.low)
      .reduce((acc, m) => acc + (m.cost.pg || 0), 0);
    const currentCPU = ship.fittedModules.high.concat(ship.fittedModules.mid, ship.fittedModules.low)
      .reduce((acc, m) => acc + (m.cost.cpu || 0), 0);

    if (currentPG + (module.cost.pg || 0) > ship.resources.pg || 
        currentCPU + (module.cost.cpu || 0) > ship.resources.cpu) {
      alert("Not enough Powergrid or CPU!");
      return state;
    }

    // Remove from inventory, add to ship
    const newInventory = [...state.inventory];
    const index = newInventory.findIndex(m => m.id === module.id);
    if (index > -1) newInventory.splice(index, 1);

    return {
      inventory: newInventory,
      activeShip: {
        ...ship,
        fittedModules: {
          ...ship.fittedModules,
          [targetSlot]: [...ship.fittedModules[targetSlot], module]
        }
      }
    };
  }),

  unfitModule: (module, fromSlot, index) => set((state) => {
    const ship = state.activeShip;
    const newFitted = [...ship.fittedModules[fromSlot]];
    newFitted.splice(index, 1);

    return {
      inventory: [...state.inventory, module],
      activeShip: {
        ...ship,
        fittedModules: {
          ...ship.fittedModules,
          [fromSlot]: newFitted
        }
      }
    };
  })
}));
