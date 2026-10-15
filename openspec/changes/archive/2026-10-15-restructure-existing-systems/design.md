# Design

## Context

See proposal.md. The current implementation has procedural-generation, maps, and rendering folders. The generic sprite engine and Hero Warrior definitions share the rendering folder even though only the engine is reusable. Tiled serialization and Wang frame selection are separate modules with a direct dependency.

## Goals / Non-Goals

**Goals:**

- Establish the agreed system paths without changing runtime behavior.
- Keep generic animation, game content, procedural rules, rendering, persistence, and audio boundaries clear.
- Consolidate tile-map and Wang-autotiling code without changing their public behavior.
- Leave the codebase compiling and its baseline tests passing.

**Non-Goals:**

- Copy or adapt systems from the ASCII RPG.
- Add particles, quests, tweening, or screen and world transitions.
- Change saved campaign data, game rules, UI behavior, renderer settings, or dependencies.

## Decisions

### Use purpose-based system directories

Move procedural modules to `systems/procedural`, reusable sprite playback to `systems/animation`, and Tiled map concerns to `systems/rendering`. The existing renderer, audio, and persistence directories remain. This makes a module's role clear without adding a new framework.

Keeping the existing `procedural-generation` and `maps` directories would preserve familiar paths, but it would retain names that conflict with the planned organization.

### Keep character animation definitions in content

Move the Hero Warrior catalog to `content/characters/hero-warrior/hero-warrior-animation.ts`. It will continue to build definitions through the generic sprite animation system. The generic engine must not import character-specific content.

Keeping the catalog under `systems/animation` would place game-specific asset selection beside a reusable runtime component.

### Consolidate tile mapping and autotiling

Move Tiled import/export and Wang frame selection into `rendering/tile-map-system.ts`. Keep exports that are used by production code and tests, but change their import paths. This avoids a separate module for an internal helper with a single tile-map responsibility.

Keeping two modules would make the dependency explicit, but adds a boundary without independent lifecycle or consumer needs.

### Verify moves through the existing test suite

Run the current Node test suite before and after the move, then run the TypeScript check and production build after the new import graph is complete. Browser verification is not planned because no browser behavior should change.

## Risks / Trade-offs

- Missed import path → search the repository for old paths, then run TypeScript and Node tests.
- Incorrect export merge → retain existing named exports and extend the existing game tests where necessary.
- Git rename detection ambiguity → remove old paths only after imports point to the new modules and validation passes.

## Migration Plan

1. Record the baseline test result.
2. Relocate modules and update all imports in source, tests, and documentation.
3. Merge Wang helpers into the tile-map module and delete the old source file.
4. Run TypeScript, the Node suite, and the production build.
5. Roll back by restoring the prior paths and imports if validation fails.
