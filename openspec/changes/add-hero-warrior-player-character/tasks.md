# Tasks

## 1. Character asset contract and catalog

- [ ] 1.1 Run the Tiled character workflow setup, inspect the active document and repository actor conventions, and verify whether the current player is represented in Tiled data or only in runtime state; preserve the existing player cell contract and save any Tiled changes explicitly only if the inspected document requires them.
- [ ] 1.2 Add a Hero Warrior catalog for `Idle`, `Run`, `Attack`, and `Death`, preserving Down/Side/Up variants and every supplied frame; verify the catalog against the 42 32x48 frames and 6 48x48 frames under `public/assets/Characters/Hero_Warrior/Frames`.
- [ ] 1.3 Add pure catalog validation and animation-selection tests covering paths, dimensions, frame counts, directions, loop/completion behavior, deterministic initial Idle selection, and deferred Attack/Death reachability; verify with the focused Node test command.
- [ ] 1.4 Update asset provenance and character documentation with the supplied pack source, the four animation mappings, the 32x48/48x48 dimensions, the feet-anchor rule, and any unverified license limitation; verify every documented runtime path exists.

## 2. Player renderer integration

- [ ] 2.1 Replace the static Hero Warrior texture/one-cell atlas path with shared catalog texture loading and per-frame actor resources while retaining nearest filtering, WebGPU-only initialization, and complete disposal; verify renderer-focused tests cover texture/atlas cleanup.
- [ ] 2.2 Render the initial player with the Idle animation and stable default direction, advance frames according to the catalog, and expose valid selection for all animations without changing movement, combat, save, or logical coordinates; verify the player and animation-selection tests pass.
- [ ] 2.3 Apply the explicit feet pivot so 32x48 and 48x48 frames bottom-align to the player's 32x32 cell while the upper artwork may extend upward; verify an anchoring test asserts the display position and unchanged world cell.
- [ ] 2.4 Preserve the renderer-neutral world/minimap contract so the game view animates the Hero Warrior while the minimap keeps one logical player marker; verify world-rendering tests cover matching player coordinates and realm changes.

## 3. Browser-visible verification

- [ ] 3.1 Run one focused Playwright check against the game with `?mute=1` after renderer integration, using representative desktop and portrait layouts to verify the Hero Warrior is visible, taller than one grid cell, idle-animated, and feet-aligned while the player moves; verify console errors are reported separately from known non-blocking warnings.

## 4. Final integration checks

- [ ] 4.1 Run the repository's applicable focused tests and build checks, then run the full finalization suite including the browser suite where available with `?mute=1`; verify no unrelated working-tree changes are included.
- [ ] 4.2 Report the final asset mappings, changed character/runtime/documentation files, any Tiled artifact touched, test/build/browser results, and intentionally deferred gameplay triggers; verify every result link points to an existing file.
