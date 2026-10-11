# Tasks

## 1. Generic animation-system contract

- [x] 1.1 Add the reusable animation entity contract for animation registration, listing, selection, start/stop state, current frame, completion, and disposal; verify the expected module exports are present.
- [x] 1.2 Normalize both grid-based sprite-sheet descriptors and ordered individual image-frame lists into one validated frame sequence; verify tests reject missing sources, empty lists, inconsistent metadata, and unknown animation names.
- [x] 1.3 Implement frame timing and `loopCount` semantics where `-1` loops forever, `0` plays once, and positive values add that many repeats; verify focused tests cover completion, explicit stop, and frame progression.
- [x] 1.4 Document the generic system's entity ownership and controls for character and non-character image animations; verify the documentation matches the exported behavior.

## 2. Hero Warrior catalog and integration

- [x] 2.1 Run the Tiled character workflow setup, inspect the active document and repository actor conventions, and verify whether the current player is represented in Tiled data or only in runtime state; preserve the existing player cell contract and save any Tiled changes explicitly only if the inspected document requires them.
- [x] 2.2 Register Hero Warrior `Idle`, `Run`, `Attack`, and `Death` through the generic system, preserving Down/Side/Up variants and every supplied frame; verify the catalog against the 42 32x48 frames and 6 48x48 frames.
- [x] 2.3 Add pure Hero catalog and adapter tests covering paths, dimensions, frame counts, directions, initial Idle selection, and direct reachability of deferred Attack/Death animations; verify with the focused Node test command.
- [x] 2.4 Update asset provenance and character documentation with the supplied pack source, four animation mappings, 32x48/48x48 dimensions, feet-anchor rule, loop semantics, and any unverified license limitation; verify every documented runtime path exists.

## 3. Player renderer integration

- [x] 3.1 Replace the static Hero Warrior texture/one-cell atlas path with shared generic animation-entity resources while retaining nearest filtering, WebGPU-only initialization, and complete disposal; verify renderer-focused tests cover texture/atlas cleanup.
- [x] 3.2 Render the initial player with the Hero Idle animation and stable default direction, while keeping Run, Attack, and Death available through the generic controls without changing movement, combat, save, or logical coordinates; verify player and animation-selection tests pass.
- [x] 3.3 Apply the explicit feet pivot so 32x48 and 48x48 frames bottom-align to the player's 32x32 cell while the upper artwork may extend upward; verify an anchoring test asserts the display position and unchanged world cell.
- [x] 3.4 Preserve the renderer-neutral world/minimap contract so the game view animates the Hero Warrior while the minimap keeps one logical player marker; verify world-rendering tests cover matching player coordinates and realm changes.

## 4. Browser-visible verification

- [x] 4.1 Run one focused Playwright check against the game with `?mute=1` after renderer integration, using representative desktop and portrait layouts to verify the Hero Warrior is visible, taller than one grid cell, idle-animated, and feet-aligned while the player moves; verify console errors are reported separately from known non-blocking warnings.

## 5. Final integration checks

- [x] 5.1 Run the repository's applicable focused tests and build checks, then run the full finalization suite including the browser suite where available with `?mute=1`; verify no unrelated working-tree changes are included.
- [x] 5.2 Report the final animation-system API, asset mappings, changed character/runtime/documentation files, any Tiled artifact touched, test/build/browser results, and intentionally deferred gameplay triggers; verify every result link points to an existing file.
