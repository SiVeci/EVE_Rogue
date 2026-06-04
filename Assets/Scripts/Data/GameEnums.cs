namespace EveRogue.Data
{
    public enum SlotType
    {
        High,
        Medium,
        Low,
        Rig
    }

    public enum DamageType
    {
        EM,
        Thermal,
        Kinetic,
        Explosive
    }

    public enum ModuleCategory
    {
        Weapon,
        ShieldBooster,
        ArmorRepairer,
        Resistance,
        Propulsion,
        Capacitor,
        ElectronicWarfare,
        DroneControl,
        Utility
    }

    public enum ModifierTarget
    {
        ShieldHp,
        ArmorHp,
        HullHp,
        MaxVelocity,
        LockRange,
        CapacitorCapacity,
        CapacitorRecharge,
        ResistanceEM,
        ResistanceThermal,
        ResistanceKinetic,
        ResistanceExplosive
    }

    public enum ModuleEffectType
    {
        WeaponDamage,
        ShieldBoost,
        ArmorRepair,
        CapacitorBoost,
        WebTarget
    }

    public enum EventType
    {
        Combat,
        Salvage,
        Elite,
        TemporaryStation,
        ExtractionWindow,
        Boss
    }

    public enum ExpeditionOutcome
    {
        InProgress,
        Extracted,
        ShipDestroyed,
        BossDefeated
    }
}
