# Spec Delta

## ADDED Requirements

### Requirement: Render semantic terrain roles from any level generator
The shared world renderer SHALL consume terrain roles and walkability from the active level's semantic grid rather than assuming that every level was produced by the dungeon generator.

#### Scenario: Render a dungeon and overworld
- **WHEN** the active level changes from a rectilinear dungeon to an organic overworld
- **THEN** the game view and minimap render both from their active semantic terrain without generator-specific coordinate conversion

### Requirement: Preserve pass-generated coordinates
The game view and minimap SHALL preserve the same cell coordinates for terrain, actors, start, exit, and landmarks regardless of which generation passes produced them.

#### Scenario: Compare game view and minimap
- **WHEN** both views render a pass-composed level
- **THEN** corresponding terrain and entities occupy matching world coordinates while scale and camera framing remain presentation-only

