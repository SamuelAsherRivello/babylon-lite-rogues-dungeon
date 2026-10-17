# Spec Delta

## ADDED Requirements

### Requirement: Resolve cardinal ranged enemy attacks
The Skeleton Archer SHALL fire only across a clear cardinal line of sight up to five tiles. It SHALL act during the normal enemy phase, use its cooldown, and resolve its hit with the same incoming-direction defense rule as melee enemies.

#### Scenario: Archer fires across a corridor
- **WHEN** a Skeleton Archer has a clear cardinal line to the player within five tiles and its action is due
- **THEN** it fires one ranged attack during the enemy phase

#### Scenario: Archer cannot fire through a wall
- **WHEN** a wall blocks the cardinal line between the Skeleton Archer and player
- **THEN** the archer does not damage the player through that wall

