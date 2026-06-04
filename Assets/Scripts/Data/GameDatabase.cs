using System;
using System.Collections.Generic;
using System.Linq;
using EveRogue.Core;

namespace EveRogue.Data
{
    public sealed class GameDatabase
    {
        public List<ShipDefinition> Ships { get; } = new List<ShipDefinition>();
        public List<ModuleDefinition> Modules { get; } = new List<ModuleDefinition>();
        public List<AmmoDefinition> Ammo { get; } = new List<AmmoDefinition>();
        public List<DroneDefinition> Drones { get; } = new List<DroneDefinition>();
        public List<EnemyDefinition> Enemies { get; } = new List<EnemyDefinition>();
        public List<FactionDefinition> Factions { get; } = new List<FactionDefinition>();

        public ShipDefinition Ship(string id) => Ships.FirstOrDefault(x => x.Id == id);
        public ModuleDefinition Module(string id) => Modules.FirstOrDefault(x => x.Id == id);
        public AmmoDefinition AmmoById(string id) => Ammo.FirstOrDefault(x => x.Id == id);
        public EnemyDefinition Enemy(string id) => Enemies.FirstOrDefault(x => x.Id == id);
        public FactionDefinition Faction(string id) => Factions.FirstOrDefault(x => x.Id == id);

        public Result Validate()
        {
            var ids = Ships.Select(x => x.Id)
                .Concat(Modules.Select(x => x.Id))
                .Concat(Ammo.Select(x => x.Id))
                .Concat(Drones.Select(x => x.Id))
                .Concat(Enemies.Select(x => x.Id))
                .Concat(Factions.Select(x => x.Id));
            var unique = GameIds.ValidateUnique(ids);
            if (!unique.Success)
            {
                return unique;
            }

            foreach (var module in Modules)
            {
                foreach (var ammoId in module.AllowedAmmoIds)
                {
                    if (AmmoById(ammoId) == null)
                    {
                        return Result.Fail($"Module {module.Id} references missing ammo {ammoId}.");
                    }
                }
            }

            return Result.Ok();
        }
    }
}
