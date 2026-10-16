# dungeon-turns Specification

## Purpose

Defines the tactical dungeon turn loop: generated rooms, grid movement, enemies, combat, treasure, and descent through an endless medieval dungeon.

## Requirements

### Requirement: Generate traversable dungeon floors
Each run SHALL begin in a newly generated 100 by 100 tile dungeon floor with a traversable player start at the floor's central tile, a reachable exit stair, a starting weapon nearby, and floor content appropriate to the current depth.

#### Scenario: Start a run
- **WHEN** a new run begins
- **THEN** the player appears at the central tile of a traversable 100 by 100 procedural floor with empty equipment and a nearby stick

#### Scenario: Descend without an ending
- **WHEN** the player reaches and enters the floor's stair tile
- **THEN** a new 100 by 100 procedural floor loads at the next depth with stronger or additional enemy types available

### Requirement: Advance one tactical turn per accepted grid action
A legal player step, actionable bump interaction, or explicit wait action SHALL advance time by exactly one turn, and enemies SHALL act once during that turn. An accepted ability SHALL advance time and run its enemy phase exactly once when its presentation completes. A mouse-selected destination with no legal cardinal route SHALL be rejected without moving the player, advancing time, or causing an enemy action.

#### Scenario: Walk into traversable space
- **WHEN** the player makes one accepted grid move
- **THEN** the player moves one cell and the displayed time increases by one

#### Scenario: Bump an enemy
- **WHEN** the player bumps an adjacent enemy
- **THEN** one attack action resolves and time advances once

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

### Requirement: Prevent diagonal corner cutting
Diagonal steps SHALL be accepted only when the destination and both orthogonally adjacent cells are traversable.

#### Scenario: Both sides of diagonal are open
- **WHEN** the player moves diagonally through two open orthogonal neighbors into an open destination
- **THEN** the diagonal step is accepted as one turn

#### Scenario: A diagonal is pinched by a wall
- **WHEN** either orthogonal neighbor of a diagonal step is blocked
- **THEN** the move is rejected without advancing time

### Requirement: Resolve tactical enemy actions
Living enemies SHALL have an individual awareness radius and action cooldown. An enemy within its effective awareness range SHALL take at most one action, moving one cell or attacking, only when its cooldown permits after an accepted player turn.

#### Scenario: Enemy waits for its cooldown
- **WHEN** an aware enemy's action cooldown is not due after an accepted player turn
- **THEN** that enemy neither moves nor attacks during the turn

#### Scenario: Eligible enemy approaches
- **WHEN** an enemy is aware and its action cooldown is due after an accepted player turn
- **THEN** it moves one cell toward the player or performs one attack when adjacent

#### Scenario: Enemy approaches
- **WHEN** an enemy can reach or attack the player during its action
- **THEN** it moves or attacks once according to its behavior

### Requirement: Interact through adjacent tiles
Bumping into an enemy, pickup, chest, or stair SHALL invoke that target's interaction; stepping onto ground loot or stairs SHALL also resolve their tile interaction. Collecting an item or potion as part of an accepted move SHALL add no turn beyond that move's one turn.

#### Scenario: Open a chest
- **WHEN** the player bumps an unopened adjacent chest
- **THEN** the chest opens and resolves its loot as one interaction turn

#### Scenario: Collect a discovery
- **WHEN** the player collects a valid discovery
- **THEN** the discovery is recorded and grants its specified experience once

#### Scenario: Collect while moving
- **WHEN** the player steps onto a collectible item or potion
- **THEN** the collection resolves during the accepted movement action and displayed time increases by exactly one

### Requirement: Resolve dual-wield attacks together
When both Weapons positions contain attack-capable weapons, a melee bump SHALL resolve the combined weapon action before one enemy phase and one time increment. Rearranging those weapons within the group SHALL not change their combined attribute effect. A shield SHALL contribute only its defined item effects.

#### Scenario: Attack with two weapons
- **WHEN** both Weapons positions contain attack-capable weapons and the player bumps an enemy
- **THEN** their attack resolves as one action, with one stamina charge and one time increment

### Requirement: Advance Dungeon Level and persistent Difficulty at exits
Each new campaign SHALL begin at Dungeon Level 1 and Difficulty 1. Entering an exit SHALL increase both values by one, then generate the next dungeon using the new Difficulty. Dungeon Level and Time SHALL reset to 1 and zero on death; Difficulty SHALL persist with saved character progression and continue to drive generated challenge. Difficulty SHALL remain hidden from players.

#### Scenario: Enter an exit
- **WHEN** the player enters the exit on Dungeon Level N
- **THEN** the game starts Dungeon Level N+1 and uses Difficulty N+1 for world generation

#### Scenario: Die at a later Dungeon Level
- **WHEN** the player dies after reaching a later Dungeon Level
- **THEN** a new Dungeon Level 1 is generated using the saved Difficulty, and Time resets to zero

### Requirement: Advance time for committed loadout changes
A committed ability-binding or equipment-slot assignment, removal, reorder, or swap SHALL advance exactly one tactical turn. A rejected, cancelled, or unchanged loadout operation SHALL NOT advance time.

#### Scenario: Commit an equipment change
- **WHEN** the player commits a valid equipment-slot change
- **THEN** the loadout changes and displayed time increases by one

#### Scenario: Cancel a loadout change
- **WHEN** the player cancels or attempts an invalid loadout operation
- **THEN** the loadout and displayed time remain unchanged
