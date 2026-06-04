using System.Collections.Generic;
using EveRogue.Data;

namespace EveRogue.Fitting
{
    public sealed class FittingStats
    {
        public float CpuUsed;
        public float CpuLimit;
        public float PowerGridUsed;
        public float PowerGridLimit;
        public float CargoUsed;
        public float CargoCapacity;
        public float ShieldHp;
        public float ArmorHp;
        public float HullHp;
        public ResistanceProfile Resists = new ResistanceProfile();
        public float MaxVelocity;
        public float LockRange;
        public float CapacitorCapacity;
        public float CapacitorRechargePerSecond;
        public float WeaponDps;
    }

    public sealed class FittingValidation
    {
        public bool IsLegal => Reasons.Count == 0;
        public List<string> Reasons { get; } = new List<string>();
        public FittingStats Stats { get; set; }
    }
}
