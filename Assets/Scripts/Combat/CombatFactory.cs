using System.Collections.Generic;
using System.Linq;
using EveRogue.Data;
using EveRogue.Fitting;
using EveRogue.Save;

namespace EveRogue.Combat
{
    public sealed class CombatFactory
    {
        private readonly GameDatabase database;
        private readonly FittingService fitting;

        public CombatFactory(GameDatabase database, FittingService fitting)
        {
            this.database = database;
            this.fitting = fitting;
        }

        public CombatState Create(ShipInstanceData playerShip, IEnumerable<string> enemyDefinitionIds, int seed, float tickDelta = 0.1f)
        {
            var stats = fitting.CalculateStats(playerShip);
            var state = new CombatState
            {
                TickDelta = tickDelta,
                Player = new CombatEntityState
                {
                    EntityId = "player",
                    DefinitionId = playerShip.ShipDefinitionId,
                    IsPlayer = true,
                    DistanceToPlayer = 0f,
                    Velocity = stats.MaxVelocity,
                    ShieldHp = playerShip.ShieldHp > 0f ? playerShip.ShieldHp : stats.ShieldHp,
                    ArmorHp = playerShip.ArmorHp > 0f ? playerShip.ArmorHp : stats.ArmorHp,
                    HullHp = playerShip.HullHp > 0f ? playerShip.HullHp : stats.HullHp,
                    Resists = ResistanceProfile.Clone(stats.Resists),
                    Capacitor = new CapacitorState { Capacity = stats.CapacitorCapacity, Current = stats.CapacitorCapacity, RechargePerSecond = stats.CapacitorRechargePerSecond },
                    PreferredRange = 20f
                }
            };

            foreach (var module in playerShip.Fitting.HighSlots.Concat(playerShip.Fitting.MediumSlots).Concat(playerShip.Fitting.LowSlots).Concat(playerShip.Fitting.RigSlots))
            {
                if (module != null && !string.IsNullOrEmpty(module.ModuleDefinitionId) && module.Online)
                {
                    state.Player.Modules.Add(new CombatModuleState { ModuleDefinitionId = module.ModuleDefinitionId, LoadedAmmoDefinitionId = module.LoadedAmmoDefinitionId, Active = true });
                }
            }

            var index = 0;
            foreach (var enemyId in enemyDefinitionIds)
            {
                var enemy = database.Enemy(enemyId);
                if (enemy == null)
                {
                    continue;
                }

                state.Enemies.Add(new CombatEntityState
                {
                    EntityId = $"enemy_{index++}",
                    DefinitionId = enemy.Id,
                    IsPlayer = false,
                    DistanceToPlayer = enemy.PreferredRange + index * 4f,
                    Velocity = enemy.Velocity,
                    ShieldHp = enemy.ShieldHp,
                    ArmorHp = enemy.ArmorHp,
                    HullHp = enemy.HullHp,
                    Resists = ResistanceProfile.Clone(enemy.Resists),
                    PreferredRange = enemy.PreferredRange,
                    Modules = new List<CombatModuleState> { new CombatModuleState { ModuleDefinitionId = enemy.Id, Active = true } }
                });
            }

            state.PlayerInput.TargetId = state.Enemies.FirstOrDefault()?.EntityId;
            state.Player.CurrentTargetId = state.PlayerInput.TargetId;
            return state;
        }
    }
}
