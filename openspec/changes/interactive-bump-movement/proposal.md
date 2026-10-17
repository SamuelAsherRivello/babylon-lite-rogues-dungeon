# Proposal

## Why

Interactive movement currently resolves with no visual commitment, so combat and closed containers feel like ordinary blocked movement. A short bump and concurrent damage reaction make contact readable without changing the player’s grid cell.

## What Changes

- Keep normal character travel at a shared 250 ms duration.
- Present a 125 ms cardinal bump when attempting to enter an interactive blocked cell: an enemy, closed crate, or closed treasure chest.
- Resolve the interaction at the bump apex; combat damage and closed-container opening occur at 62.5 ms.
- Lock movement input during a bump and retain the attempted cardinal heading when the player returns to the original cell center.
- Play a 250 ms take-damage scale reaction (100% to 90% to 100%) on damaged characters, concurrently with a bump when both begin together.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `turn-presentation`: Present interactive bumps and concurrent damage reactions using shared movement timing.
- `dungeon-turns`: Define the interactive targets and apex timing for bump actions.
- `combat-resolution`: Resolve melee damage at bump contact.

## Impact

- Movement presentation, tactical-action dispatch, combat/container event timing, Babylon sprite scale, and focused tests.
- A muted Edge Playwright check will provide visible browser evidence.
