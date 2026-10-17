# Spec Delta

## Purpose

Defines linked dungeon puzzle sets so each set is placed, saved, and restored as one valid game mechanism rather than unrelated objects.

## ADDED Requirements

### Requirement: Place linked object sets as valid groups
The dungeon SHALL represent each puzzle as an identified object set with all of its members linked to that set. The first floor SHALL contain exactly one Floor Trigger Door Barrel Set selected by the seeded generator near the player start. Its barrel and floor trigger SHALL occupy distinct walkable cells, all three members SHALL fit within one 20-by-20-tile region, and its closed door SHALL be the only entrance to a separate room or branch.

#### Scenario: Generate the first-floor set
- **WHEN** a level-one floor is generated for a seed
- **THEN** it contains one linked barrel, floor trigger, and door with valid non-overlapping coordinates near the start
- **AND** the barrel and trigger are on walkable tiles
- **AND** the closed door separates a region that has no other player route from the starting side

#### Scenario: Generate a repeatable set
- **WHEN** the same level-one seed is generated again
- **THEN** the linked set has the same members and coordinates

### Requirement: Choose the sealed-region role deterministically
The generator SHALL assign each Floor Trigger Door Barrel Set's sealed region one seeded role: optional reward or exit stairs. An exit role SHALL have a valid route through the puzzle while the door is held open.

#### Scenario: Repeat a generated region role
- **WHEN** the same floor seed is generated again
- **THEN** the sealed region has the same role and contents

#### Scenario: Generate a required region
- **WHEN** the seeded role is exit stairs
- **THEN** the player can solve the barrel and trigger puzzle to reach that role

### Requirement: Resolve trigger occupancy through its linked door
The floor trigger SHALL be active when the player or its linked barrel occupies the trigger tile. The linked door SHALL be open and traversable while the trigger is active, and closed and blocking while it is inactive.

#### Scenario: Player activates the trigger
- **WHEN** the player enters a floor trigger tile
- **THEN** its linked door opens for that occupancy

#### Scenario: Barrel holds the trigger
- **WHEN** the linked barrel occupies a floor trigger tile and the player leaves it
- **THEN** the linked door remains open

#### Scenario: Trigger becomes unoccupied
- **WHEN** neither the player nor its linked barrel occupies the trigger tile
- **THEN** the linked door closes and blocks traversal

### Requirement: Preserve linked set state across campaign storage
The campaign save and restored floor state SHALL retain each object's set identity, coordinates, and current trigger-derived door state. Returning to a previously visited floor SHALL restore the same linked set state.

#### Scenario: Resume while the door is open
- **WHEN** a player saves or reloads a floor while the barrel or player holds a trigger
- **THEN** the restored linked door is open and traversable

#### Scenario: Return to a visited floor
- **WHEN** a player returns to a previously visited floor containing a linked set
- **THEN** its barrel position and linked door state match the saved floor
