# Spec Delta

## Purpose

Make ability activation readable through real-time world effects while preserving responsive, independent player controls.

## ADDED Requirements

### Requirement: Present the first two abilities in the world
Heal and Wand SHALL use the existing smoke-poff frames tinted purple. Heal SHALL play on the player, run 30% faster than the ordinary smoke-poff lifetime, grow from 120% to 360% scale over its lifetime, and render at a fixed depth above the player. Wand SHALL play at 50% scale and travel from the cast position to its locked target in real time.

#### Scenario: Present Heal
- **WHEN** the player accepts Heal
- **THEN** a purple smoke-poff begins centered on the player at 120% scale, finishes at 360% scale 30% faster than an ordinary smoke-poff, and renders above the player regardless of tile y-depth

#### Scenario: Present Wand
- **WHEN** the player accepts Wand with a valid nearest enemy
- **THEN** a purple smoke-poff at 50% scale travels from the player to that enemy during its lifetime

### Requirement: Enforce independent real-time ability cooldowns
Heal and Wand SHALL each begin a one-second real-time cooldown upon acceptance. A cooldown SHALL reject only another request for that same ability and SHALL NOT block movement, other abilities, or other accepted actions.

#### Scenario: Use another action during cooldown
- **WHEN** Wand is cooling down after an accepted cast
- **THEN** the player can still move and activate Heal if Heal is available

#### Scenario: Repeat the same ability before cooldown expiry
- **WHEN** the player requests Heal before its one-second cooldown expires
- **THEN** Heal is rejected without spending Mana, changing Health, or advancing time

### Requirement: Preserve Wand target identity
Wand SHALL lock its nearest valid enemy when the cast is accepted. Its effect SHALL track that enemy's current position and resolve against that enemy only when the presentation completes; if that enemy no longer exists, the presentation SHALL end without damage.

#### Scenario: Locked target moves
- **WHEN** a locked Wand target changes position before impact
- **THEN** the particle follows it and the damage resolves against that target on completion

#### Scenario: Locked target is already gone
- **WHEN** the locked Wand target no longer exists when the presentation completes
- **THEN** the presentation ends without dealing damage to another enemy
