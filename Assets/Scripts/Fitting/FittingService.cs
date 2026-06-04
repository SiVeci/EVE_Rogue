using System.Collections.Generic;
using System.Linq;
using EveRogue.Core;
using EveRogue.Data;
using EveRogue.Economy;
using EveRogue.Save;

namespace EveRogue.Fitting
{
    public sealed class FittingService
    {
        private readonly GameDatabase database;
        private readonly InventoryService inventory;

        public FittingService(GameDatabase database, InventoryService inventory)
        {
            this.database = database;
            this.inventory = inventory;
        }

        public Result InstallModule(PlayerSaveData save, ShipInstanceData ship, SlotType slotType, int index, string moduleId, string ammoId = null)
        {
            var module = database.Module(moduleId);
            if (module == null)
            {
                return Result.Fail($"Unknown module: {moduleId}");
            }

            if (module.SlotType != slotType)
            {
                return Result.Fail($"{module.DisplayName} cannot fit in {slotType} slot.");
            }

            if (inventory.GetQuantity(save, moduleId) <= 0)
            {
                return Result.Fail($"No {module.DisplayName} available in inventory.");
            }

            if (!string.IsNullOrEmpty(ammoId))
            {
                if (!module.AllowedAmmoIds.Contains(ammoId))
                {
                    return Result.Fail($"{module.DisplayName} cannot load ammo {ammoId}.");
                }

                if (inventory.GetQuantity(save, ammoId) <= 0)
                {
                    return Result.Fail($"No ammo {ammoId} available in inventory.");
                }
            }

            var slots = Slots(ship.Fitting, slotType);
            EnsureSlotCount(ship, slotType);
            if (index < 0 || index >= slots.Count)
            {
                return Result.Fail($"Slot index {index} is outside {slotType} slots.");
            }

            var existing = slots[index];
            if (existing != null && !string.IsNullOrEmpty(existing.ModuleDefinitionId))
            {
                inventory.AddItem(save, existing.ModuleDefinitionId, 1);
            }

            inventory.RemoveItem(save, moduleId, 1);
            slots[index] = new FittedModuleData { ModuleDefinitionId = moduleId, LoadedAmmoDefinitionId = ammoId, Online = true };
            return Result.Ok();
        }

        public Result UninstallModule(PlayerSaveData save, ShipInstanceData ship, SlotType slotType, int index)
        {
            EnsureSlotCount(ship, slotType);
            var slots = Slots(ship.Fitting, slotType);
            if (index < 0 || index >= slots.Count)
            {
                return Result.Fail($"Slot index {index} is outside {slotType} slots.");
            }

            var existing = slots[index];
            if (existing == null || string.IsNullOrEmpty(existing.ModuleDefinitionId))
            {
                return Result.Fail("Slot is empty.");
            }

            inventory.AddItem(save, existing.ModuleDefinitionId, 1);
            slots[index] = new FittedModuleData();
            return Result.Ok();
        }

        public Result AddCargoItem(PlayerSaveData save, ShipInstanceData ship, string itemId, int quantity)
        {
            if (inventory.GetQuantity(save, itemId) < quantity)
            {
                return Result.Fail($"Not enough {itemId} in inventory.");
            }

            var shipDefinition = database.Ship(ship.ShipDefinitionId);
            var newVolume = CalculateCargoVolume(ship) + inventory.GetItemVolume(itemId) * quantity;
            if (newVolume > shipDefinition.CargoCapacity)
            {
                return Result.Fail("Cargo capacity exceeded.");
            }

            inventory.RemoveItem(save, itemId, quantity);
            InventoryService.AddToList(ship.Cargo.Items, itemId, quantity);
            return Result.Ok();
        }

        public Result RemoveCargoItem(PlayerSaveData save, ShipInstanceData ship, string itemId, int quantity)
        {
            var stack = ship.Cargo.Items.FirstOrDefault(x => x.ItemDefinitionId == itemId);
            if (stack == null || stack.Quantity < quantity)
            {
                return Result.Fail($"Not enough cargo {itemId}.");
            }

            stack.Quantity -= quantity;
            if (stack.Quantity == 0)
            {
                ship.Cargo.Items.Remove(stack);
            }

            inventory.AddItem(save, itemId, quantity);
            return Result.Ok();
        }

        public FittingValidation Validate(ShipInstanceData ship)
        {
            EnsureAllSlotCounts(ship);
            var stats = CalculateStats(ship);
            var validation = new FittingValidation { Stats = stats };
            if (stats.CpuUsed > stats.CpuLimit)
            {
                validation.Reasons.Add($"CPU exceeded: {stats.CpuUsed:0.#}/{stats.CpuLimit:0.#}");
            }

            if (stats.PowerGridUsed > stats.PowerGridLimit)
            {
                validation.Reasons.Add($"Power grid exceeded: {stats.PowerGridUsed:0.#}/{stats.PowerGridLimit:0.#}");
            }

            if (stats.CargoUsed > stats.CargoCapacity)
            {
                validation.Reasons.Add($"Cargo exceeded: {stats.CargoUsed:0.#}/{stats.CargoCapacity:0.#}");
            }

            foreach (var fitted in AllFittedModules(ship).Where(x => x != null && !string.IsNullOrEmpty(x.ModuleDefinitionId)))
            {
                var module = database.Module(fitted.ModuleDefinitionId);
                if (module == null)
                {
                    validation.Reasons.Add($"Missing module definition: {fitted.ModuleDefinitionId}");
                }
                else if (!string.IsNullOrEmpty(fitted.LoadedAmmoDefinitionId) && !module.AllowedAmmoIds.Contains(fitted.LoadedAmmoDefinitionId))
                {
                    validation.Reasons.Add($"{module.DisplayName} has invalid ammo {fitted.LoadedAmmoDefinitionId}");
                }
            }

            return validation;
        }

        public FittingStats CalculateStats(ShipInstanceData ship)
        {
            EnsureAllSlotCounts(ship);
            var definition = database.Ship(ship.ShipDefinitionId);
            var stats = new FittingStats
            {
                CpuLimit = definition.Cpu,
                PowerGridLimit = definition.PowerGrid,
                CargoCapacity = definition.CargoCapacity,
                CargoUsed = CalculateCargoVolume(ship),
                ShieldHp = definition.ShieldHp,
                ArmorHp = definition.ArmorHp,
                HullHp = definition.HullHp,
                Resists = ResistanceProfile.Clone(definition.BaseResists),
                MaxVelocity = definition.MaxVelocity,
                LockRange = definition.LockRange,
                CapacitorCapacity = definition.Capacitor.Capacity,
                CapacitorRechargePerSecond = definition.Capacitor.RechargePerSecond
            };

            foreach (var fitted in AllFittedModules(ship))
            {
                if (fitted == null || !fitted.Online || string.IsNullOrEmpty(fitted.ModuleDefinitionId))
                {
                    continue;
                }

                var module = database.Module(fitted.ModuleDefinitionId);
                if (module == null)
                {
                    continue;
                }

                stats.CpuUsed += module.CpuNeed;
                stats.PowerGridUsed += module.PowerGridNeed;
                foreach (var modifier in module.PassiveModifiers)
                {
                    ApplyModifier(stats, modifier);
                }

                if (module.Category == ModuleCategory.Weapon)
                {
                    stats.WeaponDps += CalculateModuleDps(module, fitted.LoadedAmmoDefinitionId);
                }
            }

            ClampResists(stats.Resists);
            return stats;
        }

        public float CalculateCargoVolume(ShipInstanceData ship)
        {
            return ship.Cargo.Items.Sum(x => inventory.GetItemVolume(x.ItemDefinitionId) * x.Quantity);
        }

        private float CalculateModuleDps(ModuleDefinition module, string ammoId)
        {
            var cycle = module.CycleTime <= 0f ? 1f : module.CycleTime;
            var ammo = string.IsNullOrEmpty(ammoId) ? null : database.AmmoById(ammoId);
            if (ammo == null && module.AllowedAmmoIds.Count > 0)
            {
                ammo = database.AmmoById(module.AllowedAmmoIds[0]);
            }

            return (ammo?.Damage.Total ?? 0f) / cycle;
        }

        private static void ApplyModifier(FittingStats stats, StatModifier modifier)
        {
            float Apply(float value) => (value + modifier.Add) * (modifier.Multiply == 0f ? 1f : modifier.Multiply);
            switch (modifier.Target)
            {
                case ModifierTarget.ShieldHp:
                    stats.ShieldHp = Apply(stats.ShieldHp);
                    break;
                case ModifierTarget.ArmorHp:
                    stats.ArmorHp = Apply(stats.ArmorHp);
                    break;
                case ModifierTarget.HullHp:
                    stats.HullHp = Apply(stats.HullHp);
                    break;
                case ModifierTarget.MaxVelocity:
                    stats.MaxVelocity = Apply(stats.MaxVelocity);
                    break;
                case ModifierTarget.LockRange:
                    stats.LockRange = Apply(stats.LockRange);
                    break;
                case ModifierTarget.CapacitorCapacity:
                    stats.CapacitorCapacity = Apply(stats.CapacitorCapacity);
                    break;
                case ModifierTarget.CapacitorRecharge:
                    stats.CapacitorRechargePerSecond = Apply(stats.CapacitorRechargePerSecond);
                    break;
                case ModifierTarget.ResistanceEM:
                    stats.Resists.EM = Apply(stats.Resists.EM);
                    break;
                case ModifierTarget.ResistanceThermal:
                    stats.Resists.Thermal = Apply(stats.Resists.Thermal);
                    break;
                case ModifierTarget.ResistanceKinetic:
                    stats.Resists.Kinetic = Apply(stats.Resists.Kinetic);
                    break;
                case ModifierTarget.ResistanceExplosive:
                    stats.Resists.Explosive = Apply(stats.Resists.Explosive);
                    break;
            }
        }

        private static void ClampResists(ResistanceProfile resists)
        {
            resists.EM = Clamp(resists.EM, 0f, 0.9f);
            resists.Thermal = Clamp(resists.Thermal, 0f, 0.9f);
            resists.Kinetic = Clamp(resists.Kinetic, 0f, 0.9f);
            resists.Explosive = Clamp(resists.Explosive, 0f, 0.9f);
        }

        private static float Clamp(float value, float min, float max)
        {
            if (value < min)
            {
                return min;
            }

            return value > max ? max : value;
        }

        private IEnumerable<FittedModuleData> AllFittedModules(ShipInstanceData ship)
        {
            return ship.Fitting.HighSlots.Concat(ship.Fitting.MediumSlots).Concat(ship.Fitting.LowSlots).Concat(ship.Fitting.RigSlots);
        }

        private void EnsureAllSlotCounts(ShipInstanceData ship)
        {
            EnsureSlotCount(ship, SlotType.High);
            EnsureSlotCount(ship, SlotType.Medium);
            EnsureSlotCount(ship, SlotType.Low);
            EnsureSlotCount(ship, SlotType.Rig);
        }

        private void EnsureSlotCount(ShipInstanceData ship, SlotType slotType)
        {
            var definition = database.Ship(ship.ShipDefinitionId);
            var slots = Slots(ship.Fitting, slotType);
            var targetCount = slotType == SlotType.High ? definition.HighSlots :
                slotType == SlotType.Medium ? definition.MediumSlots :
                slotType == SlotType.Low ? definition.LowSlots : definition.RigSlots;
            while (slots.Count < targetCount)
            {
                slots.Add(new FittedModuleData());
            }
        }

        private static List<FittedModuleData> Slots(FittingData fitting, SlotType slotType)
        {
            return slotType == SlotType.High ? fitting.HighSlots :
                slotType == SlotType.Medium ? fitting.MediumSlots :
                slotType == SlotType.Low ? fitting.LowSlots : fitting.RigSlots;
        }
    }
}
