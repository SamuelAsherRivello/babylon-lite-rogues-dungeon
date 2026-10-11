# Spec Delta

## Purpose

Provides bidirectional stairs for moving between generated levels while keeping one active level at a time and preserving the player's return location between connected levels.

## ADDED Requirements

### Requirement: Place deterministic level stairs near the start
Each generated level that supports transitions SHALL place stairs on a reachable walkable cell within 30 grid cells of that level's start, using the level seed for reproducible placement.

#### Scenario: Generate a level with stairs
- **WHEN** a transition-enabled level is generated
- **THEN** it contains stairs within the 30-cell start radius, the stairs are walkable and reachable, and the same seed reproduces their position

### Requirement: Enter the adjacent level on collision
The game SHALL load the next level when the player collides with forward stairs, preserving the world and realm identity and updating the active level shown by the HUD.

#### Scenario: Descend through stairs
- **WHEN** the player steps onto stairs leading forward
- **THEN** the current level is replaced by the next generated level and the HUD reflects the new level number

### Requirement: Return through paired stairs
Each transition SHALL be bidirectional so that stairs leading back from the destination level return the player to the originating level and preserve the connection between the two levels.

#### Scenario: Ascend through stairs
- **WHEN** the player collides with the return stairs on the destination level
- **THEN** the originating level is restored and the player returns through the paired transition without creating a duplicate unrelated level

### Requirement: Extend levels recursively
If a newly loaded level has another forward stair set, the player SHALL be able to load the next level while retaining return links to the previous level.

#### Scenario: Reach a third level
- **WHEN** level 2 contains a second forward stair set and the player collides with it
- **THEN** level 3 loads and its return stairs lead back to level 2

### Requirement: Keep transition state compatible with saves
The active level and generated transition links SHALL be serializable and restorable without regenerating a different return destination or changing the player's level position.

#### Scenario: Save beside stairs
- **WHEN** the campaign is saved after entering a connected level
- **THEN** loading the campaign restores the same active level, stair links, player position, and HUD level value
