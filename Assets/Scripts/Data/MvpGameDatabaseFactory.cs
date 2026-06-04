using System.Collections.Generic;

namespace EveRogue.Data
{
    public static class MvpGameDatabaseFactory
    {
        public static GameDatabase Create()
        {
            var db = new GameDatabase();
            db.Ships.AddRange(CreateShips());
            db.Modules.AddRange(CreateModules());
            db.Ammo.AddRange(CreateAmmo());
            db.Drones.Add(new DroneDefinition
            {
                Id = "drone_light_scout",
                DisplayName = "Scout Drone",
                Volume = 5f,
                Price = 120,
                Damage = new DamageProfile { Kinetic = 8f, Thermal = 4f }
            });
            db.Factions.Add(new FactionDefinition
            {
                Id = "faction_raiders",
                DisplayName = "Ash Raiders",
                DamageTendencies = new List<DamageType> { DamageType.Thermal, DamageType.Explosive },
                ResistTendencies = new List<DamageType> { DamageType.Thermal }
            });
            db.Factions.Add(new FactionDefinition
            {
                Id = "faction_drones",
                DisplayName = "Broken Drones",
                DamageTendencies = new List<DamageType> { DamageType.EM, DamageType.Kinetic },
                ResistTendencies = new List<DamageType> { DamageType.Kinetic }
            });
            db.Enemies.AddRange(CreateEnemies());
            return db;
        }

        private static IEnumerable<ShipDefinition> CreateShips()
        {
            yield return new ShipDefinition
            {
                Id = "ship_light_missile_frigate",
                DisplayName = "Kestrel Wisp",
                Price = 1200,
                HighSlots = 3,
                MediumSlots = 3,
                LowSlots = 2,
                RigSlots = 2,
                Cpu = 175f,
                PowerGrid = 42f,
                CargoCapacity = 120f,
                DroneBayCapacity = 0f,
                MaxVelocity = 320f,
                LockRange = 42f,
                ShieldHp = 620f,
                ArmorHp = 360f,
                HullHp = 420f,
                BaseResists = new ResistanceProfile { EM = 0.2f, Thermal = 0.25f, Kinetic = 0.35f, Explosive = 0.45f },
                Capacitor = new CapacitorProfile { Capacity = 390f, RechargePerSecond = 7.5f }
            };
            yield return new ShipDefinition
            {
                Id = "ship_rail_control_frigate",
                DisplayName = "Rail Saker",
                Price = 1350,
                HighSlots = 3,
                MediumSlots = 2,
                LowSlots = 3,
                RigSlots = 2,
                Cpu = 160f,
                PowerGrid = 55f,
                CargoCapacity = 105f,
                DroneBayCapacity = 0f,
                MaxVelocity = 285f,
                LockRange = 52f,
                ShieldHp = 460f,
                ArmorHp = 520f,
                HullHp = 430f,
                BaseResists = new ResistanceProfile { EM = 0.3f, Thermal = 0.32f, Kinetic = 0.28f, Explosive = 0.2f },
                Capacitor = new CapacitorProfile { Capacity = 430f, RechargePerSecond = 8.5f }
            };
            yield return new ShipDefinition
            {
                Id = "ship_drone_brawler_frigate",
                DisplayName = "Drone Pike",
                Price = 1500,
                HighSlots = 2,
                MediumSlots = 3,
                LowSlots = 3,
                RigSlots = 2,
                Cpu = 185f,
                PowerGrid = 48f,
                CargoCapacity = 135f,
                DroneBayCapacity = 20f,
                MaxVelocity = 300f,
                LockRange = 38f,
                ShieldHp = 420f,
                ArmorHp = 620f,
                HullHp = 500f,
                BaseResists = new ResistanceProfile { EM = 0.35f, Thermal = 0.35f, Kinetic = 0.25f, Explosive = 0.25f },
                Capacitor = new CapacitorProfile { Capacity = 460f, RechargePerSecond = 8f }
            };
        }

        private static IEnumerable<AmmoDefinition> CreateAmmo()
        {
            yield return new AmmoDefinition { Id = "ammo_light_missile_em", DisplayName = "Needle EM Missile", StackSize = 100, VolumePerUnit = 0.03f, Price = 2, Damage = new DamageProfile { EM = 24f }, RangeModifier = 1f };
            yield return new AmmoDefinition { Id = "ammo_light_missile_kinetic", DisplayName = "Needle Kinetic Missile", StackSize = 100, VolumePerUnit = 0.03f, Price = 2, Damage = new DamageProfile { Kinetic = 24f }, RangeModifier = 1f };
            yield return new AmmoDefinition { Id = "ammo_rail_thermal", DisplayName = "Thermal Rail Charge", StackSize = 100, VolumePerUnit = 0.02f, Price = 2, Damage = new DamageProfile { Thermal = 18f, Kinetic = 8f }, RangeModifier = 1.2f };
            yield return new AmmoDefinition { Id = "ammo_autocannon_explosive", DisplayName = "Scatter Shell", StackSize = 100, VolumePerUnit = 0.02f, Price = 2, Damage = new DamageProfile { Explosive = 18f, Kinetic = 6f }, RangeModifier = 0.8f };
        }

        private static IEnumerable<ModuleDefinition> CreateModules()
        {
            yield return Weapon("module_light_missile_launcher", "Light Missile Launcher", 280, 18f, 7f, 4f, 2.8f, 42f, "ammo_light_missile_em", "ammo_light_missile_kinetic");
            yield return Weapon("module_railgun", "Compact Railgun", 260, 20f, 12f, 4f, 2.4f, 36f, "ammo_rail_thermal");
            yield return Weapon("module_autocannon", "Close Autocannon", 230, 14f, 9f, 4f, 1.8f, 18f, "ammo_autocannon_explosive");
            yield return Active("module_shield_booster", "Small Shield Booster", ModuleCategory.ShieldBooster, SlotType.Medium, 320, 22f, 4f, 6f, 3f, 28f, new ModuleEffect { Type = ModuleEffectType.ShieldBoost, Amount = 75f });
            yield return Active("module_armor_repairer", "Small Armor Repairer", ModuleCategory.ArmorRepairer, SlotType.Low, 320, 18f, 8f, 6f, 4f, 30f, new ModuleEffect { Type = ModuleEffectType.ArmorRepair, Amount = 85f });
            yield return Passive("module_em_hardener", "EM Ward Plating", ModuleCategory.Resistance, SlotType.Low, 180, 10f, 1f, 4f, new StatModifier { Target = ModifierTarget.ResistanceEM, Add = 0.18f });
            yield return Passive("module_thermal_hardener", "Thermal Ward Plating", ModuleCategory.Resistance, SlotType.Low, 180, 10f, 1f, 4f, new StatModifier { Target = ModifierTarget.ResistanceThermal, Add = 0.18f });
            yield return Passive("module_kinetic_hardener", "Kinetic Ward Plating", ModuleCategory.Resistance, SlotType.Low, 180, 10f, 1f, 4f, new StatModifier { Target = ModifierTarget.ResistanceKinetic, Add = 0.18f });
            yield return Passive("module_explosive_hardener", "Explosive Ward Plating", ModuleCategory.Resistance, SlotType.Low, 180, 10f, 1f, 4f, new StatModifier { Target = ModifierTarget.ResistanceExplosive, Add = 0.18f });
            yield return Passive("module_afterburner", "Afterburner", ModuleCategory.Propulsion, SlotType.Medium, 240, 16f, 6f, 5f, new StatModifier { Target = ModifierTarget.MaxVelocity, Multiply = 1.35f });
            yield return Passive("module_cap_battery", "Cap Battery", ModuleCategory.Capacitor, SlotType.Medium, 220, 18f, 4f, 5f, new StatModifier { Target = ModifierTarget.CapacitorCapacity, Add = 90f });
            yield return Passive("module_sensor_booster", "Sensor Booster", ModuleCategory.ElectronicWarfare, SlotType.Medium, 200, 14f, 3f, 5f, new StatModifier { Target = ModifierTarget.LockRange, Add = 12f });
            yield return Passive("module_damage_control", "Damage Control", ModuleCategory.Resistance, SlotType.Low, 260, 12f, 2f, 5f, new StatModifier { Target = ModifierTarget.HullHp, Multiply = 1.2f }, new StatModifier { Target = ModifierTarget.ResistanceExplosive, Add = 0.08f });
            yield return Passive("module_shield_extender", "Shield Extender", ModuleCategory.Utility, SlotType.Medium, 240, 18f, 8f, 6f, new StatModifier { Target = ModifierTarget.ShieldHp, Add = 160f });
            yield return Passive("module_armor_plate", "Armor Plate", ModuleCategory.Utility, SlotType.Low, 240, 10f, 10f, 6f, new StatModifier { Target = ModifierTarget.ArmorHp, Add = 170f }, new StatModifier { Target = ModifierTarget.MaxVelocity, Multiply = 0.92f });
            yield return Passive("module_rig_em_screen", "EM Screen Rig", ModuleCategory.Resistance, SlotType.Rig, 360, 5f, 0f, 0f, new StatModifier { Target = ModifierTarget.ResistanceEM, Add = 0.12f });
            yield return Passive("module_rig_warhead", "Warhead Rig", ModuleCategory.Weapon, SlotType.Rig, 380, 5f, 0f, 0f, new StatModifier { Target = ModifierTarget.LockRange, Add = 4f });
            yield return Passive("module_rig_cap_relay", "Cap Relay Rig", ModuleCategory.Capacitor, SlotType.Rig, 360, 5f, 0f, 0f, new StatModifier { Target = ModifierTarget.CapacitorRecharge, Add = 2f });
            yield return Active("module_stasis_web", "Stasis Web", ModuleCategory.ElectronicWarfare, SlotType.Medium, 260, 12f, 2f, 5f, 4f, 18f, new ModuleEffect { Type = ModuleEffectType.WebTarget, Amount = 0.25f, OptimalRange = 16f });
            yield return Passive("module_drone_link", "Drone Link", ModuleCategory.DroneControl, SlotType.High, 260, 22f, 3f, 5f, new StatModifier { Target = ModifierTarget.LockRange, Add = 6f });
        }

        private static ModuleDefinition Weapon(string id, string name, int price, float cpu, float grid, float volume, float cycle, float range, params string[] ammo)
        {
            return new ModuleDefinition
            {
                Id = id,
                DisplayName = name,
                Category = ModuleCategory.Weapon,
                SlotType = SlotType.High,
                Price = price,
                Volume = volume,
                CpuNeed = cpu,
                PowerGridNeed = grid,
                IsActive = true,
                CycleTime = cycle,
                CapacitorCost = 0f,
                AllowedAmmoIds = new List<string>(ammo),
                ActiveEffects = new List<ModuleEffect> { new ModuleEffect { Type = ModuleEffectType.WeaponDamage, OptimalRange = range, FalloffRange = range * 0.35f } }
            };
        }

        private static ModuleDefinition Passive(string id, string name, ModuleCategory category, SlotType slot, int price, float cpu, float grid, float volume, params StatModifier[] modifiers)
        {
            return new ModuleDefinition { Id = id, DisplayName = name, Category = category, SlotType = slot, Price = price, CpuNeed = cpu, PowerGridNeed = grid, Volume = volume, PassiveModifiers = new List<StatModifier>(modifiers) };
        }

        private static ModuleDefinition Active(string id, string name, ModuleCategory category, SlotType slot, int price, float cpu, float grid, float volume, float cycle, float capCost, ModuleEffect effect)
        {
            return new ModuleDefinition { Id = id, DisplayName = name, Category = category, SlotType = slot, Price = price, CpuNeed = cpu, PowerGridNeed = grid, Volume = volume, IsActive = true, CycleTime = cycle, CapacitorCost = capCost, ActiveEffects = new List<ModuleEffect> { effect } };
        }

        private static IEnumerable<EnemyDefinition> CreateEnemies()
        {
            yield return new EnemyDefinition { Id = "enemy_raider_scout", DisplayName = "Raider Scout", FactionId = "faction_raiders", ShieldHp = 180f, ArmorHp = 180f, HullHp = 120f, Velocity = 260f, PreferredRange = 18f, WeaponCycleTime = 2.7f, WeaponRange = 24f, Damage = new DamageProfile { Thermal = 14f, Explosive = 10f }, Resists = new ResistanceProfile { Thermal = 0.25f, Explosive = 0.15f } };
            yield return new EnemyDefinition { Id = "enemy_raider_elite", DisplayName = "Raider Elite", FactionId = "faction_raiders", ShieldHp = 320f, ArmorHp = 420f, HullHp = 260f, Velocity = 240f, PreferredRange = 22f, WeaponCycleTime = 2.4f, WeaponRange = 30f, Damage = new DamageProfile { Thermal = 22f, Explosive = 18f }, Resists = new ResistanceProfile { Thermal = 0.35f, Explosive = 0.25f } };
            yield return new EnemyDefinition { Id = "enemy_drone_skirmisher", DisplayName = "Drone Skirmisher", FactionId = "faction_drones", ShieldHp = 240f, ArmorHp = 150f, HullHp = 170f, Velocity = 300f, PreferredRange = 16f, WeaponCycleTime = 2.2f, WeaponRange = 22f, Damage = new DamageProfile { EM = 15f, Kinetic = 12f }, Resists = new ResistanceProfile { Kinetic = 0.3f, EM = 0.1f } };
            yield return new EnemyDefinition { Id = "enemy_drone_boss", DisplayName = "Overseer Core", FactionId = "faction_drones", ShieldHp = 700f, ArmorHp = 520f, HullHp = 460f, Velocity = 180f, PreferredRange = 28f, WeaponCycleTime = 2.8f, WeaponRange = 36f, Damage = new DamageProfile { EM = 32f, Kinetic = 24f }, Resists = new ResistanceProfile { Kinetic = 0.4f, EM = 0.25f, Thermal = 0.15f } };
        }
    }
}
