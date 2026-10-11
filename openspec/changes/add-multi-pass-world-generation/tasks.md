# Tasks

## 1. Milestone 1 — Refactor the existing dungeon and migrate the map model (medium complexity)

- [x] 1.1 Define the world/realm/level identity and authoritative semantic-cell context, including dimensions, terrain roles, walkability, seed, generator metadata, protected cells, entities, and diagnostics; verify the context represents the current 100-by-100 dungeon without requiring `floor.map`.
- [x] 1.2 Add the ordered pass runner with scoped writes and protected-cell handling; verify pass-order, scope, and protected-cell unit tests cover both accepted and rejected writes.
- [x] 1.3 Port the current seeded room, room-socket, corridor-width, start, exit, enemy, chest, and pickup generation behind the first structured dungeon pass; verify deterministic generation and connected-floor tests use semantic cells.
- [x] 1.4 Migrate movement, diagonal collision, enemy movement, A* pathfinding, combat targeting, and gameplay actions from `floor.map` reads to semantic-cell queries; verify focused turn, combat, pathfinding, and blocked-move tests pass.
- [x] 1.5 Migrate campaign creation, descent, death reset, autosave, save migration, and new-game seed handling to persist semantic cells; verify legacy campaigns load without geometry or coordinate changes and new saves contain no authoritative `floor.map`.
- [x] 1.6 Migrate Tiled repair import/export and world rendering/autotiling to semantic cells while preserving current dungeon terrain, wall, actor, start, exit, and minimap coordinates; verify round-trip, map validation, and game/minimap renderer tests pass.
- [x] 1.7 Remove production reads and writes that treat `floor.map` as gameplay authority, retaining only explicitly tested legacy adapters; verify repository search and the focused Node suite show no unapproved runtime map dependency.
- [x] 1.8 Document the world/realm/level/pass model, semantic-cell contract, legacy migration, and milestone-1 generation behavior; verify every documented seed/debug command remains runnable.
- [ ] 1.9 Run one focused muted browser smoke check for the migrated dungeon and then perform the requested human playtest with at least two fixed seeds; verify the dungeon is playable, the exit is reachable, and feedback is recorded before milestone 2 changes begin.

## 2. Milestone 2 — Improve dungeon generation (medium complexity)

- [ ] 2.1 Replace the implicit room chain with an explicit seeded room graph that guarantees a start-to-exit spanning route and can add bounded branches or loops; verify graph connectivity and deterministic graph tests.
- [ ] 2.2 Add room roles and corridor-quality controls for arenas, treasure rooms, hubs, dead ends, socket placement, corridor width, and bend/intersection behavior; verify generated fixtures cover each role and corridor constraint.
- [ ] 2.3 Add post-generation quality validation for reachability, minimum room/corridor dimensions, required distance or pacing constraints, entity bounds, and protected cells; verify invalid seeded fixtures produce diagnostics or deterministic repair rather than activating silently.
- [ ] 2.4 Tune encounter and reward placement against the improved topology without changing turn, combat, inventory, or save semantics; verify focused gameplay tests cover entity placement, reachable stairs, and stable difficulty scaling.
- [ ] 2.5 Update generation documentation with the room graph, role parameters, debug fixtures, and known tuning controls; verify the documented seeded comparison workflow reproduces the expected layouts.
- [ ] 2.6 Run one focused muted browser smoke check for the improved dungeon and then perform the second human playtest; verify branches, loops, pacing, combat spaces, and exit reachability are acceptable before milestone 3 begins.

## 3. Milestone 3 — Add the organic overworld and level transitions (high complexity)

- [ ] 3.1 Add an overworld level family and deterministic organic terrain pass that starts walkable-majority and exposes dimensions, seed, density, scale, and protected/reserved-area parameters; verify fixed-seed output and tunable-density unit tests.
- [ ] 3.2 Generate organic mountain obstacles with semantic terrain roles and preserve or repair routes between the start, exit, entrances, and mandatory landmarks; verify flood-fill/path tests for mountain-heavy, sparse, and edge-case seeds.
- [ ] 3.3 Add pass scopes or reservation masks so structured homes or other rectilinear subareas can be applied to selected overworld cells without erasing surrounding organic terrain; verify a composed overworld fixture containing both terrain families.
- [ ] 3.4 Extend map projection, autotiling inputs, minimap rendering, and active-level selection to consume overworld semantic terrain through the same coordinates and interfaces as the dungeon; verify renderer-neutral game/minimap equality tests for both level families.
- [ ] 3.5 Add a controlled development entry point or deterministic level selection for entering the overworld without requiring a complete travel UI; verify a seeded browser launch can display and move through the overworld with audio muted.
- [ ] 3.6 Add deterministic bidirectional stairs within 30 grid cells of each level start, load the adjacent level on collision, restore the paired return level, and support a level 3 when level 2 has another forward stair set; verify transition graph, stair placement, collision, HUD level, save/restore, and return-position tests.
- [ ] 3.7 Document overworld parameters, mountain-density expectations, reserved structured-area behavior, level-transition rules, and the boundary between generation and rendering; verify the documented seeded overworld workflow produces a repeatable map and level sequence.
- [ ] 3.8 Perform the third human playtest and run the full applicable Node and browser finalization suites; verify organic mountains read as non-rectilinear, most of the map is walkable, required destinations remain reachable, stairs go forward and backward correctly, and the existing dungeon remains playable.
