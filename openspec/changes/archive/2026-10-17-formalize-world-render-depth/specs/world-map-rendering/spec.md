# Spec Delta

## ADDED Requirements

### Requirement: Order world visuals through defined render passes
The game view SHALL render walkable terrain first, floor-attached decals second, and walls, props, pickups, stairs, barrels, enemies, and the player in one shared world-depth pass. The minimap SHALL derive matching world coordinates and mover positions without adopting game-view occlusion behavior.

#### Scenario: Draw a floor trigger under a barrel
- **WHEN** an active floor trigger and its barrel share one tile
- **THEN** the trigger renders above walkable terrain and below the barrel, wall tiles, and characters

#### Scenario: Render matching world positions in both views
- **WHEN** the game view and minimap render a floor containing walls, a player, enemies, and a barrel
- **THEN** both views use the same world coordinates and presented mover positions for those entries

### Requirement: Sort shared world visuals by ground-contact depth
The shared world-depth pass SHALL order each visual by its ground-contact pixel Y coordinate. Entries with the same Y coordinate SHALL use a deterministic tie-break, and an entity shadow SHALL render immediately before that entity's main sprite.

#### Scenario: Pass a character south of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position south of a wall's front edge
- **THEN** that entity renders in front of the wall

#### Scenario: Pass a character north of a wall
- **WHEN** a player, enemy, or barrel has a ground-contact position north of a wall's front edge
- **THEN** the wall renders in front of that entity

#### Scenario: Move an entity with a shadow
- **WHEN** a player, rat, skeleton, or barrel is visible while stationary or moving between grid cells
- **THEN** its shadow and main sprite use the same presented position and the shadow renders directly beneath its main sprite

### Requirement: Preserve explicit depth exceptions
Walkable terrain, floor-attached decals, screen-space UI and diagnostics, and effects with an explicitly documented owner-relative depth SHALL NOT enter the shared world-depth sort. An owner-relative effect SHALL retain its declared position above or below its owner regardless of unrelated world Y positions.

#### Scenario: Render a player heal effect
- **WHEN** the player Heal effect is active near another world visual with a different Y coordinate
- **THEN** the effect remains at its documented depth above the player

#### Scenario: Render the targeting reticle
- **WHEN** the player points at a visible game-view cell
- **THEN** the reticle remains a screen-space overlay and does not change world-visual ordering
