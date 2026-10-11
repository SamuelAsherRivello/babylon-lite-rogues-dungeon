# World Generation Debugging

## Generation model

The active campaign follows `world -> realm -> level -> pass`. This milestone
uses one active 100-by-100 dungeon level: its authoritative terrain is
`floor.cells`, where each cell carries `walkable` and a semantic terrain
`role` such as `ground` or `wall`. The structured dungeon pass writes the
seeded rooms and corridors into that context, while entities, start/exit
positions, diagnostics, and generator metadata remain level data.

Movement, pathfinding, collision, combat targeting, rendering, Wang autotiling,
Tiled repair import/export, and saves consume semantic cells. A compatibility
`floor.map` view remains only at legacy save/test boundaries; new saved maps do
not use it as gameplay authority. The pass runner also supports scoped writes
and protected cells so later organic and structured passes can be composed
without overwriting reserved landmarks. Overworld terrain and stairs are
planned for later milestones and are not part of the current dungeon pass.

Map repair links use the following query parameters:

```text
?world=1&level=1&slot=1&seed=12345&mute=1&debug-fix-map-autotiled=1
```

`slot` accepts only `1`, `2`, or `3`. A valid slot skips the Saved Games menu. Missing or invalid slots use the normal menu. `seed` is an unsigned 32-bit value and is used only when the selected slot is empty. `level` selects the generated dungeon level for a new campaign. `randomSeed` remains accepted as a compatibility alias for `seed`.

When `debug-fix-map-autotiled=1` is present, the active campaign shows Map Fix controls. **Open Editable Copy** downloads a self-contained ZIP bundle. At the archive root it contains the `.tmj` file with `Grounds`, `Walls`, `Pickups`, and `Decorations` layers beside an `assets/` folder containing temporary copies of the dungeon `.tsx` and PNG art. Extract the bundle anywhere, then open the root `.tmj` file in Tiled; the art resolves beside it even when the download was saved in Documents.

Map properties include `world`, `level`, `seed`, `generatorVersion`, and `coordinateConvention: tile-origin`. `Grounds` is a pure walkability mask: every occupied cell uses the same walkable tile (GID 14), and every empty cell is non-walkable. Wang and manually corrected wall art belongs only on `Walls`; `Pickups` contains loot objects, and `Decorations` contains other map objects and player/exit markers. The browser no longer needs to write into the project folder or ask for a project-specific save location.

Edit the exported map in Tiled, preserve its 100-by-100 dimensions and required layers, then load it through **Load repaired map**. The validator requires player and exit markers on walkable cells and rejects invalid files without replacing the active floor. The repaired walkability layer drives collision and pathfinding, while the imported Ground and Wall GIDs are retained for identical game and minimap rendering.

Repository-hosted fixtures can also be opened directly with a base-relative `map`, for example `?world=1&level=1&slot=1&seed=17&mute=1&debug-fix-map-autotiled=1&map=debug/fixtures/floor-17.tmj`.

The map-fix flag is opt-in. Ordinary player URLs do not expose export/import controls and continue using the regular save menu and generated floors.
