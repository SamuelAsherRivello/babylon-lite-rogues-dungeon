# Proposal

## Why

Rogue's Dungeon currently has a working seeded dungeon generator, but its world model treats generation as one specialized floor function. The planned game needs a stable hierarchy of world, realm, and level, where each level can be built by ordered passes: structured dungeon carving, organic terrain, water, authored interiors, and gameplay placement.

This change establishes that pipeline in three playtestable milestones. The first preserves the existing dungeon experience behind the refactored structure, the second improves dungeon topology and pacing, and the third adds a mostly walkable overworld with organic mountain obstacles.

## What Changes

- Define a level-generation contract for one active world, realm, and grid level.
- Add ordered, deterministic generation passes that operate on a shared level grid and semantic cell data.
- Refactor the existing rectilinear dungeon generator into the first pass-based implementation while replacing the binary `floor.map` with the new semantic-cell grid in milestone 1.
- Preserve seeded generation, start/exit reachability, entity placement, gameplay behavior, and save compatibility through an explicit legacy-map migration.
- Improve dungeon generation in milestone 2 with explicit topology controls such as branching, loops, room roles, corridor quality, and post-generation validation.
- Add an overworld level family in milestone 3 that starts mostly walkable and creates organic blocked mountain regions with a deterministic noise-based pass.
- Keep later passes scoped by masks or reserved areas so an overworld can contain planned homes and an underworld can contain organic features such as lakes without forcing every algorithm to modify every cell.
- Add generation diagnostics and focused tests for determinism, pass ordering, connectivity, terrain ratios, and protected gameplay cells.
- Add focused browser evidence after browser-visible generation changes; reserve the full applicable suite for finalization.

## Capabilities

### New Capabilities

- `level-generation-pipeline`: Defines the world/realm/level model, shared grid contract, deterministic ordered passes, pass scopes, protected cells, validation, and generation metadata.
- `organic-overworld-generation`: Defines mostly walkable overworld levels with organic blocked mountain terrain, deterministic seeds, connectivity preservation, and room for later authored or structured subregions.
- `level-transitions`: Defines bidirectional stairs that connect generated levels and update the active level without requiring simultaneous multi-level rendering.

### Modified Capabilities

- `world-map-rendering`: Extend the renderer-neutral map contract so terrain roles and cell semantics produced by multiple level-generation passes remain consistent between the game view and minimap.

## Impact

- Affected generation code: `rogues-dungeon/src/systems/procedural-generation/procedural-generation-system.js` and new pass-oriented modules under that system.
- Affected game/session integration: world, realm, level, descent, campaign creation, and migration paths in the procedural-generation and persistence systems.
- Affected rendering model: `rogues-dungeon/src/systems/rendering/world-render-system.js` and map/autotiling systems where terrain roles expand beyond the current dungeon-only assumptions.
- Affected tests and documentation: procedural-generation unit tests, renderer-neutral map tests, seeded browser smoke coverage, and world-generation documentation.
- No new runtime dependency is required for the dungeon refactor or overworld noise pass; the exact noise implementation and tuning remain an implementation decision recorded in design and validated through playtesting.

## Milestones

### Milestone 1: Existing dungeon through the new structure

Create the world/realm/level data contract and pass runner. Port the current seeded room-and-corridor dungeon as the initial structured pass and migrate gameplay, rendering, Tiled repair maps, and saves from binary `floor.map` to semantic cells. Preserve current gameplay behavior and stop for user playtesting before changing dungeon quality.

### Milestone 2: Improve dungeon generation

Use playtest feedback to improve the dungeon generator with a richer room graph, optional branches and loops, room roles, corridor quality, encounter pacing, and validation. Keep the result deterministic and compatible with the shared pass pipeline.

### Milestone 3: Add the organic overworld and level transitions

Add a mostly walkable overworld level family and bidirectional level transitions. Generate organic mountain obstacles from a deterministic noise field, place stairs within 30 grid cells of the current level's start, load the adjacent level on collision, and return through the corresponding stairs. Leave scoped insertion points for authored homes, structured interiors, water, and other future passes.

## Open Decisions

- The exact world/realm selection and transition UI is not part of this proposal unless required by implementation; milestone 3 may use a deterministic development entry point first.
- The preferred noise variant and mountain tuning should be selected during milestone 3 after comparing visual density and playability.
- Authored interior templates and organic water are represented as future compatible passes, but are not required to ship in milestone 3 unless playtesting demonstrates that they are necessary for the overworld slice.
