# Spec Delta

## MODIFIED Requirements

### Requirement: Keep world views geometrically consistent

The game view and minimap SHALL derive terrain, walls, object coordinates, and actor coordinates from the same active realm. They SHALL use identical traversal and placement rules with arguments controlling view bounds, scale, detail, layers, and markers. The minimap SHALL provide a simplified low-resolution representation of the realm rather than unrelated artwork. Generated levels, exported editable maps, and repaired maps SHALL use one canonical Grounds and Walls tile-layer result for their visible terrain.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** walls, player, and exit occupy matching map coordinates despite different scale and detail

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale terrain or actors

#### Scenario: Render a generated level and its editable copy
- **WHEN** a generated level is rendered in the game and exported as an editable Tiled map
- **THEN** the same walkable cells and wall cells appear in both representations, Walls use the same resolved frames, and Grounds uses the single approved walkable tile

#### Scenario: Resolve an authored repaired map
- **WHEN** a repaired map supplies valid Grounds and Walls layers
- **THEN** runtime rendering preserves those authored tile frames while using the same coordinates and semantic walkability
