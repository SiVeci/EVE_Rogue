using System;
using System.Collections.Generic;
using EveRogue.Data;
using EveRogue.Loot;
using EveRogue.Save;

namespace EveRogue.Expedition
{
    [Serializable]
    public sealed class ExpeditionRunState
    {
        public string RunId;
        public int Seed;
        public int CurrentDepth;
        public string RiskedShipInstanceId;
        public ShipInstanceData PlayerShip;
        public ScanReportData ScanReport = new ScanReportData();
        public List<EventNodeState> Nodes = new List<EventNodeState>();
        public LootPoolData LootPool = new LootPoolData();
        public ExpeditionOutcome Outcome = ExpeditionOutcome.InProgress;
        public int CreditsEarned;
    }

    [Serializable]
    public sealed class ScanReportData
    {
        public int DangerLevel;
        public List<string> PossibleFactionIds = new List<string>();
        public List<DamageType> LikelyIncomingDamage = new List<DamageType>();
        public List<DamageType> LikelyEnemyWeakness = new List<DamageType>();
        public List<string> EnvironmentClueIds = new List<string>();
        public List<string> UnknownSignals = new List<string>();
    }

    [Serializable]
    public sealed class EventNodeState
    {
        public string NodeId;
        public EventType Type;
        public int Depth;
        public bool Revealed;
        public bool Completed;
        public string EventTemplateId;
        public int RewardMultiplier;
    }

    public sealed class EventResolution
    {
        public bool Completed;
        public bool EndsRun;
        public ExpeditionOutcome Outcome;
        public List<string> Messages = new List<string>();
    }
}
