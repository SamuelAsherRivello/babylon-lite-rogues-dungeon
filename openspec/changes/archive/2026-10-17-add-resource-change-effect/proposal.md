# Proposal

## Why

The permanent green world tint was a successful visual test, but it obscures the dungeon and conveys no game event. Players need a brief, readable signal when Health or Mana changes.

## What Changes

- Remove the permanent `green-tint` compositing layer from the playable world view.
- Add one-shot rectangular world-view pulses for committed Health and Mana changes.
- Show red for Health loss, green for Health gain, and purple only for Mana gain; Mana loss has no world-view pulse.
- Render each pulse as a thicker rectangular wave that contracts from shape 1 to shape 2 over 650 milliseconds, with a slower 1,000-millisecond fade.
- Keep the pulse inside the playable world view, separate from the HUD and minimap, and preserve existing resource-meter and floating-text behavior.

## Capabilities

### New Capabilities

- `world-resource-change-effects`: Display a transient rectangular pulse in the playable world view for player Health and Mana changes.

### Modified Capabilities

- None.

## Impact

- Affected UI and rendering code: resource-event subscription in `rogues-dungeon/src/game/game.tsx`, world overlay rendering in `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx`, the green-tint layer system, and world-view CSS.
- Affected verification: focused projection and page-rendering tests, plus one muted browser check because the pulse is visual and time-bound.
- No game-rule, save-format, renderer fallback, or dependency changes.
