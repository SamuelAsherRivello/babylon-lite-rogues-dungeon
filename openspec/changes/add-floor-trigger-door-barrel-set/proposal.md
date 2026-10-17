# Proposal

## Why

The dungeon has pickups and bump interactions but no spatial puzzle objects that let a player manipulate the map. A reusable linked-object-set model enables the first readable push-and-trigger puzzle near the level-one start while establishing a safe basis for future grouped world mechanisms.

## What Changes

- Introduce a `Floor Trigger Door Barrel Set`: one linked barrel, floor trigger, and door that are created, saved, restored, and placed as a group.
- Place exactly one set on the first generated floor near the starting area; choose walkable cells for the barrel and trigger, keep every member within a 20-by-20-tile neighborhood, and place its door as the only entrance to an otherwise unreachable room or branch.
- Let cardinally bumping a barrel push it exactly one tile away when its destination is walkable and unoccupied; a successful push is one accepted tactical action.
- Make the trigger active while occupied by the player or barrel and open its linked door. Render closed/open door and inactive/active trigger states so the connection is visible in the world and minimap.
- Keep the door closed and blocking when its trigger is inactive; reopening and closing must reflect the current occupier after movement, pushing, loading, and floor restoration.
- Use the seeded generator to select whether the sealed region holds an optional reward or exit stairs. The exit role must remain solvable.
- Define the set interface so later puzzle-set types can be added as cohesive groups rather than independently generated objects.

## Capabilities

### New Capabilities

- `dungeon-object-sets`: Linked dungeon object sets with valid grouped placement, persistent linkage, occupancy-driven state, and future-extensible set identities.

### Modified Capabilities

- `dungeon-turns`: Adds barrel bump/push interactions and the traversal consequences of a trigger-controlled door.
- `world-map-rendering`: Adds synchronized game-view and minimap presentation for the barrel, floor trigger, and linked door states.

## Impact

- Affects the serializable world entity contracts, deterministic level-one procedural placement, tactical movement resolution, save normalization, and world/minimap render adapters.
- Adds focused logic and presentation coverage; a focused Playwright check is useful during implementation because the required feedback is browser-visible, but it is not run during this proposal.
- Uses the existing Dungeons-and-Pixels barrel and door artwork where appropriate; no new dependency or external service is required.
