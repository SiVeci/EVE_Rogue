# Balance Reference — v0.7+

Numbers new content should be derived from. Existing shipped content (v0.1–v0.6) is **not** retroactively changed to match this doc — it's a forward-looking anchor written at the start of v0.7, not a rebalance pass. Where existing data doesn't cleanly express a rule below (e.g. Guristas' resists don't actually express a "weak to kinetic" identity), the new content still follows the rule; the old content is left alone.

## Depth & difficulty scaling (existing, unchanged)

- `depthMult = 1 + 0.15 × (depth − 1)` — NPC HP and damage (`buildEncounter` in `src/data/npcs.js`).
- Elite node: `statMult = depthMult × 1.5`; reward ×2 (vs ×1 for patrol).
- EWAR strength (web %, optimal range) is NOT scaled by depth.
- Loot tier unlocks: T1 depth 1+, Meta depth 4+, T2 depth 7+ (`TIER_UNLOCKS` in `src/lib/loot.js`).

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

## TTK reference band

At a hull's *own* unlock depth, a reasonably-fit player frigate vs. that depth's baseline NPC should reach a 20–60s time-to-kill in either direction — not a hard simulation requirement, a sanity check when picking new NPC HP/damage relative to existing player weapon DPS (~2.3–5.6 dps per T1–T2 high slot, before skills/passives).

## Faction damage/resist signature (new in v0.7)

| Faction | Deals | Weak against | NPCs |
|---------|-------|---------------|------|
| Guristas | KIN/TH (missile + railgun) | *(unchanged from v0.4 — no clean identity, not retrofitted)* | Guristas Pirate, Guristas Sniper |
| Sansha's Nation | EM/TH | EM | Sansha Slaver, Sansha Ravager |
| Serpentis | KIN/TH (+ web) | *(Brawler unchanged from v0.4)*; Scout: TH | Serpentis Brawler, Serpentis Scout |
| Angel Cartel | EXP/KIN | *(Webber unchanged from v0.4)*; Hunter: EXP | Angel Webber, Angel Hunter |

Only the 4 new NPCs (Sansha ×2, Serpentis Scout, Angel Hunter) get a deliberately-authored resist signature: their weak damage type sits 20–30 resist points below their other three types across all three defense layers, so a correctly-typed player damage choice measurably shortens TTK without being an on/off switch. This is the pattern future factions should follow; retrofitting the 4 existing v0.4 NPCs is a separate, optional cleanup, not part of this version.

## Skill defaults

Two different skill families, two different starting levels:
- **Stat skills** (engineering, gunnery, navigation) start at **level 1** — this is `skillMult`'s baseline (1 = no bonus yet, `skillMult(1) === 1.0`).
- **Gate skills** (destroyers, small_hybrid_turret, missiles, shield_operation, repair_systems, high_speed_maneuvering, electronic_warfare) start at **level 0** — they never feed `skillMult`, so 0 = "untrained" is the correct floor. Starting these at 1 would make a `requiredSkills: { destroyers: 1 }` gate trivially satisfied at game start, defeating the point of gating.

Training cost: `1000 × (currentLevel + 1)` SP for the next level. This makes a gate skill's first level cost 1,000 SP (not free), and existing stat skills' first upgrade now costs 2,000 SP instead of the old flat 1,000 — an intentional SP-economy shift that comes with this version (see plan risk notes).
