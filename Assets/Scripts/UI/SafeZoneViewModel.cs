using System.Collections.Generic;
using System.Linq;
using EveRogue.Data;
using EveRogue.Fitting;
using EveRogue.Save;

namespace EveRogue.UI
{
    public sealed class SafeZoneViewModel
    {
        public int Credits { get; set; }
        public string SelectedShipName { get; set; }
        public bool CanLaunch { get; set; }
        public List<string> LaunchBlockers { get; } = new List<string>();
        public List<string> OwnedShips { get; } = new List<string>();
        public List<string> InventoryLines { get; } = new List<string>();
        public FittingStats FittingStats { get; set; }

        public static SafeZoneViewModel From(PlayerSaveData save, GameDatabase database, ShipInstanceData selectedShip, FittingValidation fitting)
        {
            var model = new SafeZoneViewModel
            {
                Credits = save.Credits,
                SelectedShipName = selectedShip == null ? "No ship selected" : database.Ship(selectedShip.ShipDefinitionId)?.DisplayName ?? selectedShip.ShipDefinitionId,
                CanLaunch = selectedShip != null && fitting.IsLegal,
                FittingStats = fitting.Stats
            };

            foreach (var ship in save.Ships)
            {
                model.OwnedShips.Add($"{ship.InstanceId.Substring(0, 6)}  {database.Ship(ship.ShipDefinitionId)?.DisplayName ?? ship.ShipDefinitionId}");
            }

            foreach (var stack in save.Inventory.OrderBy(x => x.ItemDefinitionId))
            {
                model.InventoryLines.Add($"{stack.ItemDefinitionId} x{stack.Quantity}");
            }

            if (selectedShip == null)
            {
                model.LaunchBlockers.Add("Select a ship before launching.");
            }

            model.LaunchBlockers.AddRange(fitting.Reasons);
            return model;
        }
    }
}
