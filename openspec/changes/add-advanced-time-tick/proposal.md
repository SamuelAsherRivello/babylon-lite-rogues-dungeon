# Proposal

## Why

Enemy movement currently resolves in the same render update as the player's accepted action. When a nearby enemy follows the player, the two sprites appear to move together, which makes the enemy response hard to read.

Players also need an intentional way to spend one tactical turn without moving, both for enemy positioning and for future turn-advancing mechanics.

## What Changes

- Give each accepted tactical turn up to one second of presentation time while retaining immediate, deterministic turn resolution. Enemy movement is an instantaneous grid-position change, separated by delays; it is never tweened.
- Stage only enemies visible in the game view within that budget. Give each enemy a persistent playback rank for its floor lifetime so the same visible group reacts in a predictable sequence.
- When a new accepted action arrives before the current window ends, finish all pending enemy presentation moves immediately and start playback for the newly resolved turn. Do not block player input while playback runs.
- Add a `wait` action bound to a non-repeating X-key press and a mobile Wait button. It advances time and resolves the normal enemy phase without changing the player's position.
- Add text buttons for Quick 1 and Quick 2 to the mobile controls alongside its existing arrows and ability buttons. Do not add mobile Z or C controls.
- Keep the game view and minimap on the same staged actor presentation so they continue to show matching world coordinates during playback.

## Capabilities

### New Capabilities

- `turn-presentation`: Present resolved tactical turns over a fixed time window, including staged enemy movement and interruption handling.

### Modified Capabilities

- `dungeon-turns`: Add waiting as an accepted action that advances one tactical turn and runs the enemy phase.
- `world-map-rendering`: Keep the game view and minimap synchronized to the staged actor positions during turn playback.
- `pixel-game-presentation`: Define the portrait controls for quick slots and waiting.

## Impact

- `rogues-dungeon/src/game/types.ts` and `rogues-dungeon/src/systems/procedural/world-procedural-system.ts` gain the wait action and its turn-resolution coverage.
- `rogues-dungeon/src/game/Game.tsx` replaces the temporary X-key behavior and passes turn-presentation data to rendering.
- `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx` gains a cancellable actor-presentation timeline rather than placing enemy sprites directly at their newly resolved coordinates.
- Focused Node tests cover waiting, visible-enemy playback order, and interruption behavior. A focused muted Playwright check is useful to confirm the mobile controls and visible staging after implementation.
