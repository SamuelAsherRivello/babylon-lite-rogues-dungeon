# Tasks

## 1. Scenario and URL support

- [x] 1.1 Add a named debug-scenario registry with deterministic hand-authored rooms, corridor joins, multiple widths, corners, and start/exit markers; verify each scenario is reproducible from its name and seed in focused Node tests.
- [x] 1.2 Extend URL parsing and campaign startup to select a scenario only when the tile-rendering debug flag and valid scenario name are present; verify ordinary seed and slot URLs remain unchanged in focused Node tests.
- [x] 1.3 Export scenario metadata and asset-relative Tiled maps through the existing editable-copy flow; verify the exported map validates and opens with Grounds, Walls, Pickups, and Decorations layers.

## 2. Canonical Wang layer resolution

- [x] 2.1 Replace seed-specific Wang fallback decisions with a deterministic exact-or-nearest authored Wang resolver that prioritizes cardinal edge agreement and records unresolved diagnostics; verify all scenario masks receive stable results without arbitrary cardinal fallback.
- [x] 2.2 Make runtime rendering and Tiled serialization consume the same semantic cells and resolved Walls layer result while preserving the single approved Grounds tile and authored repaired GIDs on import; verify generated export and runtime wall frames are identical.
- [x] 2.3 Add scenario repair comparison that records one repaired map's tile-layer differences without branching on random seed; verify a repaired scenario can be loaded and compared to its generated baseline.
- [x] 2.4 Add focused tests for Grounds-only walkable tiles, non-overlapping Walls, path connectivity, seed 17 and 914 regressions, seed 13579 stress masks, and deterministic multi-seed generation; verify with `node --test --test-isolation=none rogues-dungeon/test/game.test.ts`.

## 3. Browser verification and documentation

- [x] 3.1 Run one focused Playwright check for a named scenario URL, editable-copy action, and normal seed URL fallback; verify the game opens the scenario and the generated map has the expected metadata.
- [x] 3.2 Document the debug scenario URL format and one-repair workflow in the dungeon map documentation; verify the documented links and commands match the implementation.
- [x] 3.3 Run `npm run build` and the applicable final test suite; verify the production build succeeds and report any unavailable browser-only checks.
