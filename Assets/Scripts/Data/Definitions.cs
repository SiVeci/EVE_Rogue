using System;
using System.Collections.Generic;

namespace EveRogue.Data
{
    [Serializable]
    public sealed class ShipDefinition
    {
        public string Id;
        public string DisplayName;
        public int Price;
        public int HighSlots;
        public int MediumSlots;
        public int LowSlots;
        public int RigSlots;
        public float Cpu;
        public float PowerGrid;
        public float CargoCapacity;
        public float DroneBayCapacity;
        public float MaxVelocity;
        public float LockRange;
        public float ShieldHp;
        public float ArmorHp;
        public float HullHp;
        public ResistanceProfile BaseResists = new ResistanceProfile();
        public CapacitorProfile Capacitor = new CapacitorProfile();
    }

    [Serializable]
    public sealed class ModuleDefinition
    {
        public string Id;
        public string DisplayName;
        public ModuleCategory Category;
        public SlotType SlotType;
        public int Price;
        public float Volume;
        public float CpuNeed;
        public float PowerGridNeed;
        public bool IsActive;
        public float CycleTime;
        public float CapacitorCost;
        public List<StatModifier> PassiveModifiers = new List<StatModifier>();
        public List<ModuleEffect> ActiveEffects = new List<ModuleEffect>();
        public List<string> AllowedAmmoIds = new List<string>();
    }

    [Serializable]
    public sealed class AmmoDefinition
    {
        public string Id;
        public string DisplayName;
        public int StackSize;
        public float VolumePerUnit;
        public DamageProfile Damage = new DamageProfile();
        public float RangeModifier = 1f;
        public float TrackingModifier = 1f;
        public int Price;
    }

    [Serializable]
    public sealed class DroneDefinition
    {
        public string Id;
        public string DisplayName;
        public float Volume;
        public DamageProfile Damage = new DamageProfile();
        public int Price;
    }

    [Serializable]
    public sealed class EnemyDefinition
    {
        public string Id;
        public string DisplayName;
        public string FactionId;
        public float ShieldHp;
        public float ArmorHp;
        public float HullHp;
        public float Velocity;
        public float PreferredRange;
        public DamageProfile Damage = new DamageProfile();
        public ResistanceProfile Resists = new ResistanceProfile();
        public float WeaponCycleTime;
        public float WeaponRange;
    }

    [Serializable]
    public sealed class FactionDefinition
    {
        public string Id;
        public string DisplayName;
        public List<DamageType> DamageTendencies = new List<DamageType>();
        public List<DamageType> ResistTendencies = new List<DamageType>();
    }
}
