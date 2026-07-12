# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EVE: Rogue is an EVE Online-inspired roguelike browser game: fit a frigate in station, undock into Abyssal Deadspace, fight through nodes for ISK, and go deeper. Built with React 19 + Vite in plain JSX (no TypeScript), Zustand for state, and three.js via @react-three/fiber for the 3D battle scene.

Note: git history contains a deleted Unity/C# prototype and design docs (removed in commit 358920f). The current codebase is web-only; ignore Unity references in old commits.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — serve the production build
- `npm run lint` — oxlint (not ESLint); config in `.oxlintrc.json`

There is no test framework configured.

## Architecture

### View flow (App.jsx)

`App.jsx` is a three-view state machine held in local `useState`: `'station'` → `'map'` → `'space'`. The game loop: StationHub (fit ship) → UNDOCK → MapScreen (pick a deadspace node) → BattleScene (combat) → victory pays ISK + advances depth → back to map, or dock to return to station. StationHub has three tabs: FITTING (FittingWindow), INDUSTRY, and SKILLS.

### Game state (src/store/gameStore.js)

Single Zustand store holding all persistent player state: ISK, skill points, skills, blueprints, module inventory, `deadspaceDepth`, and `activeShip` (a ship definition plus `fittedModules: { high, mid, low }`). `fitModule` enforces the fitting rules: slot type must match, slot count per rack, and total PG/CPU across all fitted modules must fit the ship's effective `resources` (Engineering skill raises capacity). The exported `skillMult(level)` helper defines the skill-bonus convention: level 1 is baseline, +5% per level past 1 — used for Engineering (PG/CPU), Gunnery (weapon damage), and Navigation (speed). Other actions: `manufacture(blueprint)` (INDUSTRY tab), `trainSkill` (SKILLS tab), and `shipDestroyed()` (defeat: fitted modules are lost, depth resets to 1, ISK and hangar survive). There is no save system — state resets on refresh.

### Static content (src/data/)

`ships.js` and `modules.js` export plain objects keyed by id, using EVE conventions: ships have `slots` (high/mid/low counts), `resources` (pg/cpu/capacitor), `defense` (shield/armor/hull HP with per-damage-type resists, sig radius), `mobility` (incl. `agility`, the inertia time constant in seconds); modules have `slot` (which rack), `cost` ({pg, cpu, cap}), and type-specific `stats`.

`npcs.js` defines enemy ships plus `getEncounter(depth, nodeType)`, which scales NPC HP and damage by depth (`1 + 0.15×(depth−1)`, elite nodes ×1.5) and computes the ISK reward (elite ×2). MapScreen's two nodes pass `'patrol'` or `'elite'` through App to BattleScene.

A module's `type` string ('hybrid_weapon', 'missile_weapon', 'shield_repair', 'armor_repair', 'propulsion', 'ewar') drives its combat behavior via branches in BattleScene's module-processing loop — adding a new module type means adding a branch there.

### Combat (src/components/BattleScene.jsx)

The most complex file. Real-time sim inside a react-three-fiber `<Canvas>`, updated by a `useFrame` loop. Critical pattern: all simulation state lives in **refs** (positions, velocities, capacitor, shield/armor/hull in `playerHp`/`enemyHp`, module cooldown timers in `modulesStateRef`) and is mutated every frame; React state is only synced a few times per second for the HUD, plus a `setForceRender` call when module active-states change. Don't move sim state into React state. `PhysicsUpdater` is a module-level component that runs `stepRef.current()` each frame — the step closure is reassigned every render so it sees fresh state, while the component itself never remounts; movement commands reach the sim through `commandRef`.

Implements EVE mechanics: capacitor recharge curve, turret hit-chance formula (optimal/falloff distance penalty + tracking vs. relative angular velocity), wrecking shots, per-layer damage resists on both sides, inertia (velocity eases toward the commanded vector with `agility` as time constant), missile range check (holds the cycle instead of wasting it), and approach / orbit / keep-at-range / stop commands. The enemy is built by `getEncounter` and has simple AI: it orbits the player at `ai.orbitRange` and fires its weapon on cooldown; the player's `ewar` web halves its speed, `armor_repair` heals armor. Battle ends when either side's hull reaches 0 (`battleOverRef` freezes the sim); victory pays the scaled bounty, defeat calls `shipDestroyed()`.

**Units convention:** data files use EVE units (meters for ranges, m/s for speed); the 3D scene uses world units where 1 unit = 1 km. Hence `dist * 1000` when comparing scene distance to module optimal/falloff, and `base_speed / 1000` for scene movement speed (0.315 u/s for a 315 m/s frigate). Angular velocity is therefore in real rad/s, which the hit formula's `×40000` factor is calibrated for. Ships spawn 4 km apart; ship meshes are rendered at an exaggerated scale (0.25 group scale) for visibility.

### Styling

EVE-style dark sci-fi theme defined as CSS custom properties in `src/index.css` (`--color-*`, `--font-display` = Orbitron for headers/numbers, Inter for body). Components mostly use inline styles referencing those variables, with a few dedicated CSS files (e.g. `FittingWindow.css`). Global `button`, heading, and glass-panel styles come from `index.css`.

## Current gaps (intentional, MVP in progress)

- No save system: refresh wipes all progress.
- Only one NPC type (`guristas_frigate`); depth/elite scaling is numeric only.
- Missile `explosion_radius` / `explosion_velocity` stats exist but are unused (missiles simply always hit in range); the enemy has no capacitor simulation.
- Drone bay/bandwidth on ships are unused; the Kestrel is defined but not purchasable/selectable.
- Damage does not bleed through layers within a volley (a volley that breaks a layer wastes its overflow).
