# Design

## Context

See [proposal.md](proposal.md) for the motivation and milestone boundaries. The current project already separates procedural generation, map/autotiling, rendering, and persistence systems. The current generator produces a 100-by-100 binary dungeon map with seeded rooms, width-aware L corridors, entities, and a start/exit contract, but gameplay, rendering, Tiled repair, and persistence still read `floor.map` directly.

## Goals / Non-Goals

**Goals:**

- Establish explicit world, realm, and level identity without forcing a simultaneous multi-level runtime.
- Make a level a sized semantic grid plus an ordered list of deterministic passes.
- Port the existing dungeon as the first pass-based generator and make semantic cells authoritative for gameplay, rendering, Tiled repair, and persistence.
- Allow later passes to target the full grid, reserved masks, or protected subareas.
- Add a mostly walkable organic overworld without coupling organic terrain to the dungeon algorithm.
- Keep renderer-neutral semantic terrain separate from Wang/autotile presentation.

**Non-Goals:**

- Generating or streaming multiple visible levels at once.
- Adding a full world map UI, travel UI, or campaign navigation screen in this change.
- Adding authored home interiors, water, or every possible terrain type before the three milestones are playtested.
- Replacing Babylon Lite, the current save system, or the current movement/combat rules.
- Adding a runtime noise dependency before the overworld implementation demonstrates a need for one.

## Decisions

### Use a level context and pass runner

Introduce a renderer-neutral level-generation context containing world ID, realm ID, level ID, seed, width, height, semantic cells, entities, protected cells, diagnostics, and generation metadata. A pass receives the context and returns controlled changes plus diagnostics. The runner applies passes in declared order and does not let rendering concerns enter the generation context.

Alternative considered: keep one `generateFloor` function with conditional branches. Rejected because it would make overworld, dungeon, and future local passes share an increasingly opaque function and would make pass ordering hard to test.

### Make semantic cells authoritative from milestone 1

Cells carry semantic terrain roles and walkability that work for both families. The dungeon pass writes rooms and corridors into a blocked-majority grid; the overworld pass writes a walkable-majority grid and organic obstacle roles. The renderer derives ground, wall, mountain, water, or future art entries from those roles. `floor.map` is removed from newly generated active floors as a gameplay authority; migration adapters convert legacy saved maps and repaired Tiled maps into semantic cells at load/import boundaries.

Alternative considered: preserve `floor.map` as a parallel authority. Rejected because writes could diverge between movement, generation, rendering, and persistence. A temporary boundary adapter is acceptable only at legacy input/output edges.

### Make pass scope explicit and protected cells authoritative

Passes can target `all`, a generated mask, a reserved rectangle/region, or cells matching a semantic predicate. Required gameplay cells are registered as protected before destructive terrain passes run. A later pass can intentionally replace an earlier role only when its scope and priority allow it.

Alternative considered: let every pass scan and freely overwrite the complete grid. Rejected because a mountain pass could seal a start, a home pass could erase a road, and debugging would not reveal ownership.

### Use specialized geometry generators

Milestone 1 keeps the existing seeded room-and-corridor construction as a structured dungeon pass. Milestone 2 improves its room graph, branches, loops, and pacing. Milestone 3 adds a deterministic organic field pass for overworld mountains, followed by connectivity repair and protected-area handling.

Alternative considered: use Wave Function Collapse as the universal generator. Rejected for this scope because gameplay connectivity and room/exit guarantees are clearer with constructive passes; WFC remains a possible local decoration or template pass later.

### Model transitions as a level graph, not simultaneous maps

Milestone 3 stores generated levels and their paired stair links as a small in-memory level graph, while only one level is active in gameplay and rendering. A transition record identifies the source level, destination level, source stair, destination stair, and return position. Stairs use a deterministic seeded candidate search constrained to a reachable cell within a radius of 30 grid cells from the level start; if a candidate is blocked, the search continues through the ordered candidate list.

Alternative considered: regenerate the previous level whenever the player walks back. Rejected because regeneration could move stairs, loot, enemies, or repaired geometry and would not guarantee a true return path.

### Validate after structural passes and before activation

The runner validates dimensions, protected-cell walkability, start/exit presence, required reachability, entity bounds, and semantic-role consistency. A repair-capable pass may fix a failure deterministically; otherwise generation returns diagnostics and the caller does not activate the invalid result.

Alternative considered: rely only on tests and assume seeds are valid. Rejected because future pass combinations and tuning changes can create invalid maps even when each pass is locally correct.

### Preserve current save compatibility through migration

Existing floors remain loadable through migration. If a saved floor contains a legacy binary map, migration converts each cell to semantic cells before gameplay resumes. New floors persist semantic cells plus generator family, pass metadata, seed, dimensions, and level identity. Export/import adapters may temporarily serialize the legacy binary form only where an existing external contract requires it.

Alternative considered: regenerate every loaded floor using the new pipeline. Rejected because it would change active player locations and break existing campaign state.

## Risks / Trade-offs

- [Risk] Pass ordering can make results difficult to reason about. -> Record pass names, parameters, write counts, and diagnostics in generation metadata and expose seeded debug fixtures.
- [Risk] Organic mountains can disconnect required content. -> Reserve start, exit, entrances, and landmarks before obstacle generation, then run flood-fill/path validation and deterministic repair.
- [Risk] Semantic terrain roles may exceed the current Wang mapping. -> Keep renderer derivation separate, use explicit unsupported-role diagnostics, and avoid inventing art mappings.
- [Risk] The existing campaign schema has legacy field variations. -> Preserve the current migration path and add focused round-trip tests for legacy and pass-aware floors.
- [Risk] A single fixed grid may limit future large overworlds. -> Keep width and height in the level context and avoid hard-coding 100-by-100 assumptions in the pass API; defer streaming.
- [Risk] Noise tuning may produce visually attractive but tactically poor mountains. -> Treat milestone 3 as a playtestable slice with tunable parameters and density/connectivity telemetry before locking defaults.

## Migration Plan

1. Add the pass-oriented semantic level contract and migration adapters while retaining legacy reads only at load/import boundaries.
2. Route campaign creation, descent, death-reset generation, movement, pathfinding, rendering, Tiled repair, and saves through semantic cells produced by the structured dungeon pass.
3. Stop for milestone 1 playtesting and record dungeon feedback before changing generation parameters.
4. Add dungeon graph and quality passes, update deterministic tests and fixtures, then stop for milestone 2 playtesting.
5. Add the organic overworld generator and a development entry point or controlled level selection for milestone 3.
6. Run focused Node tests after each group, one muted browser smoke check after browser-visible generation integration, and the full applicable suite during finalization.

Rollback is pass-family selection for new generation; legacy saves remain recoverable through the map-to-cell migration adapter. Reverting the semantic-cell runtime model after milestone 1 would require a separate migration change and is not an in-scope rollback.

## Open Questions

- The default realm/level transition presentation can be decided after milestone 1 playtesting because it does not change the pass contract.
- The exact organic-noise implementation and mountain thresholds can be tuned during milestone 3 without changing the semantic grid or pass interfaces.
- The exact meaning of "within 30 grids" is treated as a bounded grid-radius candidate search rather than a gameplay-visible distance metric; the implementation should document the chosen cardinal/diagonal distance convention when milestone 3 is applied.
