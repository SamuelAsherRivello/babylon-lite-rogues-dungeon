# Tasks

## 1. Core ability and save model

- [x] 1.1 Change new-campaign ability initialization and game-rule index validation to use positions 01–03 only, and verify focused game tests cover initial bindings, rejected index 3 actions, and unchanged time for invalid fourth-slot operations.
- [x] 1.2 Update saved-campaign normalization to preserve ability entries 01–03 while discarding legacy entry 04 without invalidating the campaign, and verify focused persistence tests cover successful normalization and preservation of failed migrations.
- [x] 1.3 Update ability-related game tests and save fixtures to use the three-position contract, then verify `npm test -- --test-name-pattern="ability|save|campaign"` (or the repository's equivalent focused command) passes from the repository root.

## 2. Desktop and mobile presentation/input

- [x] 2.1 Restrict keyboard dispatch to keys 1–3, remove key 4 from the desktop status legend, and verify source/UI tests assert that key 4 has no ability dispatch path or visible legend entry.
- [x] 2.2 Render exactly three desktop ability rows and three mobile ability buttons, remove fourth-slot drag targets, and update the mobile grid styling to match three controls; verify UI tests cover rows/buttons 1–3 and absence of 4.
- [x] 2.3 Preserve drag reorder and affordable/unaffordable activation behavior across the remaining slots, and verify the focused game/UI test suite covers swaps, empty-slot rejection, Mana rejection, and key 3 activation.

## 3. Browser verification

- [x] 3.1 Add or update one focused Playwright scenario using `?mute=1` that checks the rendered ability controls show 1–3 but not 4 and that pressing key 4 does not change the campaign time or ability state; verify the focused browser test passes after the presentation/input group.
- [x] 3.2 Run the full applicable Node and browser test suites during finalization and record any unavailable browser capability or unrelated pre-existing failure in the implementation handoff.
