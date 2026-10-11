# Tasks

## 1. Domain model and campaign state

- [x] 1.1 Extend the serializable item and player contracts with explicit consumable classification, Health/Mana Potion definitions, and two nullable positive-quantity Quick Slots; verify TypeScript typecheck passes and non-consumable equipment remains representable.
- [x] 1.2 Seed new campaigns with Health Potion x1 and Mana Potion x2 in Inventory and empty Quick Slots; add focused creation tests verifying exact starter quantities and quick-slot shape.
- [x] 1.3 Normalize legacy campaigns and save writes for missing, invalid, zero, and positive Quick Slot quantities; add migration tests verifying legacy campaigns remain playable and valid stacks persist.

## 2. Domain actions, effects, and events

- [x] 2.1 Add validated actions for Inventory-to-Quick-Slot assignment, Quick-Slot-to-Inventory return, and matching-stack combination; verify accepted transfers tick once and invalid, incompatible, full-capacity, and different-item drops leave state and time unchanged.
- [x] 2.2 Implement Q/E Quick Slot use resolution using existing Health/Mana restoration rules; verify successful use consumes exactly one, clears at zero, emits resource/consumable events, and advances one turn.
- [x] 2.3 Reject use at full resource with a structured event and zero ticks; extend event facts and Log projection tests so the domain does not format the player-facing message.

## 3. React presentation and drag integration

- [x] 3.1 Render the neutral Quick Slots panel beneath Abilities with rows 01 and 02, Q/E labels, empty plus markers, and positive `Name XN` quantities; verify source/UI tests cover neutral styling and absence of `X0`.
- [x] 3.2 Extend shared drag sources, destinations, previews, and release handling for Inventory and Quick Slots while preserving existing Equipment and Ability restrictions; verify focused source tests cover accepted and rejected routes.
- [x] 3.3 Bind non-repeating Q and E keyboard events to the corresponding Quick Slot actions and preserve settings/level-up/input guards; verify keyboard source tests cover dispatch and empty-slot no-op behavior.
- [x] 3.4 Run one focused muted Playwright check that creates a new game, confirms Health Potion x1 and Mana Potion x2, drags each potion into Quick Slots, verifies `Name XN`, combines a matching stack, returns a stack to Inventory, and consumes through Q/E.

## 4. Integration verification

- [x] 4.1 Run the full applicable Node test suite, TypeScript checks, and OpenSpec validation; verify existing ability, equipment, inventory, save, audio, and browser-source tests remain green.
- [x] 4.2 Run the applicable final browser suite with `?mute=1` and report any unavailable browser capability; verify saved Quick Slot state survives a reload in the focused campaign flow.
