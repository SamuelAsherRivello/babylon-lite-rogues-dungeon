# Tasks

## 1. Define and test depth inputs

- [x] 1.1 Extend the render-order helper tests with wall-front-edge, equal-Y object, and composite shadow/main cases, and verify the focused Node tests pass.
- [x] 1.2 Document the repaired floor, wall, object, and character depth contract in `rogues-dungeon/documentation/world-rendering.md`, and verify it agrees with the `world-map-rendering` specification delta.

## 2. Repair game-view world ordering

- [x] 2.1 Update the Babylon Lite renderer so each wall, occluding object, moving item, and character receives its final shared-pass order from its displayed ground contact, while terrain and floor decals retain their fixed passes; verify `npm run typecheck` passes.
- [x] 2.2 Preserve deterministic category ties and adjacent shadow/main orders for every composite pickup, barrel, enemy, and player sprite; verify focused render-order and character-sprite tests cover the resulting sequence.
- [x] 2.3 Add a representative wall-boundary rendering fixture or regression assertion that covers a floor, wall, object, and moving character together; verify `npm test` passes.
- [x] 2.4 Run one focused muted Edge Playwright check against the implementation on a project-owned server, capture the wall-boundary scene, and verify the game screen and canvas load without console errors.

## 3. Final integration verification

- [x] 3.1 Run `npm run typecheck` and `npm test` after the renderer changes, and record the results.
- [x] 3.2 Stop the project-owned server, run the applicable Playwright browser suite, and record any unavailable WebGPU capability separately from test failures.
