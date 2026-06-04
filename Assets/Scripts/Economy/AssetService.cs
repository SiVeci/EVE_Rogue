using System;
using System.Linq;
using EveRogue.Core;
using EveRogue.Data;
using EveRogue.Save;

namespace EveRogue.Economy
{
    public sealed class AssetService
    {
        private readonly GameDatabase database;
        private readonly InventoryService inventory;

        public AssetService(GameDatabase database, InventoryService inventory)
        {
            this.database = database;
            this.inventory = inventory;
        }

        public PlayerSaveData CreateNewSave()
        {
            var save = new PlayerSaveData { Version = 1, Credits = 2500 };
            var starter = CreateShipInstance("ship_light_missile_frigate");
            save.Ships.Add(starter);
            save.SelectedShipInstanceId = starter.InstanceId;
            inventory.AddItem(save, "module_light_missile_launcher", 2);
            inventory.AddItem(save, "module_shield_booster", 1);
            inventory.AddItem(save, "module_em_hardener", 1);
            inventory.AddItem(save, "module_afterburner", 1);
            inventory.AddItem(save, "ammo_light_missile_em", 80);
            inventory.AddItem(save, "ammo_light_missile_kinetic", 80);
            return save;
        }

        public Result<ShipInstanceData> BuyShip(PlayerSaveData save, string shipDefinitionId)
        {
            var ship = database.Ship(shipDefinitionId);
            if (ship == null)
            {
                return Result<ShipInstanceData>.Fail($"Unknown ship: {shipDefinitionId}");
            }

            var pay = SpendCredits(save, ship.Price);
            if (!pay.Success)
            {
                return Result<ShipInstanceData>.Fail(pay.Error);
            }

            var instance = CreateShipInstance(shipDefinitionId);
            save.Ships.Add(instance);
            save.SelectedShipInstanceId = instance.InstanceId;
            return Result<ShipInstanceData>.Ok(instance);
        }

        public Result BuyItem(PlayerSaveData save, string itemId, int quantity)
        {
            var unitPrice = inventory.GetItemPrice(itemId);
            var cost = unitPrice * quantity;
            var pay = SpendCredits(save, cost);
            if (!pay.Success)
            {
                return pay;
            }

            return inventory.AddItem(save, itemId, quantity);
        }

        public Result SellItem(PlayerSaveData save, string itemId, int quantity)
        {
            var removed = inventory.RemoveItem(save, itemId, quantity);
            if (!removed.Success)
            {
                return removed;
            }

            save.Credits += Math.Max(1, inventory.GetItemPrice(itemId) / 2) * quantity;
            return Result.Ok();
        }

        public Result SelectShip(PlayerSaveData save, string shipInstanceId)
        {
            if (save.Ships.All(x => x.InstanceId != shipInstanceId))
            {
                return Result.Fail($"Ship instance not owned: {shipInstanceId}");
            }

            save.SelectedShipInstanceId = shipInstanceId;
            return Result.Ok();
        }

        public Result RemoveRiskedShip(PlayerSaveData save, string shipInstanceId)
        {
            var ship = save.Ships.FirstOrDefault(x => x.InstanceId == shipInstanceId);
            if (ship == null)
            {
                return Result.Fail($"Ship instance not owned: {shipInstanceId}");
            }

            save.Ships.Remove(ship);
            if (save.SelectedShipInstanceId == shipInstanceId)
            {
                save.SelectedShipInstanceId = save.Ships.FirstOrDefault()?.InstanceId;
            }

            return Result.Ok();
        }

        public ShipInstanceData SelectedShip(PlayerSaveData save)
        {
            return save.Ships.FirstOrDefault(x => x.InstanceId == save.SelectedShipInstanceId);
        }

        public Result AddCredits(PlayerSaveData save, int amount)
        {
            if (amount < 0)
            {
                return Result.Fail("Credit gain cannot be negative.");
            }

            save.Credits += amount;
            return Result.Ok();
        }

        public Result SpendCredits(PlayerSaveData save, int amount)
        {
            if (amount < 0)
            {
                return Result.Fail("Cost cannot be negative.");
            }

            if (save.Credits < amount)
            {
                return Result.Fail("Not enough credits.");
            }

            save.Credits -= amount;
            return Result.Ok();
        }

        private ShipInstanceData CreateShipInstance(string shipDefinitionId)
        {
            var definition = database.Ship(shipDefinitionId);
            if (definition == null)
            {
                throw new InvalidOperationException($"Unknown ship: {shipDefinitionId}");
            }

            return new ShipInstanceData
            {
                InstanceId = Guid.NewGuid().ToString("N"),
                ShipDefinitionId = shipDefinitionId,
                ShieldHp = definition.ShieldHp,
                ArmorHp = definition.ArmorHp,
                HullHp = definition.HullHp
            };
        }
    }
}
