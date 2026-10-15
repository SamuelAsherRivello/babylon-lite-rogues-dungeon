# Proposal

## Why

The current system layout groups reusable animation with character content and splits closely related tile-map responsibilities across two modules. This refactor establishes a smaller, purpose-based directory structure before later work adds transitions, quests, and particles.

## What Changes

- **BREAKING** Rename the procedural-generation directory and its public module paths to `systems/procedural/`, with `level-grid-system.ts` and `world-procedural-system.ts`.
- Move the generic sprite playback module to `systems/animation/sprite-animation-system.ts`.
- Move Hero Warrior animation definitions to `content/characters/hero-warrior/hero-warrior-animation.ts`.
- Move Tiled map handling into `systems/rendering/tile-map-system.ts` and combine Wang autotiling into that module.
- Update every production import, test import, and relevant documentation reference.
- Preserve runtime behavior, exported behavior after import-path updates, rendering output, saved data, and existing test coverage.
- Run the existing focused Node suite before and after the refactor. Add a compile-oriented smoke test only if the move exposes an untested boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change is an internal refactor with no intended user-visible behavior change.

## Impact

Affected files are the current procedural, map, rendering, animation, game, and test modules. No dependencies, save schema, gameplay rules, browser behavior, or public UI behavior change. Playwright does not add useful evidence because this refactor preserves existing browser-visible behavior; the focused Node suite and TypeScript build cover the moved module graph.
