# Tasks

## 1. Establish the new module boundaries

- [x] 1.1 Move procedural-generation modules to `systems/procedural`, rename them to `level-grid-system.ts` and `world-procedural-system.ts`, and verify every source import resolves with `npm run typecheck`.
- [x] 1.2 Move the generic sprite-sheet playback engine to `systems/animation/sprite-animation-system.ts` and move Hero Warrior definitions to `content/characters/hero-warrior/hero-warrior-animation.ts`; verify their existing focused tests pass after import updates.
- [x] 1.3 Move the Tiled map module to `systems/rendering/tile-map-system.ts`, merge the Wang autotiling exports into it, and verify the existing tile serialization and Wang mapping tests pass.

## 2. Update consumers and remove old paths

- [x] 2.1 Update production imports in game, rendering, persistence, and content modules; verify `npm run typecheck` passes.
- [x] 2.2 Update test and documentation references to the moved modules; verify repository search finds no stale source import paths and the test imports resolve.
- [x] 2.3 Remove the superseded procedural-generation, maps, Hero Warrior catalog, and sprite-sheet-animation paths; verify no duplicate implementation remains.

## 3. Verify behavior preservation

- [x] 3.1 Run `npm test -- --runInBand` and verify the baseline suite passes without regressions.
- [x] 3.2 Run `npm run build` and verify the production build completes successfully.
