# Proposal

## Why

Health and Mana potions are visually easy to miss among static dungeon props. A gentle floating motion will make those restorative pickups legible without changing their grid position, collection rules, or shadows.

## What Changes

- Add an opt-in oscillation capability for world pickup main art.
- Enable a smooth vertical oscillation with a 1.5px amplitude for Health and Mana potions over a 2.4-second cycle.
- Keep each animated pickup's shadow anchored at its normal ground-contact position, narrowing it as the main art rises.
- Raise Key main art by one quarter of a grid cell while keeping it stationary and its grounded shadow at 50% of its normal size.
- Leave pickups without the opt-in configuration stationary, including keys, gold, ordinary items, chests, crates, and stairs.
- Preserve the normal pickup render-depth ordering and collection transfer behavior.

## Capabilities

### New Capabilities

- `world-pickup-animation`: Configure and present optional, main-art-only pickup oscillations in the game view.

### Modified Capabilities

- None.

## Impact

- Affects the world pickup sprite configuration and Babylon world render update path.
- Adds focused unit coverage for oscillation behavior and pickup opt-in selection.
- A focused Playwright check is useful after implementation to confirm the visible main-art motion while the shadow remains grounded; it is not run during proposal.
