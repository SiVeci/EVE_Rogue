using System.IO;
using System.Linq;
using EveRogue.Combat;
using EveRogue.Data;
using EveRogue.Economy;
using EveRogue.Expedition;
using EveRogue.Fitting;
using EveRogue.Loot;
using EveRogue.Save;
using NUnit.Framework;

namespace EveRogue.Tests
{
    public sealed class MvpCoreTests
    {
        private GameDatabase database;
        private InventoryService inventory;
        private AssetService assets;
        private FittingService fitting;
        private LootService loot;

        [SetUp]
        public void SetUp()
        {
            database = MvpGameDatabaseFactory.Create();
            inventory = new InventoryService(database);
            assets = new AssetService(database, inventory);
            fitting = new FittingService(database, inventory);
            loot = new LootService(inventory, assets);
        }

        [Test]
        public void MvpDatabase_IsValidAndDataDriven()
        {
            var validation = database.Validate();

            Assert.IsTrue(validation.Success, validation.Error);
            Assert.GreaterOrEqual(database.Ships.Count, 3);
            Assert.GreaterOrEqual(database.Modules.Count, 20);
            Assert.GreaterOrEqual(database.Factions.Count, 2);
            Assert.GreaterOrEqual(database.Enemies.Count, 4);
        }

        [Test]
        public void InventoryAndMarket_BuySellAndShipSelection_Work()
        {
            var save = assets.CreateNewSave();
            var creditsBefore = save.Credits;

            var buy = assets.BuyItem(save, "module_railgun", 1);
            var sell = assets.SellItem(save, "module_railgun", 1);
            var ship = assets.BuyShip(save, "ship_rail_control_frigate");

            Assert.IsTrue(buy.Success, buy.Error);
            Assert.IsTrue(sell.Success, sell.Error);
            Assert.IsTrue(ship.Success, ship.Error);
            Assert.AreEqual(ship.Value.InstanceId, save.SelectedShipInstanceId);
            Assert.Less(save.Credits, creditsBefore);
        }

        [Test]
        public void SaveService_RoundTripsPlayerAssets()
        {
            var path = Path.Combine(Path.GetTempPath(), "eve_rogue_test_save.json");
            if (File.Exists(path))
            {
                File.Delete(path);
            }

            var save = assets.CreateNewSave();
            save.Credits += 123;
            var service = new SaveService(path);

            var saved = service.Save(save);
            var loaded = service.Load();

            Assert.IsTrue(saved.Success, saved.Error);
            Assert.IsTrue(loaded.Success, loaded.Error);
            Assert.AreEqual(save.Credits, loaded.Value.Credits);
            Assert.AreEqual(save.SelectedShipInstanceId, loaded.Value.SelectedShipInstanceId);
        }

        [Test]
        public void Fitting_ValidatesSlotsCpuGridAndCargo()
        {
            var save = assets.CreateNewSave();
            var ship = assets.SelectedShip(save);

            var launcher = fitting.InstallModule(save, ship, SlotType.High, 0, "module_light_missile_launcher", "ammo_light_missile_em");
            var shield = fitting.InstallModule(save, ship, SlotType.Medium, 0, "module_shield_booster");
            var wrongSlot = fitting.InstallModule(save, ship, SlotType.High, 1, "module_afterburner");
            var cargo = fitting.AddCargoItem(save, ship, "ammo_light_missile_kinetic", 20);
            var validation = fitting.Validate(ship);

            Assert.IsTrue(launcher.Success, launcher.Error);
            Assert.IsTrue(shield.Success, shield.Error);
            Assert.IsFalse(wrongSlot.Success);
            Assert.IsTrue(cargo.Success, cargo.Error);
            Assert.IsTrue(validation.IsLegal, string.Join(", ", validation.Reasons));
            Assert.Greater(validation.Stats.WeaponDps, 0f);
            Assert.Greater(validation.Stats.CargoUsed, 0f);
        }

        [Test]
        public void Expedition_SameSeedGeneratesSameRouteAndUsefulScan()
        {
            var save = assets.CreateNewSave();
            var service = new ExpeditionService(database, loot);

            var runA = service.CreateRun(assets.SelectedShip(save), 4242, 2);
            var runB = service.CreateRun(assets.SelectedShip(save), 4242, 2);

            Assert.AreEqual(runA.Nodes.Select(x => x.Type).ToArray(), runB.Nodes.Select(x => x.Type).ToArray());
            Assert.AreEqual(runA.ScanReport.PossibleFactionIds, runB.ScanReport.PossibleFactionIds);
            Assert.GreaterOrEqual(runA.Nodes.Count, 5);
            Assert.IsTrue(runA.Nodes[0].Revealed);
            Assert.IsFalse(runA.Nodes.Skip(1).All(x => x.Revealed));
        }

        [Test]
        public void Combat_SameSeedAndInputIsDeterministic()
        {
            var saveA = PrepareCombatSave();
            var saveB = PrepareCombatSave();
            var factory = new CombatFactory(database, fitting);
            var stateA = factory.Create(assets.SelectedShip(saveA), new[] { "enemy_raider_scout" }, 99);
            var stateB = factory.Create(assets.SelectedShip(saveB), new[] { "enemy_raider_scout" }, 99);
            var input = new CombatInputState { TargetId = "enemy_0", DesiredRange = 22f, RangeIntent = RangeIntent.KeepRange };

            var resultA = new CombatSimulator(database, 99).RunUntilFinished(stateA, input, 2000);
            var resultB = new CombatSimulator(database, 99).RunUntilFinished(stateB, input, 2000);

            Assert.AreEqual(resultA, resultB);
            Assert.AreEqual(stateA.Player.HullHp, stateB.Player.HullHp, 0.001f);
            Assert.AreEqual(stateA.Enemies.Count, stateB.Enemies.Count);
        }

        [Test]
        public void LootSettlement_ExtractionReturnsSelectedLootAndDestructionRemovesShip()
        {
            var save = assets.CreateNewSave();
            var ship = assets.SelectedShip(save);
            var pool = new LootPoolData();
            loot.AddLoot(pool, "module_thermal_hardener", 1, 2);
            loot.AddLoot(pool, "ammo_light_missile_kinetic", 50, 1);

            var extraction = loot.SettleExtraction(save, ship, pool, new[] { "module_thermal_hardener" }, new LootSelectionRule { MaxVolume = 50f }, 100);
            Assert.IsTrue(extraction.ShipSurvived);
            Assert.AreEqual(1, inventory.GetQuantity(save, "module_thermal_hardener"));
            Assert.GreaterOrEqual(save.Credits, 2600);

            var shipId = ship.InstanceId;
            var destruction = loot.SettleDestruction(save, shipId, pool);
            Assert.IsFalse(destruction.ShipSurvived);
            Assert.IsFalse(save.Ships.Any(x => x.InstanceId == shipId));
        }

        [Test]
        public void ExpeditionLoop_LaunchResolveAndSettle_CompletesPlayablePath()
        {
            var save = PrepareCombatSave();
            var expeditionService = new ExpeditionService(database, loot);
            var loop = new ExpeditionLoopService(database, assets, fitting, expeditionService, loot);

            var launch = loop.Launch(save, 7, 1);
            Assert.IsTrue(launch.Success, launch.Error);

            var run = launch.Value;
            for (var i = 0; i < run.Nodes.Count && run.Outcome == ExpeditionOutcome.InProgress; i++)
            {
                var resolution = loop.ResolveCurrentNode(run, new CombatInputState { TargetId = "enemy_0", DesiredRange = 22f, RangeIntent = RangeIntent.KeepRange }, 700 + i);
                Assert.IsNotEmpty(resolution.Messages);
                if (resolution.EndsRun)
                {
                    break;
                }
            }

            if (run.Outcome == ExpeditionOutcome.InProgress)
            {
                run.Outcome = ExpeditionOutcome.Extracted;
            }

            var settlement = loop.Settle(save, run, run.LootPool.Entries.Take(1).Select(x => x.ItemDefinitionId));
            Assert.IsNotNull(settlement);
            Assert.IsTrue(settlement.ShipSurvived || !save.Ships.Any(x => x.InstanceId == run.RiskedShipInstanceId));
        }

        private PlayerSaveData PrepareCombatSave()
        {
            var save = assets.CreateNewSave();
            var ship = assets.SelectedShip(save);
            fitting.InstallModule(save, ship, SlotType.High, 0, "module_light_missile_launcher", "ammo_light_missile_em");
            fitting.InstallModule(save, ship, SlotType.High, 1, "module_light_missile_launcher", "ammo_light_missile_kinetic");
            fitting.InstallModule(save, ship, SlotType.Medium, 0, "module_shield_booster");
            fitting.InstallModule(save, ship, SlotType.Low, 0, "module_em_hardener");
            return save;
        }
    }
}
