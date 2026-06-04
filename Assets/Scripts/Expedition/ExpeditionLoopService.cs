using System.Collections.Generic;
using System.Linq;
using EveRogue.Combat;
using EveRogue.Core;
using EveRogue.Data;
using EveRogue.Economy;
using EveRogue.Fitting;
using EveRogue.Loot;
using EveRogue.Save;

namespace EveRogue.Expedition
{
    public sealed class ExpeditionLoopService
    {
        private readonly GameDatabase database;
        private readonly AssetService assets;
        private readonly FittingService fitting;
        private readonly ExpeditionService expedition;
        private readonly LootService loot;

        public ExpeditionLoopService(GameDatabase database, AssetService assets, FittingService fitting, ExpeditionService expedition, LootService loot)
        {
            this.database = database;
            this.assets = assets;
            this.fitting = fitting;
            this.expedition = expedition;
            this.loot = loot;
        }

        public Result<ExpeditionRunState> Launch(PlayerSaveData save, int seed, int dangerLevel)
        {
            var ship = assets.SelectedShip(save);
            if (ship == null)
            {
                return Result<ExpeditionRunState>.Fail("No selected ship.");
            }

            var validation = fitting.Validate(ship);
            if (!validation.IsLegal)
            {
                return Result<ExpeditionRunState>.Fail(string.Join("; ", validation.Reasons));
            }

            return Result<ExpeditionRunState>.Ok(expedition.CreateRun(ship, seed, dangerLevel));
        }

        public EventResolution ResolveCurrentNode(ExpeditionRunState run, CombatInputState combatInput, int combatSeed)
        {
            var node = run.Nodes.FirstOrDefault(x => x.Revealed && !x.Completed);
            if (node == null)
            {
                return new EventResolution { Completed = false, Outcome = run.Outcome, Messages = { "No revealed node is available." } };
            }

            if (node.Type == EventType.Salvage || node.Type == EventType.TemporaryStation || node.Type == EventType.ExtractionWindow)
            {
                return expedition.ResolveNonCombatEvent(run, node);
            }

            var enemyIds = BuildEnemyList(node);
            var combat = new CombatFactory(database, fitting).Create(run.PlayerShip, enemyIds, combatSeed);
            if (combatInput == null)
            {
                combatInput = new CombatInputState { TargetId = "enemy_0", DesiredRange = 22f, RangeIntent = RangeIntent.KeepRange };
            }

            var result = new CombatSimulator(database, combatSeed).RunUntilFinished(combat, combatInput, 1800);
            run.PlayerShip.ShieldHp = combat.Player.ShieldHp;
            run.PlayerShip.ArmorHp = combat.Player.ArmorHp;
            run.PlayerShip.HullHp = combat.Player.HullHp;

            if (result == CombatResult.PlayerDestroyed)
            {
                expedition.MarkShipDestroyed(run);
                return new EventResolution { Completed = false, EndsRun = true, Outcome = ExpeditionOutcome.ShipDestroyed, Messages = { "Ship destroyed. Risked assets are lost." } };
            }

            expedition.CompleteCombatNode(run, node, node.Type == EventType.Boss);
            return new EventResolution { Completed = true, EndsRun = run.Outcome == ExpeditionOutcome.BossDefeated, Outcome = run.Outcome, Messages = { "Combat resolved." } };
        }

        public SettlementResult Settle(PlayerSaveData save, ExpeditionRunState run, IEnumerable<string> selectedLootIds)
        {
            if (run.Outcome == ExpeditionOutcome.ShipDestroyed)
            {
                return loot.SettleDestruction(save, run.RiskedShipInstanceId, run.LootPool);
            }

            var ship = save.Ships.FirstOrDefault(x => x.InstanceId == run.RiskedShipInstanceId);
            if (ship != null)
            {
                ship.ShieldHp = run.PlayerShip.ShieldHp;
                ship.ArmorHp = run.PlayerShip.ArmorHp;
                ship.HullHp = run.PlayerShip.HullHp;
            }

            var selectedShip = ship ?? run.PlayerShip;
            var rule = new LootSelectionRule { MaxVolume = database.Ship(selectedShip.ShipDefinitionId)?.CargoCapacity ?? 50f };
            return loot.SettleExtraction(save, selectedShip, run.LootPool, selectedLootIds, rule, run.CreditsEarned);
        }

        private static IEnumerable<string> BuildEnemyList(EventNodeState node)
        {
            if (node.Type == EventType.Boss)
            {
                return new[] { "enemy_drone_boss" };
            }

            if (node.Type == EventType.Elite)
            {
                return new[] { "enemy_raider_elite", "enemy_drone_skirmisher" };
            }

            return node.Depth % 2 == 0
                ? new[] { "enemy_drone_skirmisher", "enemy_raider_scout" }
                : new[] { "enemy_raider_scout" };
        }
    }
}
