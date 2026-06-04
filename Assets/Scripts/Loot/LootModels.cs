using System;
using System.Collections.Generic;
using EveRogue.Save;

namespace EveRogue.Loot
{
    [Serializable]
    public sealed class LootPoolData
    {
        public List<LootEntryData> Entries = new List<LootEntryData>();
    }

    [Serializable]
    public sealed class LootEntryData
    {
        public string ItemDefinitionId;
        public int Quantity;
        public int RarityScore;
        public float TotalVolume;
    }

    public sealed class LootSelectionRule
    {
        public float MaxVolume;
        public int MaxRarityScore;
    }

    public sealed class SettlementResult
    {
        public bool ShipSurvived;
        public int CreditsAwarded;
        public List<ItemStackData> ReturnedItems = new List<ItemStackData>();
        public List<ItemStackData> LostItems = new List<ItemStackData>();
    }
}
