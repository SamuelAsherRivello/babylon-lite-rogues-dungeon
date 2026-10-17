# Proposal

## Why

Campaign saves currently retain complete generated floor snapshots, including the 100 by 100 terrain grid. This duplicates deterministic generation output, increases save size with every visited level, and does not define a stable contract for restoring only player-caused changes.

## What Changes

- Create a persistent installation world seed shared by the three Saved Games. Clear Local Storage removes it, so the next play session creates a new one.
- Define each run by its Saved Game number and a hidden positive run number. A player death increments that run number and starts a new deterministic Level 1 without changing the installation seed.
- Derive every generated level from the installation seed, Saved Game number, run number, level number, and generator version.
- Replace stored full-floor snapshots with compact per-level state deltas that reconstruct the generated base level and then apply player-caused changes.
- Require stable generated IDs for mutable objects, pickups, enemies, and puzzle objects.
- Persist object state, changed living actors, dynamic spawned pickups, and removals of generated objects. Do not persist presentation-only state.
- Add a persisted developer setting, "Url Args", that keeps ordinary player URLs clean by default and, when enabled, writes world, level, slot, run, and seed arguments to the current URL.
- **BREAKING**: Existing full-floor saves reset their active run to a new deterministic run 1. The migration retains supported persistent progression but does not retain legacy floor, gear, or run state.
- Treat a complete world, level, slot, run, and seed URL as an unsaved deterministic test run, so it never reads or overwrites a Saved Game.

## Capabilities

### New Capabilities

- `level-state-deltas`: Regenerate deterministic level bases and restore compact player-caused state changes.

### Modified Capabilities

- `campaign-saves`: Save and restore run identity, per-level deltas, and the developer URL-argument preference.
- `character-progression`: Define death as advancing a hidden run number while retaining the installation seed and persistent progression.
- `dungeon-object-sets`: Restore linked puzzle state from level deltas rather than a full serialized floor.

## Impact

- Affects campaign types, procedural generation, action resolution, local-storage migration, and game URL synchronization.
- Affects `rogues-dungeon/src/systems/procedural/world-procedural-system.ts`, `rogues-dungeon/src/systems/persistence/save-system.ts`, `rogues-dungeon/src/game/game.tsx`, URL option code, and focused persistence tests.
- No network service, account, or third-party dependency is required. Playwright adds useful evidence for the visible Url Args setting after implementation.
