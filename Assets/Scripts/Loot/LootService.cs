using System.Collections.Generic;
using System.Linq;
using EveRogue.Core;
using EveRogue.Economy;
using EveRogue.Save;

namespace EveRogue.Loot
{
    public sealed class LootService
    {
        private readonly InventoryService inventory;
        private readonly AssetService assets;

        public LootService(InventoryService inventory, AssetService assets)
        {
            this.inventory = inventory;
            this.assets = assets;
        }

        public void AddLoot(LootPoolData pool, string itemId, int quantity, int rarityScore)
        {
            var existing = pool.Entries.FirstOrDefault(x => x.ItemDefinitionId == itemId);
            var volume = inventory.GetItemVolume(itemId) * quantity;
            if (existing == null)
            {
                pool.Entries.Add(new LootEntryData { ItemDefinitionId = itemId, Quantity = quantity, RarityScore = rarityScore, TotalVolume = volume });
            }
            else
            {
                existing.Quantity += quantity;
                existing.RarityScore += rarityScore;
                existing.TotalVolume += volume;
            }
        }

        public Result<List<LootEntryData>> SelectLoot(LootPoolData pool, IEnumerable<string> itemIds, LootSelectionRule rule)
        {
            var selected = new List<LootEntryData>();
            foreach (var id in itemIds)
            {
                var entry = pool.Entries.FirstOrDefault(x => x.ItemDefinitionId == id);
                if (entry == null)
                {
                    return Result<List<LootEntryData>>.Fail($"Loot entry not available: {id}");
                }

                selected.Add(new LootEntryData { ItemDefinitionId = entry.ItemDefinitionId, Quantity = entry.Quantity, RarityScore = entry.RarityScore, TotalVolume = entry.TotalVolume });
            }

            if (selected.Sum(x => x.TotalVolume) > rule.MaxVolume)
            {
                return Result<List<LootEntryData>>.Fail("Selected loot exceeds return capacity.");
            }

            if (rule.MaxRarityScore > 0 && selected.Sum(x => x.RarityScore) > rule.MaxRarityScore)
            {
                return Result<List<LootEntryData>>.Fail("Selected loot exceeds rarity allowance.");
            }

            return Result<List<LootEntryData>>.Ok(selected);
        }

        public SettlementResult SettleExtraction(PlayerSaveData save, ShipInstanceData riskedShip, LootPoolData pool, IEnumerable<string> selectedLootIds, LootSelectionRule rule, int creditsAwarded)
        {
            var result = new SettlementResult { ShipSurvived = true, CreditsAwarded = creditsAwarded };
            assets.AddCredits(save, creditsAwarded);
            var selected = SelectLoot(pool, selectedLootIds, rule);
            if (selected.Success)
            {
                foreach (var entry in selected.Value)
                {
                    inventory.AddItem(save, entry.ItemDefinitionId, entry.Quantity);
                    result.ReturnedItems.Add(new ItemStackData(entry.ItemDefinitionId, entry.Quantity));
                }
            }

            foreach (var cargo in riskedShip.Cargo.Items)
            {
                inventory.AddItem(save, cargo.ItemDefinitionId, cargo.Quantity);
                result.ReturnedItems.Add(new ItemStackData(cargo.ItemDefinitionId, cargo.Quantity));
            }

            riskedShip.Cargo.Items.Clear();
            return result;
        }

        public SettlementResult SettleDestruction(PlayerSaveData save, string riskedShipInstanceId, LootPoolData pool)
        {
            var result = new SettlementResult { ShipSurvived = false };
            foreach (var entry in pool.Entries)
            {
                result.LostItems.Add(new ItemStackData(entry.ItemDefinitionId, entry.Quantity));
            }

            assets.RemoveRiskedShip(save, riskedShipInstanceId);
            pool.Entries.Clear();
            return result;
        }
    }
}
