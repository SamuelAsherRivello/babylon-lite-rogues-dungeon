# Rogue's Dungeon

Rogue's Dungeon is a single-player medieval dungeon roguelite. Explore a procedural crypt one grid step at a time, fight between turns, gather equipment, and carry permanent character growth into each new descent.

## Original AI Prompt

<details>
<summary>Read the full original prompt (edited for grammar, punctuation, spelling, and formatting)</summary>

```text
Use $ai-skills-create-game to replace this prompt with a 2D single-player dungeon-crawling game. The game saves to local storage and has three save slots. Character stats improve over time and save to storage. Each time you die, you restart in a procedural dungeon. It's a roguelite-style game.

Use the template project's 2DPixelPerfect style with a 1.0 render scale, so each tile keeps its original size for a crisp look. Use WASD to walk one grid space at a time; each move advances the on-screen “Time: 1” counter by one. Enemies can move only when time advances, and they move one grid space per time unit.

Use assets formatted for Tiled. I'll provide folders to copy from and use for the assets; let them inspire the hero, enemies, pickups, items, and environment.
```
</details>

## Live Demo

- [Play Rogue's Dungeon](https://samuelasherrivello.github.io/babylon-lite-rogues-dungeon/)

## Images

<a href="rogues-dungeon/documentation/screenshot01.png"><img src="rogues-dungeon/documentation/screenshot01.png" width="640" alt="Rogue's Dungeon gameplay with the player exploring a procedural crypt" /></a>

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Details](#project-details)
3. [Credits](#credits)

## Getting Started

1. Install Node.js 24 (the CI-supported version) and run `npm ci` from the repository root.
2. Use the `ai-skills-project-run-start` skill to start the local server. It selects an available port and returns the silent test URL (`?mute=1`).
3. Run `npm run typecheck` for strict application and tooling checks, and `npm test` for the TypeScript Node tests.
4. Run `npm run build` to type-check and create the production site in `rogues-dungeon/dist/`.

The project uses TypeScript throughout its executable source, tests, and configuration.
Vite loads `rogues-dungeon/src/main.tsx` through `rogues-dungeon/index.html` and
`vite.config.ts`. Node tests run through `tsx` without emitting JavaScript.
See [browser verification](rogues-dungeon/documentation/browser-verification.md)
for the muted Playwright smoke and full-suite commands.

## URL Arguments

- `?randomSeed=235234` starts a deterministic new campaign with that unsigned 32-bit seed when an empty save slot is selected. Existing saves resume unchanged.
- `?mute=1` mutes all audio, including when combined as `?randomSeed=235234&mute=1`.

The 50 unwalkable tiles closest to a new run's start room use the wall edge, corner, and solid wall-face frames demonstrated by `Tiled_Examples/wall_combinations01.tmx`. The rest of the procedural map retains the general wall treatment.

## Controls

- Move one tile with WASD or the arrow keys. Pair directions for diagonal movement.
- On touch devices, use the on-screen eight-way pad.
- Bump into enemies to attack, gear to collect/equip, chests to open, and stairs to descend.
- Click the center diamond on the movement pad to Brace.
- Use Zoom to select Half (0.5×), Native (1.0×), or Double (2.0×).

Every accepted move advances Time by one and gives enemies one action. Blocked moves do not spend a turn. Diagonals cannot pass between blocked corners. The three local campaign slots autosave the current run after each turn. Death restarts the dungeon run while retaining stats, level, and unspent experience.

## Project Details

- `rogues-dungeon/src/game/` contains shared domain contracts in `types.ts`, pure game helpers, and the React game composition in `Game.tsx`.
- `rogues-dungeon/src/systems/` contains procedural generation, turn rules, persistence, maps, audio, and rendering integration.
- `rogues-dungeon/src/content/` and `rogues-dungeon/src/ui/` contain the game surface and viewport UI.
- `rogues-dungeon/public/assets/` contains supplied Tiled-compatible pixel art and sample maps.
- `openspec/changes/rename-to-rogues-dungeon/` contains the active rename proposal, design, and task list.
- [`rogues-dungeon/documentation/original-prompt.md`](rogues-dungeon/documentation/original-prompt.md) records the original game request and clarifications.
- [`rogues-dungeon/documentation/asset-provenance.md`](rogues-dungeon/documentation/asset-provenance.md) records artwork origin and license status.

## Release

The project uses the repository's GitHub Pages and Release workflows. Build and verify the project before pushing to `main`; run the Release workflow to bump the version and publish a tagged release.

## Credits

- Samuel Asher Rivello - Over 25 years of game development XP (2026)
- Provided as-is under the [MIT License](LICENSE).
