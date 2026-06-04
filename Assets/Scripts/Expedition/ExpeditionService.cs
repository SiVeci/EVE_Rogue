using System;
using System.Linq;
using EveRogue.Core;
using EveRogue.Data;
using EveRogue.Loot;
using EveRogue.Save;

namespace EveRogue.Expedition
{
    public sealed class ExpeditionService
    {
        private readonly GameDatabase database;
        private readonly LootService loot;

        public ExpeditionService(GameDatabase database, LootService loot)
        {
            this.database = database;
            this.loot = loot;
        }

        public ExpeditionRunState CreateRun(ShipInstanceData riskedShip, int seed, int dangerLevel = 1)
        {
            var rng = new SeededRandom(seed);
            var factions = database.Factions.OrderBy(_ => rng.Range(0, 100000)).Take(2).ToList();
            var run = new ExpeditionRunState
            {
                RunId = Guid.NewGuid().ToString("N"),
                Seed = seed,
                CurrentDepth = 0,
                RiskedShipInstanceId = riskedShip.InstanceId,
                PlayerShip = CloneShip(riskedShip)
            };

            run.ScanReport.DangerLevel = dangerLevel;
            foreach (var faction in factions)
            {
                run.ScanReport.PossibleFactionIds.Add(faction.Id);
                run.ScanReport.LikelyIncomingDamage.AddRange(faction.DamageTendencies.Take(1));
                run.ScanReport.LikelyEnemyWeakness.AddRange(Enum.GetValues(typeof(DamageType)).Cast<DamageType>().Where(x => !faction.ResistTendencies.Contains(x)).Take(1));
            }

            run.ScanReport.EnvironmentClueIds.Add(rng.Chance(0.5f) ? "env_ion_static" : "env_debris_field");
            run.ScanReport.UnknownSignals.Add(rng.Chance(0.35f) ? "elite_signature_possible" : "cargo_cache_possible");

            var nodeCount = rng.Range(5, 8);
            for (var i = 0; i < nodeCount; i++)
            {
                var type = PickNodeType(i, nodeCount, rng);
                run.Nodes.Add(new EventNodeState
                {
                    NodeId = $"node_{i + 1}",
                    Type = type,
                    Depth = i + 1,
                    Revealed = i == 0,
                    Completed = false,
                    EventTemplateId = $"{type.ToString().ToLowerInvariant()}_{dangerLevel}_{i + 1}",
                    RewardMultiplier = Math.Max(1, dangerLevel + i / 2)
                });
            }

            return run;
        }

        public Result<EventNodeState> RevealNextNode(ExpeditionRunState run)
        {
            var next = run.Nodes.FirstOrDefault(x => !x.Completed);
            if (next == null)
            {
                run.Outcome = ExpeditionOutcome.BossDefeated;
                return Result<EventNodeState>.Fail("No remaining nodes.");
            }

            next.Revealed = true;
            run.CurrentDepth = next.Depth;
            return Result<EventNodeState>.Ok(next);
        }

        public EventResolution ResolveNonCombatEvent(ExpeditionRunState run, EventNodeState node)
        {
            var resolution = new EventResolution { Completed = true, Outcome = ExpeditionOutcome.InProgress };
            node.Completed = true;
            switch (node.Type)
            {
                case EventType.Salvage:
                    loot.AddLoot(run.LootPool, "ammo_light_missile_kinetic", 20 * node.RewardMultiplier, 1);
                    run.CreditsEarned += 45 * node.RewardMultiplier;
                    resolution.Messages.Add("Recovered ammunition and salvage credits.");
                    break;
                case EventType.TemporaryStation:
                    resolution.Messages.Add("Temporary station reached. Cargo refit is available, repairs and trade are not.");
                    break;
                case EventType.ExtractionWindow:
                    run.Outcome = ExpeditionOutcome.Extracted;
                    resolution.EndsRun = true;
                    resolution.Outcome = ExpeditionOutcome.Extracted;
                    resolution.Messages.Add("Extraction window secured.");
                    break;
                default:
                    resolution.Completed = false;
                    resolution.Messages.Add("This event requires combat resolution.");
                    break;
            }

            RevealUpcoming(run);
            return resolution;
        }

        public void CompleteCombatNode(ExpeditionRunState run, EventNodeState node, bool bossDefeated)
        {
            node.Completed = true;
            loot.AddLoot(run.LootPool, node.Type == EventType.Boss ? "module_rig_cap_relay" : "module_thermal_hardener", 1, node.Type == EventType.Boss ? 5 : 2);
            run.CreditsEarned += (node.Type == EventType.Boss ? 250 : 90) * node.RewardMultiplier;
            if (bossDefeated || node.Type == EventType.Boss)
            {
                run.Outcome = ExpeditionOutcome.BossDefeated;
            }

            RevealUpcoming(run);
        }

        public void MarkShipDestroyed(ExpeditionRunState run)
        {
            run.Outcome = ExpeditionOutcome.ShipDestroyed;
        }

        private static EventType PickNodeType(int index, int nodeCount, SeededRandom rng)
        {
            if (index == nodeCount - 1)
            {
                return EventType.Boss;
            }

            if (index == nodeCount - 2)
            {
                return EventType.ExtractionWindow;
            }

            var roll = rng.Range(0, 100);
            if (roll < 45)
            {
                return EventType.Combat;
            }

            if (roll < 60)
            {
                return EventType.Salvage;
            }

            if (roll < 75)
            {
                return EventType.Elite;
            }

            return EventType.TemporaryStation;
        }

        private static void RevealUpcoming(ExpeditionRunState run)
        {
            var next = run.Nodes.FirstOrDefault(x => !x.Completed);
            if (next != null)
            {
                next.Revealed = true;
                run.CurrentDepth = next.Depth;
            }
        }

        private static ShipInstanceData CloneShip(ShipInstanceData ship)
        {
            var clone = new ShipInstanceData
            {
                InstanceId = ship.InstanceId,
                ShipDefinitionId = ship.ShipDefinitionId,
                ShieldHp = ship.ShieldHp,
                ArmorHp = ship.ArmorHp,
                HullHp = ship.HullHp
            };
            foreach (var slot in ship.Fitting.HighSlots) clone.Fitting.HighSlots.Add(CloneModule(slot));
            foreach (var slot in ship.Fitting.MediumSlots) clone.Fitting.MediumSlots.Add(CloneModule(slot));
            foreach (var slot in ship.Fitting.LowSlots) clone.Fitting.LowSlots.Add(CloneModule(slot));
            foreach (var slot in ship.Fitting.RigSlots) clone.Fitting.RigSlots.Add(CloneModule(slot));
            foreach (var cargo in ship.Cargo.Items) clone.Cargo.Items.Add(new ItemStackData(cargo.ItemDefinitionId, cargo.Quantity));
            return clone;
        }

        private static FittedModuleData CloneModule(FittedModuleData module)
        {
            return module == null ? new FittedModuleData() : new FittedModuleData { ModuleDefinitionId = module.ModuleDefinitionId, LoadedAmmoDefinitionId = module.LoadedAmmoDefinitionId, Online = module.Online };
        }
    }
}
