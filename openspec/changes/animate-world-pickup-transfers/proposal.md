# Proposal

## Why

Collected objects disappear abruptly or animate in the Babylon stacking context, so their transfer is not visually connected to the slot or counter receiving them. A destination-owned DOM transfer preserves that connection across camera and zoom modes.

## What Changes

- Present each accepted pickup as a temporary DOM transfer mounted in the receiving UI layer.
- Resolve the actual receiving Quick Slot or Inventory row before animating potions.
- Move key and gold pickups to their title-bar counters, scaling to the counter icon at arrival.
- Keep the visible receiving value unchanged until the transfer has paused at its destination.

## Capabilities

### New Capabilities

- `world-pickup-ui-transfer`: Presents accepted world pickups as destination-layer UI transfers.

### Modified Capabilities

- `inventory-management`: Delays visible Inventory credit until its pickup transfer completes.

## Impact

Updates the Game React orchestration, Babylon projection handoff, UI layers/styles, collection presentation tests, and focused browser coverage.
