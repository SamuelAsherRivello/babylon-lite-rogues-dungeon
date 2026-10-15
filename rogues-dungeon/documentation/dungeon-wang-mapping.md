# Dungeon tileset Wang mapping

Author: Codex, 2026-10-08. Source art: `../public/assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png` (384 × 288 pixels, 12 columns × 9 rows of 32-pixel tiles). Source tileset: `../public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx`. Local tile IDs below refer to that exact TSX. The wall and stone floor family occupies the first five rows; animated liquids, dirt, and props are excluded.

The `Walkable floor` region uses a **mixed** Wang set. Values are in Tiled's clockwise order `N, NE, E, SE, S, SW, W, NW`; `1` is painted floor and `0` is outside that region. The assignments follow the documented Dungeon Figure 8 limited profile and were checked against the exact source sheet. Tile 31 is an optional decorative variant of tile 1 and is excluded so the upper boundary has one predictable choice.

| Local tile ID | Wang values | Visual role |
| --- | --- | --- |
| 0 | 0,0,1,1,1,0,0,0 | Upper-left outer turn |
| 1 | 0,0,1,1,1,1,1,0 | Upper wall |
| 5 | 0,0,0,0,1,1,1,0 | Upper-right outer turn |
| 12 | 1,1,1,1,1,0,0,0 | Left wall |
| 13 | 1,1,1,1,1,1,1,1 | Stone floor |
| 17 | 1,0,0,0,1,1,1,1 | Right wall |
| 48 | 1,1,1,0,0,0,0,0 | Lower-left outer turn |
| 49 | 1,1,1,0,0,0,1,1 | Lower wall |
| 53 | 1,0,0,0,0,0,1,1 | Lower-right outer turn |
| 6 | 1,1,1,0,1,1,1,1 | One diagonal void at SE |
| 8 | 1,1,1,1,1,0,1,1 | One diagonal void at SW |
| 30 | 1,0,1,1,1,1,1,1 | One diagonal void at NE |
| 32 | 1,1,1,1,1,1,1,0 | One diagonal void at NW |

Proof result: Tiled 1.12.2 painted all 64 cells of the 8 × 8 room in `dungeon-wang-proof.tmx` using the nine outer-room roles above. `read_region` confirmed every expected local ID, and the rendered room has continuous walls and all four correct turns. Erasing and repainting its lower-right corner restored tile 53 and preserved the neighboring wall and floor tiles. A separate one-cell island probe returned `MISSING_WANG_PATTERN` for Wang ID `0` and changed no cells.

Fitness outcome: **Limited Wang-ready** for solid rectangular rooms with all four outer turns. The four diagonal-void assignments are included from the documented source profile but are not exercised by this fixture. A rectangular hole or narrow bridge requires additional masks, including `249, 243, 231, 207, 159, 63, 252, 126` (decimal, bit weights `N=1` through `NW=128`); the runtime resolver selects the nearest authored profile with cardinal edges weighted above diagonal corners and records the source mask for regression comparison.

## Runtime placement

The game applies this table to the full binary dungeon map. Each walkable cell samples `N, NE, E, SE, S, SW, W, NW` walkable neighbors. A complete mask (`255`) uses local tile `13`; an exact boundary mask uses its listed local ID; other masks use the deterministic nearest authored profile while preserving cardinal edge agreement. Blocked cells, including deep unreachable interiors, do not receive terrain sprites. The game and minimap use the same sparse coordinates. A named manual scenario can be opened with `?debug-fix-map-autotiled=1&scenario=corridor-joins&slot=1&seed=13579` to inspect and repair one focused topology at a time.
