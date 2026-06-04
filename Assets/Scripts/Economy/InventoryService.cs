using System;
using System.Linq;
using EveRogue.Core;
using EveRogue.Data;
using EveRogue.Save;

namespace EveRogue.Economy
{
    public sealed class InventoryService
    {
        private readonly GameDatabase database;

        public InventoryService(GameDatabase database)
        {
            this.database = database;
        }

        public int GetQuantity(PlayerSaveData save, string itemId)
        {
            return save.Inventory.FirstOrDefault(x => x.ItemDefinitionId == itemId)?.Quantity ?? 0;
        }

        public Result AddItem(PlayerSaveData save, string itemId, int quantity)
        {
            if (quantity <= 0)
            {
                return Result.Fail("Quantity must be positive.");
            }

            if (!IsKnownItem(itemId))
            {
                return Result.Fail($"Unknown item id: {itemId}");
            }

            AddToList(save.Inventory, itemId, quantity);
            return Result.Ok();
        }

        public Result RemoveItem(PlayerSaveData save, string itemId, int quantity)
        {
            if (quantity <= 0)
            {
                return Result.Fail("Quantity must be positive.");
            }

            var stack = save.Inventory.FirstOrDefault(x => x.ItemDefinitionId == itemId);
            if (stack == null || stack.Quantity < quantity)
            {
                return Result.Fail($"Not enough {itemId}.");
            }

            stack.Quantity -= quantity;
            if (stack.Quantity == 0)
            {
                save.Inventory.Remove(stack);
            }

            return Result.Ok();
        }

        public static void AddToList(System.Collections.Generic.List<ItemStackData> stacks, string itemId, int quantity)
        {
            var stack = stacks.FirstOrDefault(x => x.ItemDefinitionId == itemId);
            if (stack == null)
            {
                stacks.Add(new ItemStackData(itemId, quantity));
            }
            else
            {
                stack.Quantity += quantity;
            }
        }

        public bool IsKnownItem(string itemId)
        {
            return database.Module(itemId) != null || database.AmmoById(itemId) != null || database.Drones.Any(x => x.Id == itemId);
        }

        public float GetItemVolume(string itemId)
        {
            var module = database.Module(itemId);
            if (module != null)
            {
                return module.Volume;
            }

            var ammo = database.AmmoById(itemId);
            if (ammo != null)
            {
                return ammo.VolumePerUnit;
            }

            var drone = database.Drones.FirstOrDefault(x => x.Id == itemId);
            if (drone != null)
            {
                return drone.Volume;
            }

            throw new InvalidOperationException($"Unknown item id: {itemId}");
        }

        public int GetItemPrice(string itemId)
        {
            var module = database.Module(itemId);
            if (module != null)
            {
                return module.Price;
            }

            var ammo = database.AmmoById(itemId);
            if (ammo != null)
            {
                return ammo.Price;
            }

            var drone = database.Drones.FirstOrDefault(x => x.Id == itemId);
            if (drone != null)
            {
                return drone.Price;
            }

            var ship = database.Ship(itemId);
            if (ship != null)
            {
                return ship.Price;
            }

            throw new InvalidOperationException($"Unknown market item id: {itemId}");
        }
    }
}
