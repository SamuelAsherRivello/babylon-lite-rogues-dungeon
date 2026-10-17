# Spec Delta

## ADDED Requirements

### Requirement: Show a damage-particle burst for any damaged character
When combat damage reduces a player or enemy's Health, the game SHALL show four transient particles centered on that character. Each particle SHALL begin at 25 percent of one grid tile, move a random radial direction by one-half grid tile during 250 milliseconds, and fade from transparent to opaque at its midpoint and back to transparent at its end.

#### Scenario: Player takes damage
- **WHEN** an enemy attack reduces the player's Health
- **THEN** four damage particles appear at the player's position and expire after 250 milliseconds

#### Scenario: Enemy takes melee damage
- **WHEN** the player damages an enemy with a melee attack
- **THEN** four damage particles appear at that enemy's position and expire after 250 milliseconds

#### Scenario: Enemy takes ability damage
- **WHEN** an ability damages an enemy
- **THEN** four damage particles appear at that enemy's position and expire after 250 milliseconds

#### Scenario: A destructible object is destroyed
- **WHEN** a destructible object is destroyed
- **THEN** four damage particles appear at that object's position and expire after 250 milliseconds

## MODIFIED Requirements

### Requirement: Keep floating feedback transient and text-only
Floating health feedback and damage particles SHALL disappear after their brief animations and SHALL NOT render world-space health bars or persistent health indicators.

#### Scenario: Feedback expires
- **WHEN** a floating-text or damage-particle animation completes
- **THEN** its feedback is removed from the world view

#### Scenario: Enemy remains visible
- **WHEN** an enemy is damaged
- **THEN** the world view shows its transient damage feedback without a health bar
