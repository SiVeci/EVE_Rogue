using System;
using System.Collections.Generic;
using System.Linq;
using EveRogue.Core;
using EveRogue.Data;

namespace EveRogue.Combat
{
    public sealed class CombatSimulator
    {
        private readonly GameDatabase database;
        private readonly SeededRandom random;

        public CombatSimulator(GameDatabase database, int seed)
        {
            this.database = database;
            random = new SeededRandom(seed);
        }

        public CombatResult Step(CombatState state, CombatInputState input)
        {
            if (state.Result != CombatResult.InProgress)
            {
                return state.Result;
            }

            state.Tick++;
            state.PlayerInput = input;
            state.Player.CurrentTargetId = input.TargetId;
            RechargeCapacitor(state.Player, state.TickDelta);
            UpdateRange(state, input);
            UpdatePlayerModules(state, input);
            UpdateEnemies(state);
            state.Enemies.RemoveAll(x => x.IsDestroyed);

            if (state.Player.IsDestroyed)
            {
                state.Result = CombatResult.PlayerDestroyed;
            }
            else if (state.Enemies.Count == 0)
            {
                state.Result = CombatResult.EnemiesDestroyed;
            }
            else if (input.RequestExtraction && state.Tick > 30)
            {
                state.Result = CombatResult.Extracted;
            }

            return state.Result;
        }

        public CombatResult RunUntilFinished(CombatState state, CombatInputState input, int maxTicks)
        {
            for (var i = 0; i < maxTicks && state.Result == CombatResult.InProgress; i++)
            {
                if (string.IsNullOrEmpty(input.TargetId) || state.Enemies.All(x => x.EntityId != input.TargetId))
                {
                    input.TargetId = state.Enemies.FirstOrDefault()?.EntityId;
                }

                Step(state, input);
            }

            return state.Result;
        }

        private void UpdateRange(CombatState state, CombatInputState input)
        {
            foreach (var enemy in state.Enemies)
            {
                var playerMove = state.Player.Velocity * state.TickDelta * 0.02f;
                var enemyMove = enemy.Velocity * state.TickDelta * 0.02f;
                switch (input.RangeIntent)
                {
                    case RangeIntent.Approach:
                        enemy.DistanceToPlayer -= playerMove;
                        break;
                    case RangeIntent.PullAway:
                        enemy.DistanceToPlayer += playerMove;
                        break;
                    case RangeIntent.Orbit:
                    case RangeIntent.KeepRange:
                        enemy.DistanceToPlayer += Math.Sign(input.DesiredRange - enemy.DistanceToPlayer) * playerMove;
                        break;
                }

                enemy.DistanceToPlayer += Math.Sign(enemy.PreferredRange - enemy.DistanceToPlayer) * enemyMove;
                enemy.DistanceToPlayer = Clamp(enemy.DistanceToPlayer, 1f, 80f);
            }
        }

        private void UpdatePlayerModules(CombatState state, CombatInputState input)
        {
            var target = state.Enemies.FirstOrDefault(x => x.EntityId == input.TargetId && !x.IsDestroyed);
            foreach (var moduleState in state.Player.Modules)
            {
                var module = database.Module(moduleState.ModuleDefinitionId);
                if (module == null)
                {
                    continue;
                }

                moduleState.Active = input.ActiveModuleIds.Count == 0 || input.ActiveModuleIds.Contains(module.Id);
                AdvanceCycle(moduleState, state.TickDelta);
                if (!moduleState.Active || moduleState.CycleRemaining > 0f)
                {
                    continue;
                }

                if (!SpendCapacitor(state.Player, module.CapacitorCost))
                {
                    moduleState.Active = false;
                    continue;
                }

                foreach (var effect in module.ActiveEffects)
                {
                    ApplyPlayerEffect(state.Player, target, module, moduleState, effect);
                }

                moduleState.CycleRemaining = Math.Max(0.1f, module.CycleTime);
            }
        }

        private void ApplyPlayerEffect(CombatEntityState player, CombatEntityState target, ModuleDefinition module, CombatModuleState moduleState, ModuleEffect effect)
        {
            if (effect.Type == ModuleEffectType.ShieldBoost)
            {
                player.ShieldHp += effect.Amount;
                return;
            }

            if (effect.Type == ModuleEffectType.ArmorRepair)
            {
                player.ArmorHp += effect.Amount;
                return;
            }

            if (effect.Type == ModuleEffectType.WebTarget && target != null && target.DistanceToPlayer <= effect.OptimalRange)
            {
                target.Velocity *= Clamp(1f - effect.Amount, 0.2f, 1f);
                return;
            }

            if (effect.Type != ModuleEffectType.WeaponDamage || target == null)
            {
                return;
            }

            var ammo = string.IsNullOrEmpty(moduleState.LoadedAmmoDefinitionId) ? null : database.AmmoById(moduleState.LoadedAmmoDefinitionId);
            if (ammo == null && module.AllowedAmmoIds.Count > 0)
            {
                ammo = database.AmmoById(module.AllowedAmmoIds[0]);
            }

            var damage = ammo?.Damage ?? effect.Damage ?? new DamageProfile();
            var range = effect.OptimalRange * (ammo?.RangeModifier ?? 1f);
            if (target.DistanceToPlayer > range + effect.FalloffRange)
            {
                return;
            }

            var falloff = target.DistanceToPlayer <= range ? 1f : 1f - (target.DistanceToPlayer - range) / Math.Max(1f, effect.FalloffRange);
            var hitQuality = random.Range(0.85f, 1.15f) * Clamp(falloff, 0.15f, 1f);
            ApplyDamage(target, DamageProfile.Scale(damage, hitQuality));
        }

        private void UpdateEnemies(CombatState state)
        {
            foreach (var enemy in state.Enemies)
            {
                var definition = database.Enemy(enemy.DefinitionId);
                if (definition == null || enemy.IsDestroyed)
                {
                    continue;
                }

                var module = enemy.Modules[0];
                AdvanceCycle(module, state.TickDelta);
                if (module.CycleRemaining > 0f || enemy.DistanceToPlayer > definition.WeaponRange)
                {
                    continue;
                }

                var hitQuality = random.Range(0.85f, 1.12f);
                ApplyDamage(state.Player, DamageProfile.Scale(definition.Damage, hitQuality));
                module.CycleRemaining = Math.Max(0.1f, definition.WeaponCycleTime);
            }
        }

        private static void ApplyDamage(CombatEntityState target, DamageProfile damage)
        {
            var chunks = new Dictionary<DamageType, float>
            {
                { DamageType.EM, damage.EM },
                { DamageType.Thermal, damage.Thermal },
                { DamageType.Kinetic, damage.Kinetic },
                { DamageType.Explosive, damage.Explosive }
            };

            foreach (var pair in chunks)
            {
                var amount = target.Resists.Mitigate(pair.Key, pair.Value);
                ApplyLayerDamage(target, amount);
            }
        }

        private static void ApplyLayerDamage(CombatEntityState target, float amount)
        {
            if (amount <= 0f)
            {
                return;
            }

            var shieldDamage = Math.Min(target.ShieldHp, amount);
            target.ShieldHp -= shieldDamage;
            amount -= shieldDamage;
            var armorDamage = Math.Min(target.ArmorHp, amount);
            target.ArmorHp -= armorDamage;
            amount -= armorDamage;
            target.HullHp = Math.Max(0f, target.HullHp - amount);
        }

        private static void RechargeCapacitor(CombatEntityState entity, float delta)
        {
            entity.Capacitor.Current = Math.Min(entity.Capacitor.Capacity, entity.Capacitor.Current + entity.Capacitor.RechargePerSecond * delta);
        }

        private static bool SpendCapacitor(CombatEntityState entity, float amount)
        {
            if (amount <= 0f)
            {
                return true;
            }

            if (entity.Capacitor.Current < amount)
            {
                return false;
            }

            entity.Capacitor.Current -= amount;
            return true;
        }

        private static void AdvanceCycle(CombatModuleState module, float delta)
        {
            module.CycleRemaining = Math.Max(0f, module.CycleRemaining - delta);
        }

        private static float Clamp(float value, float min, float max)
        {
            if (value < min)
            {
                return min;
            }

            return value > max ? max : value;
        }
    }
}
