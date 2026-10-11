# Spec Delta

## Purpose

Adds a mostly walkable overworld level family whose blocked mountain terrain has organic shapes, remains deterministic from a seed, and can coexist with later structured or authored areas on the same grid.

## ADDED Requirements

### Requirement: Generate a mostly walkable overworld
An overworld level SHALL begin with a walkable-majority terrain distribution and apply deterministic organic blocked regions for mountains or comparable natural obstacles.

#### Scenario: Generate an overworld
- **WHEN** an overworld is generated with a valid seed and dimensions
- **THEN** most cells are walkable, blocked mountain regions have non-rectilinear boundaries, and the result is reproducible from the seed

### Requirement: Preserve required overworld traversal
The overworld generator SHALL preserve a walkable route between required entrances, the player start, the exit, and any mandatory progression landmarks.

#### Scenario: Mountains surround a landmark
- **WHEN** organic mountain generation places blocked terrain near a required landmark
- **THEN** the generator preserves or repairs a walkable route to that landmark without removing the mountain system wholesale

### Requirement: Support structured overworld subareas
The overworld SHALL support later passes that reserve cells for planned rectilinear structures such as homes, settlements, or interiors without requiring the organic pass to generate those structures.

#### Scenario: Add a home to organic terrain
- **WHEN** a structured subarea pass is applied to a reserved overworld region
- **THEN** the region can contain rectilinear walkable and blocked geometry while the surrounding organic terrain remains intact

### Requirement: Make terrain density tunable
Overworld generation SHALL expose deterministic parameters for dimensions, walkable density, mountain density or threshold, organic scale, and protected or reserved areas.

#### Scenario: Tune a mountain-heavy variant
- **WHEN** a caller changes the overworld density or scale parameters while keeping the seed fixed
- **THEN** the generated terrain changes predictably without changing the pass contract or level identity

### Requirement: Keep overworld generation compatible with the level pipeline
The overworld SHALL be executable as an ordered level-generation pass sequence and SHALL emit the same semantic map contract used by dungeon levels.

#### Scenario: Render an overworld in existing views
- **WHEN** an overworld becomes the active level
- **THEN** gameplay, the game view, and the minimap consume its semantic grid and coordinates through the same interfaces used by dungeon levels
