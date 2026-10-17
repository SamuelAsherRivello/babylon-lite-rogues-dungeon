# Spec Delta

## REMOVED Requirements

### Requirement: Resolve combat deterministically
The game SHALL calculate melee and enemy-hit damage without hit rolls, critical hits, blocks, or random damage ranges. An enemy hit that resolves after mitigation SHALL deal at least one Health damage.

#### Scenario: Resolve an enemy hit
- **WHEN** an enemy attack resolves against a player with effective Defense
- **THEN** the game uses the attacker's deterministic combat values, reduces the result by the player's effective Defense, and applies no less than one Health damage

#### Reason: Player melee attacks now require weapon-defined percentile outcomes and incoming attacks require explicit directional mitigation.

## ADDED Requirements

### Requirement: Resolve chance-based player melee combat
The game SHALL resolve a player melee attack with one percentile outcome using weapon HIT plus Luck and weapon CRIT. A CRIT occurs within the weapon CRIT range, a normal hit occurs within the remaining HIT range, and a MISS deals no target damage. A critical SHALL deal 150 percent of the final normal damage, rounded up.

#### Scenario: Miss an enemy
- **WHEN** the combat roll exceeds the weapon HIT value plus Luck
- **THEN** the enemy loses no Health and the result is a MISS

#### Scenario: Critically hit an enemy
- **WHEN** the combat roll falls within the weapon CRIT range
- **THEN** the enemy takes 150 percent of the final normal damage rounded up

### Requirement: Mitigate incoming damage by facing
The game SHALL calculate incoming damage using Stamina-scaled Defense at 100 percent from the player's front, 70 percent from either side, and 40 percent from the rear. Shields SHALL increase Defense for every direction, and the Two-Handed Sword SHALL automatically parry its defined attack outcome.

#### Scenario: Take a rear attack
- **WHEN** an enemy damages the player from behind the player's cardinal heading
- **THEN** the game applies 40 percent of the player's Stamina-scaled Defense

