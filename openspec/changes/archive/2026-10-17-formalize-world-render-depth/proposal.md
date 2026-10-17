# Proposal

## Why

World rendering currently has separate sprite layers that each sort internally by Y, but walls, objects, and characters do not share one depth-order contract. New entity art with a main sprite and shadow makes the missing cross-layer rule visible and risks incorrect overlap during movement.

## What Changes

- Define a common render-entity contract for every character and shadow-bearing world object. The player, rat, skeleton, and pushable barrel each render as one positioned entity with shadow and main children.
- Define three world-render passes: walkable terrain, floor-attached decals, and a shared Y-sorted world pass containing walls, props, pickups, stairs, barrels, enemies, and the player.
- Sort shared-world visuals by their ground-contact pixel Y coordinate, with deterministic same-position tie-breaking and a shadow-before-main rule within each render entity.
- Keep walkable terrain, floor decals, screen-space UI and diagnostics, and explicitly owner-attached effects outside the shared world sort. Owner-attached effects retain their documented fixed relationship to their owner.
- Add focused renderer coverage and a post-apply human playtest that checks overlap while moving past walls, enemies, and the barrel in both game-view layouts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `world-map-rendering`: Add the shared depth-order contract, composite render-entity behavior, and the exceptions to Y sorting.

## Impact

- Affected code: `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx`, `character-sprite-system.ts`, world render-model helpers, and their focused tests and documentation.
- Affected behavior: world visuals overlap by a stable shared depth rule while preserving terrain, floor panels, screen-space UI, and owner-fixed effects.
- Browser evidence: a focused muted Edge check adds useful evidence after implementation because this change is visual and can regress only when actual sprite layers overlap.
