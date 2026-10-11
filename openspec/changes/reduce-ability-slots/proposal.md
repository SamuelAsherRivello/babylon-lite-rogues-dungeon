# Proposal

## Why

The current ability system exposes four reorderable positions even though the
game's intended loadout is three abilities. The unused fourth position creates
an unnecessary layout row and key binding, and existing saved campaigns need a
defined compatibility rule when that position is removed.

## What Changes

- **BREAKING** Reduce the player ability binding model from four positions to
  three positions, preserving positional bindings for keys 1, 2, and 3.
- Remove ability position 04 from the desktop ability layout, mobile ability
  controls, and visible keyboard-control legend.
- Stop treating keyboard key 4 as an ability input; pressing it must not
  activate an ability or advance the game.
- Preserve drag-to-reorder behavior among the three remaining positions,
  including swaps and moves into empty positions.
- Normalize existing saved campaigns by discarding any ability assigned to
  legacy position 04 while retaining positions 01–03 and the rest of the
  campaign.
- Update focused unit, UI, and browser-facing coverage for the three-slot
  contract and the disabled fourth key.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `player-abilities`: Change the ability binding, rendering, mobile-control,
  drag-reorder, and keyboard-input contract from four positions/keys to three.
- `campaign-saves`: Normalize legacy four-position ability arrays during load
  by removing the obsolete fourth binding without invalidating the campaign.

## Impact

The change affects the core campaign ability state and validation, keyboard
dispatch, React ability and mobile-control rendering, responsive styling, save
migration/normalization, and tests under `cryptbound/src` and `cryptbound/test`.
It does not add dependencies or change the ability effects themselves. Because
the behavior is visible in the HUD and mobile controls, a focused Playwright
check is useful during implementation; it is not run while preparing this
proposal.
