# Design

## Context

See `proposal.md` for motivation. The procedural system currently clones and resolves a complete campaign synchronously, then the Babylon renderer reads enemy coordinates directly from that committed campaign. The game already has a cancellable frame-based tween utility, but the world renderer has no actor-position playback state. The X key has a temporary handler and no domain action.

## Goals / Non-Goals

**Goals:**

- Preserve synchronous, deterministic tactical resolution, saves, cooldowns, combat, and event ordering.
- Show visible enemy responses after the player action within a one-second maximum budget.
- Permit a new action while the prior interval is playing.
- Keep the game view and minimap on one actor-presentation snapshot.

**Non-Goals:**

- Do not make tactical rules depend on wall-clock time or delay session commits.
- Do not add a real-time simulation loop or multiplayer synchronization.
- Do not animate enemies that did not change cells.

## Decisions

### Resolve logic before presentation

`applyAction` will add a `wait` action that calls the existing turn advancement path without changing the player's position. All actions that advance time will continue to return their fully resolved campaign and events before rendering starts.

This keeps the serialized campaign authoritative. Deferring enemy logic until a timeout would make rapid input, save timing, and test results dependent on wall-clock timing.

### Build a presentation snapshot from consecutive campaigns

The UI will retain the previously committed campaign long enough to compare it with the new one. A renderer-neutral turn-presentation helper will receive the previous and current campaign and produce source and destination positions for moved enemies visible in the main game view. It will assign an increasing playback rank the first time an enemy appears in that view. The rank remains while that enemy exists on the floor, even while it is offscreen.

The main Babylon world and minimap will consume that snapshot instead of reading actor coordinates directly from the current campaign. Terrain, non-actor objects, player state, and game rules remain sourced from the current campaign.

### Use a maximum one-second sequential playback budget with instantaneous moves

Each visible moved enemy receives `1000 / visibleMovedEnemyCount` milliseconds. At the beginning of its assigned slice, the enemy immediately snaps from its source cell to its already-resolved destination cell. The remainder of that slice is a delay before the next eligible enemy snaps. For example, five eligible enemies snap at 0 ms, 200 ms, 400 ms, 600 ms, and 800 ms. There is no interpolation or tweening of an enemy position.

The player stays at its newly resolved coordinate, so movement reads as player action followed by enemy reaction. The camera continues to use the committed player coordinate.

### Flush before starting the next turn presentation

Before handling a later accepted time-advancing result, the coordinator cancels active frame callbacks, places all pending enemies at their destination coordinates, and discards the prior schedule. It then captures the new prior and current campaigns and starts a fresh one-second schedule.

Rejected actions do not flush the active presentation because they do not advance the turn. A realm change, player death, renderer unmount, or new session clears presentation state and cancels callbacks.

### Bind wait on keyboard and mobile controls

The keyboard handler will replace its temporary X-key log with `dispatch({ type: "wait" })` on a non-repeating press. The portrait controller will add text buttons for Quick 1, Quick 2, and Wait alongside its existing arrows and ability buttons. Keyboard and mobile Wait use the same gameplay guards, while Z and C remain desktop-only interface controls.

## Risks / Trade-offs

- [Rapid accepted input can hide intermediate enemy moves] -> Flush prior pending snaps before the new schedule so the renderer never carries stale source positions into the next turn.
- [The logical world leads the visible enemies for up to one second] -> Keep that difference presentation-only and synchronize both world views to the same staged snapshot.
- [A turn can contain only offscreen enemy movement] -> Do not spend presentation time on motion the player cannot see; retain the logical result and wait for a later visible turn.
- [Actor identity or floor changes can invalidate source data] -> Reset the coordinator whenever the realm identity changes or an actor is removed.

## Migration Plan

1. Add the wait action and preserve existing saved-campaign shape because presentation state is transient.
2. Add presentation helpers and renderer integration behind focused Node tests.
3. Verify keyboard and mobile wait, quick-slot controls, and staged visible enemy movement in one muted browser run.
4. Roll back by removing the transient presentation integration. Existing campaign saves remain compatible.
