# Spec Delta

## MODIFIED Requirements

### Requirement: Order world visuals through defined render passes
The game view SHALL render walkable terrain first and floor-attached decals second. Walls, props, pickups, stairs, barrels, enemies, and the player SHALL use the shared world-depth pass without a fixed sprite layer overriding their depth. The minimap SHALL derive matching world coordinates and mover positions without adopting game-view occlusion behavior.

#### Scenario: Draw a floor trigger under a barrel
- **WHEN** an active floor trigger and its barrel share one tile
- **THEN** the trigger renders above walkable terrain and below the barrel, wall tiles, and characters

#### Scenario: Render matching world positions in both views
- **WHEN** the game view and minimap render a floor containing walls, a player, enemies, and a barrel
- **THEN** both views use the same world coordinates and presented mover positions for those entries

#### Scenario: Draw a floor beside a wall
- **WHEN** a wall tile and an adjacent walkable floor tile are visible
- **THEN** the floor remains behind the wall art without changing the depth order of a prop or character at that boundary

### Requirement: Sort shared world visuals by ground-contact depth
The shared world-depth pass SHALL order each visual by its ground-contact pixel Y coordinate. Walls SHALL use their front edge. Entries with the same Y coordinate SHALL use a deterministic tie-break, and a composite entity's shadow SHALL render immediately before its main sprite.

#### Scenario: Pass a character south of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position south of a wall's front edge
- **THEN** that entity renders in front of the wall

#### Scenario: Pass a character north of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position north of a wall's front edge
- **THEN** the wall renders in front of that entity

#### Scenario: Order an object at a wall boundary
- **WHEN** a pickup, chest, door, torch, stair, or particle shares a ground-contact Y coordinate with a wall
- **THEN** the deterministic tie-break produces the same visible order on every frame

#### Scenario: Move an entity with a shadow
- **WHEN** a player, rat, skeleton, or barrel is visible while stationary or moving between grid cells
- **THEN** its shadow and main sprite use the same presented position and the shadow renders directly beneath its main sprite
