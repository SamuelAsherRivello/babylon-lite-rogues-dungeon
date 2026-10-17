# Tasks

## 1. Run identity and deterministic bases

- [ ] 1.1 Add the installation world-seed store, schema fields for Saved Game number, hidden run number, and generator version, and verify focused seed-derivation tests produce identical bases for an identical identity and distinct bases for different slots or runs.
- [ ] 1.2 Route every new-run, death, and descent generation path through the canonical run-identity derivation, and verify focused game tests retain the seed while incrementing run after death.
- [ ] 1.3 Assign stable IDs to every mutable generated object, pickup, actor, and linked puzzle member, and verify regeneration maps equivalent content to the same IDs.

## 2. Compact level-state persistence

- [ ] 2.1 Define JSON-safe level-state delta types and reconstruction/save boundaries that omit base cells and unchanged generated entities, and verify an untouched level serializes without a terrain grid.
- [ ] 2.2 Record and restore generated removals, mutable object changes, living-actor changes, and uncollected spawned items, and verify focused round-trip tests for collected pickups, defeated actors, and opened chests with and without an uncollected drop.
- [ ] 2.3 Reconstruct linked puzzle sets from stable IDs and deltas while deriving trigger-door state from occupancy, and verify focused object-set persistence tests cover open-door reload and revisiting a level.
- [ ] 2.4 Replace active-run full-floor save/load handling with the delta format and verify autosave/resume retains player position, time, progression, inventory, and every persisted world change.

## 3. Compatibility and cleanup

- [ ] 3.1 Bump the persisted campaign schema and implement non-destructive legacy snapshot migration, and verify valid legacy runs resume while malformed legacy records remain intact and unavailable.
- [ ] 3.2 Keep a migrated legacy run snapshot-backed only until its next fresh run, then discard legacy floors and verify a post-death save contains deterministic deltas rather than full floor snapshots.
- [ ] 3.3 Ensure Clear Local Storage removes installation seed, campaigns, and preferences together, and verify the next new campaign creates a new seed without affecting the three-Saved-Game limit.

## 4. Developer URL control

- [ ] 4.1 Persist the default-off Url Args preference and add its settings control, and verify a preference reload retains the selected state without requiring a campaign save.
- [ ] 4.2 Synchronize world, level, slot, run, and seed through URL replacement only when Url Args is enabled, preserving unrelated arguments, and verify focused URL tests cover enable, disable, and complete deterministic input parsing.
- [ ] 4.3 Run one focused Playwright check in Edge with `?mute=1` to toggle Url Args on and off, verifying all five identity arguments appear only while enabled and unrelated arguments remain.

## 5. Integration verification

- [ ] 5.1 Run the project typecheck and focused persistence/game test suite, and verify there are no failures.
- [ ] 5.2 Run the full applicable test suite and verify the Saved Game, death, reload, linked-object, and settings behavior remains covered without browser-console errors.
