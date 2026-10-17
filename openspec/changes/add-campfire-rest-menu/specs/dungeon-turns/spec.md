# Spec Delta

## MODIFIED Requirements

### Requirement: Interact through adjacent tiles
Bumping into an enemy, pickup, chest, campfire, stair, or barrel SHALL invoke that target's interaction; stepping onto ground loot, stairs, or a floor trigger SHALL also resolve that tile interaction. Collecting an item or potion as part of an accepted move SHALL add no turn beyond that move's one turn. Bumping a campfire SHALL open its rest menu without advancing time; a confirmed rest SHALL resolve as one interaction turn.

#### Scenario: Open a chest
- **WHEN** the player bumps an unopened adjacent chest
- **THEN** the chest opens and resolves its loot as one interaction turn

#### Scenario: Rest at a campfire
- **WHEN** the player confirms Rest after bumping an adjacent campfire
- **THEN** the player stays in place and time advances by exactly one while the normal enemy phase resolves once

#### Scenario: Push a barrel by bumping
- **WHEN** the player bumps a barrel with a legal cardinal push destination
- **THEN** the barrel push resolves as one interaction turn

#### Scenario: Activate a trigger by walking
- **WHEN** the player steps onto a floor trigger
- **THEN** its linked door updates to the active state during the accepted movement action

#### Scenario: Collect a discovery
- **WHEN** the player collects a valid discovery
- **THEN** the discovery is recorded and grants its specified experience once

#### Scenario: Collect while moving
- **WHEN** the player steps onto a collectible item or potion
- **THEN** the collection resolves during the accepted movement action and displayed time increases by exactly one
