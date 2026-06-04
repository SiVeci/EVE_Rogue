using System;
using System.Collections.Generic;

namespace EveRogue.Save
{
    [Serializable]
    public sealed class PlayerSaveData
    {
        public int Version = 1;
        public int Credits;
        public List<ShipInstanceData> Ships = new List<ShipInstanceData>();
        public List<ItemStackData> Inventory = new List<ItemStackData>();
        public string SelectedShipInstanceId;
    }

    [Serializable]
    public sealed class ShipInstanceData
    {
        public string InstanceId;
        public string ShipDefinitionId;
        public float ShieldHp;
        public float ArmorHp;
        public float HullHp;
        public FittingData Fitting = new FittingData();
        public CargoData Cargo = new CargoData();
    }

    [Serializable]
    public sealed class ItemStackData
    {
        public string ItemDefinitionId;
        public int Quantity;

        public ItemStackData()
        {
        }

        public ItemStackData(string itemDefinitionId, int quantity)
        {
            ItemDefinitionId = itemDefinitionId;
            Quantity = quantity;
        }
    }

    [Serializable]
    public sealed class FittingData
    {
        public List<FittedModuleData> HighSlots = new List<FittedModuleData>();
        public List<FittedModuleData> MediumSlots = new List<FittedModuleData>();
        public List<FittedModuleData> LowSlots = new List<FittedModuleData>();
        public List<FittedModuleData> RigSlots = new List<FittedModuleData>();
        public List<DroneStackData> Drones = new List<DroneStackData>();
    }

    [Serializable]
    public sealed class FittedModuleData
    {
        public string ModuleDefinitionId;
        public string LoadedAmmoDefinitionId;
        public bool Online = true;
    }

    [Serializable]
    public sealed class DroneStackData
    {
        public string DroneDefinitionId;
        public int Quantity;
    }

    [Serializable]
    public sealed class CargoData
    {
        public List<ItemStackData> Items = new List<ItemStackData>();
    }
}
