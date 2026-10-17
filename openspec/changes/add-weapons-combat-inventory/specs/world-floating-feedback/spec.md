# Spec Delta

## ADDED Requirements

### Requirement: Label exceptional player attack outcomes
The world feedback SHALL show normal player damage as a number, critical player damage as `CRIT <damage>`, and a failed player attack as `MISS`. A MISS SHALL show at the enemy position and shall not show a damage number.

#### Scenario: Show a critical hit
- **WHEN** a player attack critically damages an enemy for 12
- **THEN** the enemy position displays `CRIT 12`

#### Scenario: Show a miss
- **WHEN** a player attack misses an enemy
- **THEN** the enemy position displays `MISS` and no damage number

### Requirement: Distinguish incoming attack directions
The player damage feedback SHALL visually distinguish north, south, east, and west incoming attacks while remaining transient and text-only.

#### Scenario: Show a north attack
- **WHEN** an enemy damages the player from north
- **THEN** the player feedback uses the north-specific directional treatment

