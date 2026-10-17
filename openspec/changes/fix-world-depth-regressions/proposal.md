# Proposal

## Why

The recent shared world-depth change left tile, object, and character occlusion unreliable at wall and floor boundaries. Players need walls, floor art, props, pickups, barrels, enemies, and the player to retain a stable front-to-back relationship while moving.

## What Changes

- Repair game-view depth ordering at wall and floor boundaries without changing map geometry or minimap coordinates.
- Define one ground-contact depth contract for walls, persistent objects, moving objects, and characters.
- Keep floor terrain and floor decals in their documented fixed passes while preventing their layer setup from overriding world-depth results.
- Add focused regression coverage for wall, object, and character ordering, plus one muted Playwright visual check during implementation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `world-map-rendering`: Clarify and enforce stable game-view depth relationships between terrain, walls, objects, and characters.

## Impact

The change affects the Babylon Lite game renderer, render-order helpers, world-rendering documentation, and focused renderer tests. It adds no dependencies, save-data changes, or API changes.
