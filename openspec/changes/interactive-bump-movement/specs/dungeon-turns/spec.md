# Spec Delta

## ADDED Requirements

### Requirement: Bump interactive blocked cells
The player SHALL bump only when a cardinal attempted destination is an adjacent enemy, closed crate, or unopened treasure chest. Walls, pickups, traps, stairs, and noninteractive blocked cells SHALL not bump.

#### Scenario: Attempt an enemy cell
- **WHEN** the player attempts to move into an adjacent enemy
- **THEN** the player performs a bump and the combat interaction resolves at its apex

#### Scenario: Attempt a closed container
- **WHEN** the player attempts to move into an adjacent closed crate or unopened treasure chest
- **THEN** the player performs a bump and the container interaction resolves at its apex

#### Scenario: Attempt a wall
- **WHEN** the player attempts to move into a wall
- **THEN** the player remains visually still and no bump interaction occurs
