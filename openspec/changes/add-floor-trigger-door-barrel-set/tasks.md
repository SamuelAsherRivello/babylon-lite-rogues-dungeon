# Tasks

## 1. Model and placement

- [x] 1.1 Add the typed floor object-set contract, legacy-save normalization, and resolved occupancy helpers; verify focused Node tests cover absent legacy data and derived trigger state.
- [x] 1.2 Add deterministic level-one Floor Trigger Door Barrel Set placement with a sealed room or branch whose only entrance is the door; verify focused Node tests cover one valid set, unique cells, walkable barrel and trigger cells, a 20-by-20-tile bound, a legal push into the trigger, no bypass route, and repeatable seeds.
- [x] 1.3 Select and populate a seed-stable sealed-region role as an optional reward or exit stairs; verify focused Node tests cover both roles and a solvable exit route.

## 2. Turn resolution

- [x] 2.1 Add cardinal barrel bump resolution and shared closed-door blocking for player and enemy movement; verify focused Node tests cover a successful one-tile push, a blocked push with no time advance, player-trigger activation, barrel-held activation, and door closure after leaving the trigger.
- [ ] 2.2 Preserve object-set coordinates and derived door traversal across save normalization, reload, and return-floor restoration; verify focused Node tests cover open and closed restore states.

## 3. World presentation

- [x] 3.1 Extend the shared world render model with ordered barrel, trigger, and door entries and their resolved states; verify model tests assert matching coordinates and state data for game and minimap views.
- [x] 3.2 Add Babylon sprite assets and bounded layers for barrel, inactive or active trigger, and closed or open door; verify renderer-focused tests cover source-frame selection and state updates without stale sprites.
- [ ] 3.3 Add one muted Edge Playwright scenario that pushes the barrel onto the trigger and confirms the visible game view and minimap change together; verify it runs with `?mute=1` after this implementation group.

## 4. Integration verification

- [ ] 4.1 Run the relevant Node test suite, TypeScript compile, lint, and the focused puzzle Playwright test; record results and fix regressions before finalization.
- [ ] 4.2 During finalization, run the full applicable test suite, including broader browser coverage, and confirm that the level-one set remains visible and usable after a save reload.
