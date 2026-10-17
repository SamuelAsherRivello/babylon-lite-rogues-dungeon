# Design

## Context

`Floor.entities` currently holds one object per occupied cell, and the level generator reserves those cells during one placement pass. A floor trigger is an overlay that must share a tile with a player or barrel, so it cannot use the same occupancy model as blocking entities. The procedural world system owns generation, normalization, turns, and save-ready campaign state. `WorldRender.Render` supplies both Babylon views with the same world model.

## Goals / Non-Goals

**Goals:**

- Add one serializable, seed-stable linked set on level one with a sealed region that is accessible only through its door.
- Keep trigger occupancy, door traversal, pushing, and enemy movement under the domain rules instead of the UI or renderer.
- Feed the game view and minimap one resolved set state.

**Non-Goals:**

- More puzzle-set families, set editors, procedural rewards behind doors, sound effects, or changes to later-level content.
- A separate persistence format or a new rendering engine.

## Decisions

### Store grouped puzzle data outside the ordinary entity list

Add a typed `Floor.objectSets` collection with a discriminated `floor-trigger-door-barrel` entry. Each entry keeps its set id and the barrel, trigger, and door coordinates. The barrel and door are blocking positions. The trigger is a floor overlay, so the player or barrel can occupy it without duplicating an `Entity` coordinate.

Keep `Floor.entities` for enemies, pickups, stairs, and other existing single-cell content. Extending it with three entity kinds would make a barrel on a trigger collide with the trigger in the current `entityAt` lookup. It would also force the generator to allow an exception to its one-cell reservation rule.

### Derive active and open state from positions

Add domain helpers that resolve a set's trigger state from the player position and its barrel position. The door's traversal and render state read that result. The save stores only the durable coordinates and set identity, then recomputes state during normalization and after every accepted move. This prevents an out-of-date saved boolean from leaving a door open after a reload.

An independently stored `isOpen` field was rejected because it duplicates occupancy-derived state and needs extra repair logic on each restore.

### Generate a solvable local layout in the existing object-placement pass

For level one, extend the generated map with a small sealed room or branch whose only entrance is the door. Use the seeded random sequence to choose a valid configuration from walkable cells within a 20-by-20 tile region around the start. Require distinct barrel, trigger, and door cells, a legal cardinal push into the trigger, no overlap with reserved cells or other objects, and a route through the held-open door. Reserve the barrel and door cells in the existing placement map. The trigger remains an overlay and does not reserve its cell.

Picking arbitrary nearby cells was rejected because it can create an unpushable barrel, a bypassable door, or an unsolvable required route.

### Choose sealed-region content from the seed

Store a `regionRole` on the set and derive it from the same seeded generator. The role is `optional-reward` or `exit`. Populate the sealed region with the matching existing content. This preserves save stability and makes the assignment visible to the domain layer.

Selecting the role at runtime was rejected because a reload could change a floor's required objective or exit position.

### Resolve barrel bumps before ordinary movement and block door traversal in shared movement checks

Extend the procedural action resolver so a cardinal bump against a barrel tests the tile beyond it for terrain, ordinary entities, other blocking set members, and closed doors. On success, move the barrel and player in one accepted action, recompute all set states, then run the established turn tick. A failed push returns the existing rejected-action shape.

Use a shared set-aware walkability or occupancy helper for player movement and enemy movement. This keeps a closed door blocked for every actor and lets an open door act as ordinary walkable ground. Diagonal movement does not push barrels because the existing push rule is cardinal.

### Render resolved set members through the shared world model

Extend `WorldRender.Render` with ordered puzzle-object entries that include kind, coordinates, set id, and active or open state. Both game and minimap pass the same floor state to this adapter. The Babylon renderer loads the existing vendor barrel and door art as frame atlases and renders the trigger in its own floor-panel layer directly above terrain and below every wall, prop, pickup, barrel, door, and character. It uses the three-frame third row of the `props-animated` atlas: it holds the first frame while inactive, plays all three frames once when activated, and holds the final frame while active. It adds bounded sprite layers for set members alongside the existing object layers.

Drawing the puzzle only in the game canvas was rejected because it would violate the shared world geometry contract and hide the state change from the minimap.

### Treat pushable barrels as sub-grid movers, not static props

The renderer-facing turn presentation system tracks exactly the world objects that change grid coordinates during an accepted turn: the player, enemies, and pushable barrels. A barrel is keyed by its object-set id plus `-barrel`, moves from its prior set coordinate to its next one over the same short transition as the player, and is sampled by both game and minimap renderers.

Floor triggers and doors remain grid-aligned because their coordinates do not change; they communicate their state through dedicated active/open frames. Terrain, walls, pickups, chests, stairs, decorations, particles, and UI effects are likewise not sub-grid movers. Camera feedback remains a separate camera-transform animation; it may follow the presented player position, but it is neither a world object nor part of turn collision playback.

## Risks / Trade-offs

- [A local placement has no valid sealed layout for a rare seed] -> Try seeded candidates in a fixed order, then use a deterministic local fallback that has one door entrance and satisfies the same puzzle validation.
- [A stale legacy save lacks `objectSets`] -> Normalize it to an empty collection and let only newly generated level-one floors receive the set.
- [Door art has a taller source frame than a tile] -> Keep the collision coordinate tile-based and tune the sprite pivot and render order separately.
- [New blocking state affects enemy movement] -> Use the shared occupancy check and cover player and enemy attempts in focused unit tests.

## Migration Plan

1. Extend the floor contract and save normalization to accept missing object-set data.
2. Generate and validate the first level-one sealed region and its role, then resolve its state in the action loop.
3. Add shared world-model and Babylon presentation support.
4. Run focused logic tests and one muted Playwright puzzle interaction check. Reserve the broader suite for finalization.

Rollback removes the new optional floor field and renderer layers. Existing saves remain readable because the normalized missing field defaults to an empty collection.
