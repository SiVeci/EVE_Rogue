using System;
using System.Collections.Generic;
using EveRogue.Data;

namespace EveRogue.Combat
{
    public enum CombatResult
    {
        InProgress,
        PlayerDestroyed,
        EnemiesDestroyed,
        Extracted
    }

    public enum RangeIntent
    {
        Approach,
        KeepRange,
        Orbit,
        PullAway
    }

    [Serializable]
    public sealed class CombatState
    {
        public int Tick;
        public float TickDelta;
        public CombatEntityState Player;
        public List<CombatEntityState> Enemies = new List<CombatEntityState>();
        public CombatInputState PlayerInput = new CombatInputState();
        public CombatResult Result = CombatResult.InProgress;
    }

    [Serializable]
    public sealed class CombatInputState
    {
        public string TargetId;
        public RangeIntent RangeIntent = RangeIntent.KeepRange;
        public float DesiredRange = 20f;
        public List<string> ActiveModuleIds = new List<string>();
        public bool RequestExtraction;
    }

    [Serializable]
    public sealed class CombatEntityState
    {
        public string EntityId;
        public string DefinitionId;
        public bool IsPlayer;
        public float DistanceToPlayer;
        public float Velocity;
        public float ShieldHp;
        public float ArmorHp;
        public float HullHp;
        public CapacitorState Capacitor = new CapacitorState();
        public ResistanceProfile Resists = new ResistanceProfile();
        public List<CombatModuleState> Modules = new List<CombatModuleState>();
        public string CurrentTargetId;
        public float PreferredRange;

        public bool IsDestroyed => HullHp <= 0f;
    }

    [Serializable]
    public sealed class CapacitorState
    {
        public float Current;
        public float Capacity;
        public float RechargePerSecond;
    }

    [Serializable]
    public sealed class CombatModuleState
    {
        public string ModuleDefinitionId;
        public bool Active;
        public float CycleRemaining;
        public string LoadedAmmoDefinitionId;
    }
}
