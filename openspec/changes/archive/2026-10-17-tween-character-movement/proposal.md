# Proposal

## Why

Grid actions update character sprites at cell centers, so movement lacks the short travel that makes each turn readable. The current enemy playback also snaps actors between cells, which conflicts with the planned responsive movement presentation.

## What Changes

- Tween each moved player, enemy, and future NPC sprite from its displayed sub-grid position to its latest committed grid position over 250 milliseconds with `easeOutCubic`.
- Preserve the current enemy playback rank and one-second delayed-start window. Enemies start at equal intervals within that window, and each movement tween lasts 250 milliseconds even when it ends after the window.
- Accept later actions while any character tween is active. Retarget an affected sprite from its current displayed position to its newest committed destination instead of snapping or queuing stale travel.
- Keep grid rules, turn resolution, saves, and sprite animation clip selection unchanged. Existing idle animations remain active during positional movement.
- Keep the game view, minimap, and all camera modes synchronized to the same interpolated character coordinates; Center, Deadzone, and Screen retain their respective framing policies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `turn-presentation`: Replace instantaneous enemy snaps with ordered, retargetable 250 ms position tweens while preserving immediate logical resolution and responsive input.
- `world-map-rendering`: Render player and staged enemy positions at the same interpolated coordinates in the game view and minimap, and frame the game view from the interpolated player position in every camera mode.

## Impact

- `rogues-dungeon/src/systems/animation/turn-presentation-system.ts` gains transient character movement state and retargeting.
- `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx` draws character sprites at fractional grid positions.
- Focused animation and renderer tests will cover easing, ordered starts, mid-tween retargeting, and matching minimap positions. A muted Playwright run will provide browser evidence of visible travel and responsive repeated movement.
