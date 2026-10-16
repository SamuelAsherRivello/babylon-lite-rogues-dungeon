# Proposal

## Why

Heal and Wand currently resolve their game effects instantly, leaving their ability feedback visually disconnected from the tactical action. Their first use needs clear, purple-coded effects that make the outcome and target readable without blocking the player from acting.

## What Changes

- Add real-time, purple-tinted smoke-poff presentations for Heal and Wand.
- Commit Mana on an accepted cast, then resolve the ability effect, one tactical turn, and the enemy phase when its presentation finishes.
- Add independent one-second real-time cooldowns for Heal and Wand without blocking other gameplay input.
- Lock Wand's nearest valid target at cast time; the projectile tracks that target and deals damage on arrival, or ends harmlessly if it is gone.

## Capabilities

### New Capabilities

- `ability-presentation`: Real-time, non-blocking visual effects and cooldown feedback for player abilities.

### Modified Capabilities

- `player-abilities`: Defer the first two ability effects and tactical resolution until their visual presentation completes.
- `dungeon-turns`: Define delayed ability completion as the point at which an accepted ability advances tactical time and permits its enemy phase.

## Impact

- Affects ability action/state handling, game-session dispatch, particle effect data and Babylon rendering, UI cooldown display, audio/event timing, and focused logic and browser tests.
- Reuses the existing smoke-poff frames; no dependency or renderer fallback is added.
