# World rendering and camera coordinates

`src/systems/rendering/world-render-system.ts` builds renderer-neutral terrain, actors, objects, and markers from one campaign floor. Game and minimap views use the same 32-unit world coordinates and wall-frame selection; view/detail arguments change presentation only. The minimap independently fits the full realm. It does not read game Zoom or Camera.

The game view uses Center, Deadzone, or Screen camera policies. Deadzone keeps the player within a centered rectangle 30% of the visible width and height. Screen pages use the visible world span and retain the player's actual world coordinates. Camera math and pointer-to-cell projection use the same world-center conversion. A held selection remains its original map cell and is reprojected as the camera follows; minimap has no pointer input or reticle.

The current camera mode is reapplied after a viewport, layout, browser zoom/DPR, world-zoom, camera-mode, or floor change. Center and Deadzone reset around the player; Screen resolves the page containing the player. When the map is at least as large as the visible cell span, camera framing clamps to its tile bounds so it does not show renderer clear space beyond the level. At low zoom, a viewport can exceed the finite 100 by 100 map; that case retains the map's finite bounds rather than inventing an infinite backdrop.

Turn presentation supplies shared sub-grid coordinates only for the player, enemies, and pushable barrels. Both views sample those positions while a turn is animating. The floor trigger and door remain at their grid coordinates and switch visual state; camera feedback uses its own view-transform animation rather than the sub-grid mover list.

The floor trigger is a floor-panel layer: it renders above terrain and below walls, props, pickups, barrels, doors, enemies, and the player. Its sprite is anchored half a tile lower than the cell center, which keeps the panel on the floor beneath the object activating it.

## World depth order

The game view uses three render passes. Walkable terrain renders first. Floor-attached decals such as triggers render next. Floor traps render above those decals, and settled combat particles render above floor traps. Walls, other decorations, props, pickups, stairs, barrels, enemies, player, moving coins, and non-owner-fixed particles share the world-depth pass.

The shared pass sorts by a visual's ground-contact pixel Y coordinate. Wall rows use their front edge. Moving entities use their presented sub-grid position. Equal Y positions use a category tie-break and then a stable ID. A composite entity has adjacent orders, with its shadow immediately before its main art. Player, rat, skeleton, and barrel all use that contract.

The targeting reticle, tooltip, diagnostics, and pivot markers remain screen overlays. Heal smoke is fixed above its player and does not compete with unrelated world Y positions. The minimap receives the same terrain and presented mover coordinates but does not use game-view occlusion ordering.

Zoom presets are 0.25, 0.5, 1, 2, and 4. At 1, a 32-unit tile is intended to occupy 32 CSS pixels; renderer backing density is handled separately. Babylon Lite is WebGPU-only. Unsupported WebGPU surfaces display the existing initialization message and do not fall back to another renderer. Auxiliary canvas APIs available in the installed package include `createSurface`, `resizeSurface`, and `disposeSurface`; renderers may bind directly to a surface.
