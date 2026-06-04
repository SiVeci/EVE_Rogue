using System;

namespace EveRogue.Data
{
    [Serializable]
    public sealed class DamageProfile
    {
        public float EM;
        public float Thermal;
        public float Kinetic;
        public float Explosive;

        public float Total => EM + Thermal + Kinetic + Explosive;

        public static DamageProfile Scale(DamageProfile source, float multiplier)
        {
            return new DamageProfile
            {
                EM = source.EM * multiplier,
                Thermal = source.Thermal * multiplier,
                Kinetic = source.Kinetic * multiplier,
                Explosive = source.Explosive * multiplier
            };
        }
    }

    [Serializable]
    public sealed class ResistanceProfile
    {
        public float EM;
        public float Thermal;
        public float Kinetic;
        public float Explosive;

        public static ResistanceProfile Clone(ResistanceProfile source)
        {
            return new ResistanceProfile
            {
                EM = source?.EM ?? 0f,
                Thermal = source?.Thermal ?? 0f,
                Kinetic = source?.Kinetic ?? 0f,
                Explosive = source?.Explosive ?? 0f
            };
        }

        public float Mitigate(DamageType type, float amount)
        {
            var resist = type == DamageType.EM ? EM :
                type == DamageType.Thermal ? Thermal :
                type == DamageType.Kinetic ? Kinetic : Explosive;
            return Math.Max(0f, amount * (1f - Clamp(resist, 0f, 0.9f)));
        }

        private static float Clamp(float value, float min, float max)
        {
            if (value < min)
            {
                return min;
            }

            return value > max ? max : value;
        }
    }

    [Serializable]
    public sealed class CapacitorProfile
    {
        public float Capacity;
        public float RechargePerSecond;
    }

    [Serializable]
    public sealed class StatModifier
    {
        public ModifierTarget Target;
        public float Add;
        public float Multiply = 1f;
    }

    [Serializable]
    public sealed class ModuleEffect
    {
        public ModuleEffectType Type;
        public DamageProfile Damage;
        public float Amount;
        public float OptimalRange;
        public float FalloffRange;
    }
}
