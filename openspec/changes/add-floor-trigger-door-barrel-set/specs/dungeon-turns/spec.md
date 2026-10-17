# Spec Delta

## MODIFIED Requirements

### Requirement: Generate traversable dungeon floors
Each run SHALL begin in a newly generated 100 by 100 tile dungeon floor with a traversable player start at the floor's central tile, a reachable exit stair, a starting weapon nearby, floor content appropriate to the current depth, and exactly one valid Floor Trigger Door Barrel Set near the central start on level one.

#### Scenario: Start a run
- **WHEN** a new run begins
- **THEN** the player appears at the central tile of a traversable 100 by 100 procedural floor with empty equipment, a nearby stick, and one valid Floor Trigger Door Barrel Set

#### Scenario: Descend without an ending
- **WHEN** the player reaches and enters the floor's stair tile
- **THEN** a new 100 by 100 procedural floor loads at the next depth with stronger or additional enemy types available

### Requirement: Advance one tactical turn per accepted grid action
A legal player step, actionable bump interaction, or explicit wait action SHALL advance time by exactly one turn, and enemies SHALL act once during that turn. An accepted ability SHALL advance time and run its enemy phase exactly once when its presentation completes. A mouse-selected destination with no legal cardinal route SHALL be rejected without moving the player, advancing time, or causing an enemy action. A successful cardinal barrel push SHALL count as an actionable bump interaction.

#### Scenario: Walk into traversable space
- **WHEN** the player makes one accepted grid move
- **THEN** the player moves one cell and the displayed time increases by one

#### Scenario: Bump an enemy
- **WHEN** the player bumps an adjacent enemy
- **THEN** one attack action resolves and time advances once

#### Scenario: Push a barrel
- **WHEN** the player bumps a barrel from a cardinal direction and the cell one tile beyond it is walkable and unoccupied
- **THEN** the player moves into the barrel's previous cell, the barrel moves one cell in the same direction, and time advances once

#### Scenario: Reject a blocked barrel push
- **WHEN** the player bumps a barrel whose destination is blocked or occupied
- **THEN** neither the player nor barrel moves and time does not advance

#### Scenario: Wait in place
- **WHEN** the player presses X or the mobile Wait button outside editable controls, Settings, and a level-up choice
- **THEN** the player stays in place, displayed time increases by one, and the normal enemy phase resolves once

#### Scenario: Complete an accepted ability
- **WHEN** Heal or Wand completes its presentation
- **THEN** its effect resolves, displayed time increases by one, and enemies act once

#### Scenario: Blocked terrain
- **WHEN** the player attempts to move into an impassable cell with no actionable target
- **THEN** the player stays in place and time does not advance

#### Scenario: Commit equipment or ability assignment
- **WHEN** a valid equipment drag or ability reorder is committed
- **THEN** its change is applied before one time increment and one enemy phase

#### Scenario: Settings remains open
- **WHEN** no gameplay action is accepted while Settings is open
- **THEN** world Time and enemies remain unchanged through the ordinary action-driven time rule

#### Scenario: Unreachable mouse destination
- **WHEN** the player selects a mouse destination with no legal cardinal path
- **THEN** the player stays in place and time does not advance
- **AND** enemies do not act

### Requirement: Interact through adjacent tiles
Bumping into an enemy, pickup, chest, stair, or barrel SHALL invoke that target's interaction; stepping onto ground loot, stairs, or a floor trigger SHALL also resolve that tile interaction. Collecting an item or potion as part of an accepted move SHALL add no turn beyond that move's one turn.

#### Scenario: Open a chest
- **WHEN** the player bumps an unopened adjacent chest
- **THEN** the chest opens and resolves its loot as one interaction turn

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
