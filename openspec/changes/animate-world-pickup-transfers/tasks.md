# Tasks

## 1. Transfer contract and state

- [x] 1.1 Define a renderer-to-React collection projection snapshot and resolved-destination transfer model; verify focused TypeScript tests cover camera/Zoom source values.
- [x] 1.2 Keep visible Inventory, Quick Slot, Key, and Gold credits at their pre-collection values until each associated transfer completes; verify collection state and saved domain state remain accepted immediately.

## 2. Destination-owned UI presentation

- [x] 2.1 Render transfer nodes through destination-layer portals above Inventory rows, Quick Slots, and title-bar counters; verify selectors and stacking with component tests.
- [x] 2.2 Animate potion transfers from their projected world origin to row left-edge/middle-Y at constant world size, then pause 500ms; verify timing with deterministic animation tests.
- [x] 2.3 Animate Key and Gold transfers to their title-bar icons with destination UI scaling; verify their counter updates after the pause.

## 3. Browser verification

- [x] 3.1 Add nearby deterministic health, mana, key, and gold pickups for focused collection coverage; verify placement remains walkable and non-overlapping.
- [x] 3.2 Run a focused Edge Playwright check for Inventory, Quick Slot, Key, and Gold transfers across camera modes and Zoom levels; record evidence and run the applicable full typecheck/test suite.
