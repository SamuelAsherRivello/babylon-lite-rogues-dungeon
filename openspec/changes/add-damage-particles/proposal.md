# Proposal

## Why

Floating damage numbers identify a hit, but the affected character has no immediate local impact cue. A short burst of existing particle art will make every received hit readable at the character's position.

## What Changes

- Spawn four transient smoke-poff particles whenever a player or enemy takes damage.
- Center each particle on the damaged character at 25% of a grid tile.
- Give each particle a random radial direction, move it one-half grid tile over 250 milliseconds, and fade it in then out during that interval.
- Keep the effect presentation-only and compatible with all existing combat damage sources.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `world-floating-feedback`: Add transient particle feedback for damage to any character while retaining floating damage text.

## Impact

- Affected rendering and presentation code: particle-effect projection, animation helpers, Babylon world rendering, and session cleanup.
- Affected verification: focused particle and renderer tests, plus a muted Edge check because the result is short-lived visual feedback.
- No game-rule, save-format, renderer, asset, or dependency changes.
