# Spec Delta

## ADDED Requirements

### Requirement: Keep static world data independent from visibility presentation
The game view SHALL preserve compiled static terrain while applying per-cell discovery and light-intensity presentation independently. Camera movement, viewport resize, and zoom changes SHALL update the visible presentation without recompiling unchanged static world geometry.

#### Scenario: Reframe an unchanged dungeon
- **WHEN** the player moves, the camera reframes, or the viewport zoom changes
- **THEN** visible world cells update without recalculating unchanged terrain or wall tile selection

#### Scenario: Apply future cell visibility state
- **WHEN** discovery or light intensity changes for a world cell
- **THEN** that cell's presentation can change without rebuilding unrelated static terrain

### Requirement: Render the minimap with semantic cell markers
The minimap SHALL use a compact colored cell vocabulary for terrain and key world objects rather than the game-view sprite artwork, while retaining matching world coordinates and player position.

#### Scenario: Display a populated floor
- **WHEN** the minimap renders terrain, walls, the player, exit, pickups, and enemies
- **THEN** it shows their matching coordinates using semantic markers without loading their game-view sprite artwork
