# Design

## Context

The renderer assigns terrain and floor decals fixed passes, then assigns sparse orders to layers in the shared world pass. See [proposal.md](proposal.md) and the `world-map-rendering` delta for the behavior to preserve. Current coverage checks helper sorting and source patterns, but it does not cover a complete wall, object, and character boundary case.

## Goals / Non-Goals

**Goals:**

- Keep floor art behind wall art.
- Give walls, persistent objects, transient world objects, and moving characters one comparable ground-contact depth.
- Keep each composite sprite's shadow and main art adjacent.
- Verify the repaired boundary visually in one muted Edge Playwright check after implementation.

**Non-Goals:**

- Change the dungeon map, Tiled asset selection, minimap occlusion rules, camera behavior, or the WebGPU-only renderer.
- Rework owner-fixed overlays such as the targeting reticle or Heal effect.

## Decisions

### Use render passes for floor content and a single ordered set for occluding world content

Terrain and floor decals remain fixed below the shared world pass. The renderer will collect every layer that can occlude or be occluded by a wall into one frame-local depth set and assign orders only after collecting it. This retains floor visibility while avoiding separate layer defaults that can overwrite an object or character's computed depth.

Using one static layer order per atlas was rejected because it cannot represent an actor passing a wall or a prop at a different map row.

### Use visual ground contact, not sprite origin, as the depth input

Walls use their front edge. Static and moving entities use their displayed ground contact, including the presented sub-grid position for movers. Composite sprites reserve neighboring orders for shadow then main art. The existing category tie-break remains the rule for equal ground-contact positions.

Sorting by sprite top or atlas frame bounds was rejected because art height and pivots differ between walls, characters, and pickups.

### Test the ordering model and the rendered scene separately

Focused Node tests will assert the full ordering sequence for representative wall, prop, pickup, barrel, and character cases. A focused muted Edge Playwright check will load the game and capture the boundary fixture after the implementation group. Finalization will run the applicable browser suite after the project-owned server stops.

## Risks / Trade-offs

- [A new object type bypasses the shared list] → Centralize entry creation and add a focused test for every object category that participates in world occlusion.
- [A fixed terrain pass hides an asset-specific overlap] → Keep terrain below walls and use visual browser verification with the shipped tile art.
- [Sub-grid motion changes an order halfway through a move] → Calculate depth from the same presented position used to draw the mover.

## Migration Plan

No data migration is required. Deploy the renderer and test changes together. Revert the renderer change if the focused visual check or the full browser suite detects a new occlusion regression.
