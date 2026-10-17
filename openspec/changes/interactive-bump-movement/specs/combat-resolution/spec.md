# Spec Delta

## ADDED Requirements

### Requirement: Resolve melee contact at bump apex
Melee damage from a player or enemy bump SHALL resolve at the bump apex rather than before the attacker visibly reaches the target. A melee attack targets an adjacent character; a ranged attack targets a character farther away and SHALL not trigger an attacker bump.

#### Scenario: Contact damage timing
- **WHEN** a player bumps an adjacent enemy
- **THEN** the enemy’s health change and combat feedback occur 62.5 ms after the bump starts

#### Scenario: Enemy melee contact
- **WHEN** an adjacent enemy damages the player
- **THEN** that enemy bumps toward the player while the player receives the hit reaction

#### Scenario: Ranged attack
- **WHEN** an ability damages an enemy farther than one cell away
- **THEN** the attacker remains in place and no melee bump occurs
