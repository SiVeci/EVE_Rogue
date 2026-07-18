# Balance Reference — v0.7+

Numbers new content should be derived from. Existing shipped content (v0.1–v0.6) is **not** retroactively changed to match this doc — it's a forward-looking anchor written at the start of v0.7, not a rebalance pass. Where existing data doesn't cleanly express a rule below (e.g. Guristas' resists don't actually express a "weak to kinetic" identity), the new content still follows the rule; the old content is left alone. **Exception:** the 4 v0.4 NPCs' resist signatures were retrofitted in v0.8 (PRD-authorized, see the faction signature table below) — this is the one deliberate departure from "old content is left alone."

## Depth & difficulty scaling (existing, unchanged)

- `depthMult = 1 + 0.15 × (depth − 1)` — NPC HP and damage (`buildEncounter` in `src/data/npcs.js`).
- Elite node: `statMult = depthMult × 1.5`; reward ×2 (vs ×1 for patrol).
- EWAR strength (web %, optimal range) is NOT scaled by depth.
- Loot tier unlocks: T1 depth 1+, Meta depth 4+, T2 depth 7+ (`TIER_UNLOCKS` in `src/lib/loot.js`).

## SP economy (new in v0.8)

- Combat SP: `spReward = round(200 × depthMult × eliteMult)` in `buildEncounter`
  (`src/data/npcs.js`), eliteMult = 2 for elite / 1 for patrol. Same shape as the
  ISK `reward`: scales on depthMult, NOT on the elite ×1.5 statMult. The 200 base
  (`SP_REWARD_BASE`) is uniform across NPC archetypes — bounty expresses target
  value, SP expresses combat experience.
- Defeat pays no SP. Roguelike loss sharpness; also closes the "feed the spiral
  for SP" farm. Revisit only if the death spiral proves too steep in play.
- Depth table (patrol / elite): d1 200/400 · d2 230/460 · d3 260/520 · d4 290/580
  · d5 320/640 · d6 350/700 · d7 380/760 · d8 410/820 · d10 470/940.
- Training cost (unchanged): `1000 × (currentLevel + 1)`. Cumulative from level 0:
  L1 1,000 · L2 3,000 · L3 6,000 · L4 10,000 · L5 15,000. Stat skills start at
  level 1, so their L5 cumulative is 14,000.
- Gate milestones: Destroyers I = 1,000 SP (≈5 patrol wins from zero — a fresh
  save's 1,500 starting SP also covers it directly) · T2 support gate (level 4)
  = 10,000 · T2 weapon gate (level 5) = 15,000.
- Pace band: the first T2 weapon gate takes ≈30–55 wins of SP income (shallow
  patrol-only ≈260 SP/win → ~55 wins; mid-depth with ~30% elite ≈390 SP/win →
  ~38 wins; deep elite-heavy → ~30 wins). This measures SP earned; splitting SP
  across stat skills defers gates — intended tension.
- Tuning lever: adjust the 200 base only. Keep the formula shape and the
  training-cost curve fixed so pacing changes stay one-knob.

## Tier strength ladder

For a **raw magnitude stat** (weapon damage per volley, repair amount, flat HP/resist bonus, speed multiplier): T1 = 100%, Meta = 110%, T2 = 120% of the T1 value in the same item family. Fitting cost (PG/CPU) rises roughly in step: Meta ≈ T1 × 1.05–1.1, T2 ≈ T1 × 1.15–1.2.

**Exception — passive % damage amplifiers** (Magnetic Field Stabilizer, Ballistic Control System): the bonus itself follows a gentler curve than 120%, because compounding a 20%-stronger *percentage bonus* through `getEffectiveStats`' multiplicative pipeline is disproportionately strong next to flat-stat items. Established precedent (BCS I→II, v0.6): 1.10× → 1.13× — a +0.03 step, not +0.20. Magnetic Field Stabilizer II follows the same +0.03 step (1.10× → 1.13×).

## Pricing

- Meta price ≈ T1 price × 1.4–1.6 (established range across v0.3/v0.5 content).
- T2 price ≈ T1 price × 3–4 (established range from v0.6's two T2 items: BCS 9,000→28,000 ≈3.1×; the hybrid weapon line 7,500→30,000 = 4×). Reflects "loot-only, rare" positioning, not a manufacturing-cost model. v0.7's new T2 line targets ≈3.5× uniformly, with Magnetic Field Stabilizer II pegged to its BCS II sibling's exact price (28,000) since they're a matched damage-amp pair.
- Hull price: a run-ending loss (hull + full T1 fit) should cost roughly 3–5 patrol-node bounties at the hull's earliest sensible depth. Destroyer hulls sit at the high end of that band since they gate on a skill, not just ISK.

## Frigate anchors (existing, for calibrating new hulls against)

| Hull | Slots (H/M/L) | Raw EHP (shield+armor+hull) | Base speed | Agility | Price |
|------|---------------|------------------------------|------------|---------|-------|
| Incursus | 3/3/4 | 1300 | 315 m/s | 3.0s | 60,000 |
| Kestrel | 4/4/2 | 1150 | 305 m/s | 3.5s | 75,000 |

New frigates (Merlin, Atron) land in a similar EHP band, differentiated by *slot distribution and defense-layer shape*, not by being strictly better:

| Hull | Slots (H/M/L) | Raw EHP | Base speed | Agility | Price |
|------|---------------|---------|------------|---------|-------|
| Merlin | 3/4/2 | 1000 | 320 m/s | 3.2s | 65,000 |
| Atron | 3/3/3 | 840 | 400 m/s | 2.2s | 50,000 |

Merlin trades total EHP for the highest *base shield* of any frigate (520, beating Kestrel's 500) — its identity is realized by stacking the 4 mid slots with shield extenders, not by base tank. Atron is deliberately the thinnest hull in the game (glass) in exchange for being unambiguously the fastest player-flyable ship (400 m/s, beating every NPC) and the cheapest hull (glass cannons should be cheap to replace).

## Destroyer anchors (new tier, no precedent — this version sets it)

- Slot total: 13 (vs frigates' 9–10) — the extra slots are the class's defining trait, concentrated in highs for a turret boat.
- EHP: same *band* as frigates (destroyers are not tankier, they're a glass DPS platform).
- Agility: deliberately worse than any frigate (4.0–4.5s vs frigates' 2.2–3.5s) and sig radius larger (60–70m vs frigates' 35–45m) — this is the class's counterplay: a fast small ship should be able to out-orbit its tracking.
- Price: 2.5–3× a frigate's price.

| Hull | Slots (H/M/L) | Raw EHP | Base speed | Agility | Sig | Price | requiredSkills |
|------|---------------|---------|------------|---------|-----|-------|-----------------|
| Catalyst | 8/2/3 | 1300 | 250 m/s | 4.5s | 65m | 180,000 | destroyers: 1 |
| Cormorant | 7/4/2 | 1300 | 240 m/s | 4.2s | 62m | 190,000 | destroyers: 1 |

## TTK reference band

At a hull's *own* unlock depth, a reasonably-fit player frigate vs. that depth's baseline NPC should reach a 20–60s time-to-kill in either direction — not a hard simulation requirement, a sanity check when picking new NPC HP/damage relative to existing player weapon DPS (~2.3–5.6 dps per T1–T2 high slot, before skills/passives).

## Faction damage/resist signature (v0.7, retrofit completed v0.8)

| Faction | Deals | Weak against | NPCs |
|---------|-------|---------------|------|
| Guristas | KIN/TH (missile + railgun) | KIN (v0.8 retrofit) | Guristas Pirate, Guristas Sniper |
| Sansha's Nation | EM/TH | EM | Sansha Slaver, Sansha Ravager |
| Serpentis | KIN/TH (+ web) | TH (Scout v0.7; Brawler v0.8 retrofit) | Serpentis Brawler, Serpentis Scout |
| Angel Cartel | EXP/KIN | EXP (Hunter v0.7; Webber v0.8 retrofit) | Angel Webber, Angel Hunter |

All 8 NPCs now carry an authored resist signature: their weak damage type sits
20–30 resist points below their other three types across all three defense
layers, so a correctly-typed player damage choice measurably shortens TTK
without being an on/off switch. The 4 v0.4-era NPCs' shield-layer `em: 0`
generic hole is also narrowed as part of the v0.8 retrofit (NPC-side
flattening; player hulls keep the EVE-conventional resist shape). This is a
one-time, PRD-authorized exception to the "existing shipped content is not
retroactively changed" rule below — everything else still holds.

## Run structure (new in v0.9)

- Segment: 5 layers (SEGMENT_LAYERS, src/lib/runmap.js), 2–3 nodes per layer
  (50/50). Node depth = segment start + layer index: a segment starting at depth
  d spans d…d+4. Completing the final layer sets depth to d+5 (advanceSegment) —
  the only way depth advances. Retreat dead-ends, ABORT & DOCK and page refresh
  keep depth at d; death still resets to 1.
- Node type weights — layer 1: patrol 100%; layers 2–4: patrol 55% / elite 15% /
  wreck 20% / repair 10%; final layer: elite 100% (2–3 side by side, you fight
  the one you route into).
- Distribution constraints (post-roll fixes): ≥1 repair in layers 2–4, forced
  into a non-elite slot in layers 3–4 if none rolled; ≤1 repair per layer;
  ≤2 per segment. Elites are uncapped — they are the risk dial.
- Repair anchor: free full restore (all three layers). Its cost is the node slot
  itself — a repair taken is a fight's rewards skipped. ISK-priced repair is
  deliberately deferred; revisit after the ammo economy (v0.11) has been
  observed in play.
- Wreck field: one pre-rolled rollLoot pass against a depth-weighted NPC's
  lootTable at the node's own depth (patrol single pass, tier gates apply).
  Ambush chance 25%, pre-rolled at generation: an ambush replaces the salvage
  with a normal patrol-grade fight at node depth (full bounty/SP/loot on win —
  the wreck was bait).
- Retreat (ALIGN & WARP): 8.0s align (ALIGN_TIME, BattleScene), fully vulnerable,
  modules stay online, no capacitor gate, cancellable. Cost = the node's bounty +
  SP + salvage forfeited, node closed for the segment, possible early segment end
  (no depth advance). No extra penalty valve in v0.9 — webs making the 8s lethal
  up close is the intended counterplay. If "always retreat" dominates ranged
  fights in play, candidate valves (weapons offline while aligning, or a large
  capacitor activation cost) go in before any number changes.
- Insurance (platinum only): premium = 30% of hull price, payout = 100% of hull
  price on destruction, fittings never covered. One policy at a time, bound to
  the boarded hull; switching hulls voids it without refund; consumed on payout.
  Net insured loss = 30% hull + full fit ≈ 2–4 patrol bounties — smoothed, still
  sharp. Payout lands before the free-Incursus soft-lock check.
- HP persists across nodes within a segment; capacitor refills every fight. Run
  state (map/position/HP) is deliberately not persisted: a refresh is a voluntary
  dock-out — banked ISK/SP/loot keep (they settle per node), the segment is lost.

## Combat fidelity (new in v0.10)

- Missile damage factor (missileDamageFactor, src/lib/combat.js):
  `min(1, (sig/expR) × min(1, expV/v)^drf)`, drf = 0.5 (MISSILE_DRF). The drf
  exponent applies to the velocity ratio only, so MWD's equal sig/speed
  multipliers net out in the player's favor (bloom restores full damage).
  Tuning: RAISING drf deepens the speed defense; lowering flattens it (note:
  the v0.10 PRD's risk section has this direction inverted).
- NPC missile calibration: explosion_radius 35 / explosion_velocity 150 on all
  rocket NPCs — expR equals the smallest player sig (Atron 35), so a stationary
  target of any hull takes exactly full damage; only genuinely fast AND small
  ships earn a discount (Atron at 400 m/s: ×0.61). Player launchers keep their
  v0.1 fields (rockets 20/150 — effectively never reduced vs 38–42m NPC sigs;
  light missiles 40/170 — reduced vs fast orbiters, webs restore application).
- NPC capacitor: cap_capacity / cap_recharge per NPC, weapon stats.cap_use
  (missiles 0 — launchers are cap-free on both sides), ewar cap_use +
  activation_time 5.0. Recharge reuses getCapacitorRecharge. Invariants:
  peak recharge (2.5 × cap/T) ≥ 1.45 × standing consumption (cap never sags
  toward the floor without a neut — the zero-diff guarantee); T1 neut drain
  (10 GJ/s) > every NPC's peak recharge (suppression always converges);
  cap_recharge > 90 s (regen between 5 s neut cycles stays under the floor —
  hard shutdown is structural, not tuned). Cap is NOT scaled by depth/elite
  (same rule as EWAR strength).
- NPC activation floor: weapons/ewar with cap_use > 0 fire only at
  cap ≥ max(cap_use, 10% × cap_capacity) (NPC_CAP_FLOOR_RATIO). Below it they
  stop entirely and resume once recharge crosses back — the hysteresis exists
  because an NPC can't re-toggle modules; player modules keep their exact-cost
  semantics.
- Energy neutralizer: Small Energy Neutralizer I (T1, market, 12,000 ISK,
  50 GJ per 5 s, optimal 6 km, self cost 25 cap/cycle) · Small Infectious
  Scoped Energy Neutralizer (Meta, loot-only via both Sansha tables, 18,000,
  55 GJ, 7.5 km). One T1 neut caps out a Serpentis Scout from full in ~25 s
  (double-neut destroyer ~13 s), recovery ~6–10 s after the neut stops. Rocket
  NPCs' weapons are immune (cap_use 0); Angel Webber's web is not. Tuning
  lever if too strong: neut_amount only.
- Damage bleed-through: applyDamage carries a broken layer's overflow into the
  next layer at that layer's own resists, capped at one layer per volley.
  Return shape { layer, dmg } unchanged (layer = first layer hit, dmg = total).
- Stacking penalty (stackingPenalty, src/lib/shipStats.js): i-th module mult
  on the same stat (sorted by magnitude, descending; bonuses and maluses in
  separate groups) keeps 0.5^((i/2.22292081)^2) of its bonus: 100% / 86.9% /
  57.1% / 28.3% / 10.6%. Exempt: skill multipliers, all `add` modifiers.
  2× MFS I = ×1.1956 (was 1.21), 3× = ×1.2638 (was 1.331) — the second copy
  still pays, the third is the real diminishing step.

## Ammunition (new in v0.11)

- Hybrid charges (family hybrid_s, all 6 hybrid turrets): Antimatter ×1.2 dmg /
  ×0.6 optimal · Lead ×1.0/×1.0 (the standard — loading it reproduces the
  weapon's printed panel exactly) · Iridium ×0.85/×1.6. Falloff, tracking, rof
  and cap use are never modified by ammo.
- Missile warheads (4 per family, damage type only): Mjolnir EM / Inferno TH /
  Scourge KIN / Nova EXP. A warhead replaces the launcher's damage object with
  its single type at the SAME total (conservation invariant: the four warheads
  of a family are equal-power against a resistless target). Warheads carry the
  family's explosion_radius/velocity (rockets 20/150, light missiles 40/170 —
  identical to the launcher fields, so Scourge is byte-identical to v0.10
  behavior and no warhead ever hits missileDamageFactor's missing-field
  full-damage fallback).
- Ammo modifiers apply at fire time via applyAmmoToWeapon (src/lib/ammo.js),
  downstream of getEffectiveStats — they never enter the module-mult stacking
  penalty and never touch damageMult. One round per weapon per activation,
  misses included; range holds and non-weapon cycles consume nothing.
- In-battle reload: 10 s (RELOAD_TIME, BattleScene), weapon offline, ticks
  even while toggled off. Station-side ammo switching is instant. There is no
  magazine: rounds leave cargo only when fired, switching costs time, not ammo.
- Prices (ISK/round · market lot 100): Lead 35 · Iridium 45 · Antimatter 60 ·
  all warheads 35. Blueprint batches: 200 rounds at exactly 75% of market
  per-round price (Lead 5,250 · Iridium 6,750 · Antimatter 9,000 · warheads
  5,250). Ammo sells back at 50% per round, whole stacks only.
- Consumption anchor: a depth-3 patrol (expected bounty 21,060) costs 5–15%
  of its bounty in ammo — 3× blaster: Lead 6.5% / Iridium 8.3% / Antimatter
  11.1%; 3× rail Lead 5.0%; 4× rocket 6.6%; 3× LML 5.5% (55 s kite model).
  The ratio shrinks with depth and on elites (bounty scales, rounds don't).
  Tuning lever: per-round price only.
- Loot bundles: one { ammoId, qty, chance } entry per NPC table, 50–80 rounds
  at 15–20% — the faction drops the ammo that counters it (Sansha → Mjolnir,
  Angel → Nova, Sniper → Iridium). EV 263–560 ISK/kill ≈ 1.4–2.8% of bounty:
  a supplement, not an offset (worst same-family case ~40% of a rocket
  user's spend vs the depth-1 Guristas). Module entries are untouched — the
  0.35–0.45 module-EV band re-ran unchanged.
- Starter cargo (new saves AND the v2→v3 migration gift): 300 Lead + 150
  Scourge Rocket + 150 Scourge Light Missile (21,000 ISK; ~7–8 fights for a
  3-turret fit). Fitting a weapon auto-assigns its family default (Lead /
  Scourge) — the "must load ammo to fire" rule stays, forgetting is made hard.
- Soft-lock clause extension: whenever the free-Incursus grant fires (load or
  death), cargo is topped up to ≥100 of each family default (AMMO_SAFETY_QTY) —
  the freebie hull must be able to actually shoot with any surviving weapon.
  Cargo itself survives death like the hangar; only rounds already fired in
  the losing fight are deducted (all three outcomes settle consumption).
- Fallback valve (recorded, not enabled): if "must load ammo" proves a
  frequent, low-agency death cause in play, the documented rollback is
  firing at ×0.5 panel effectiveness with no ammo assigned instead of not
  firing at all. Not implemented in v0.11 — the four mitigations (starter
  cargo, fit-time auto-assign, soft-lock top-up, UNDOCK warning) are the
  first line of defense.

## Skill defaults

Two different skill families, two different starting levels:
- **Stat skills** (engineering, gunnery, navigation) start at **level 1** — this is `skillMult`'s baseline (1 = no bonus yet, `skillMult(1) === 1.0`).
- **Gate skills** (destroyers, small_hybrid_turret, missiles, shield_operation, repair_systems, high_speed_maneuvering, electronic_warfare) start at **level 0** — they never feed `skillMult`, so 0 = "untrained" is the correct floor. Starting these at 1 would make a `requiredSkills: { destroyers: 1 }` gate trivially satisfied at game start, defeating the point of gating.

Training cost: `1000 × (currentLevel + 1)` SP for the next level. This makes a gate skill's first level cost 1,000 SP (not free), and existing stat skills' first upgrade now costs 2,000 SP instead of the old flat 1,000 — an intentional SP-economy shift that comes with this version (see plan risk notes).
