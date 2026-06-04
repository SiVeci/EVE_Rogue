using EveRogue.Data;
using EveRogue.Economy;
using EveRogue.Fitting;
using EveRogue.Save;

namespace EveRogue.UI
{
    public sealed class SafeZonePresenter
    {
        private readonly GameDatabase database;
        private readonly AssetService assets;
        private readonly InventoryService inventory;
        private readonly FittingService fitting;
        private readonly SaveService saveService;
        private PlayerSaveData save;

        public SafeZonePresenter(GameDatabase database, AssetService assets, InventoryService inventory, FittingService fitting, SaveService saveService, PlayerSaveData save)
        {
            this.database = database;
            this.assets = assets;
            this.inventory = inventory;
            this.fitting = fitting;
            this.saveService = saveService;
            this.save = save;
        }

        public PlayerSaveData Save => save;

        public SafeZoneViewModel BuildViewModel()
        {
            var selected = assets.SelectedShip(save);
            var validation = selected == null ? new FittingValidation { Stats = new FittingStats() } : fitting.Validate(selected);
            return SafeZoneViewModel.From(save, database, selected, validation);
        }

        public string Buy(string itemId, int quantity)
        {
            var shipDefinition = database.Ship(itemId);
            if (shipDefinition != null)
            {
                var shipResult = assets.BuyShip(save, itemId);
                if (!shipResult.Success)
                {
                    return shipResult.Error;
                }

                saveService.Save(save);
                return string.Empty;
            }

            var itemResult = assets.BuyItem(save, itemId, quantity);
            if (!itemResult.Success)
            {
                return itemResult.Error;
            }

            saveService.Save(save);
            return string.Empty;
        }

        public string SelectShip(string shipInstanceId)
        {
            var result = assets.SelectShip(save, shipInstanceId);
            if (result.Success)
            {
                saveService.Save(save);
            }

            return result.Error;
        }

        public string FitSelected(SlotType slot, int index, string moduleId, string ammoId)
        {
            var selected = assets.SelectedShip(save);
            if (selected == null)
            {
                return "No selected ship.";
            }

            var result = fitting.InstallModule(save, selected, slot, index, moduleId, ammoId);
            if (result.Success)
            {
                saveService.Save(save);
            }

            return result.Error;
        }

        public string MoveCargo(string itemId, int quantity)
        {
            var selected = assets.SelectedShip(save);
            if (selected == null)
            {
                return "No selected ship.";
            }

            var result = fitting.AddCargoItem(save, selected, itemId, quantity);
            if (result.Success)
            {
                saveService.Save(save);
            }

            return result.Error;
        }

        public bool CanLaunch()
        {
            var selected = assets.SelectedShip(save);
            return selected != null && fitting.Validate(selected).IsLegal;
        }

        public static SafeZonePresenter CreateDefault(string savePath)
        {
            var database = MvpGameDatabaseFactory.Create();
            var inventory = new InventoryService(database);
            var assets = new AssetService(database, inventory);
            var fitting = new FittingService(database, inventory);
            var saveService = new SaveService(savePath);
            PlayerSaveData save;
            var loaded = saveService.Load();
            if (loaded.Success)
            {
                save = loaded.Value;
            }
            else
            {
                save = assets.CreateNewSave();
                saveService.Save(save);
            }

            return new SafeZonePresenter(database, assets, inventory, fitting, saveService, save);
        }
    }
}
