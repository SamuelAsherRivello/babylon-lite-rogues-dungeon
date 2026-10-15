# Spec Delta

## MODIFIED Requirements

### Requirement: Display turn and game status
The titlebar SHALL show the title `Dungeon Roguelite (DR)`, world, Dungeon Level, Time, keys, and gold; the secondary panel SHALL show Minimap, Quest, and Log; and the primary panel SHALL show Resources, Attributes, Abilities, Slots, and Inventory. Statusbar content SHALL be vertically centered within its region. Difficulty SHALL remain hidden. A level-up selection SHALL appear in a modal window while an upgrade choice is pending. Item-decision overlays SHALL be removed.

#### Scenario: Show turn counter
- **WHEN** an accepted action advances one time unit
- **THEN** the visible Time counter increases once

#### Scenario: Show Dungeon Level without Difficulty
- **WHEN** the game is running
- **THEN** the titlebar shows the current Dungeon Level and does not show Difficulty

#### Scenario: Complete a dungeon
- **WHEN** the player enters the next dungeon
- **THEN** World remains One and Dungeon Level advances from N to N+1

#### Scenario: Align statusbar content
- **WHEN** the landscape shell is shown
- **THEN** the control legend and developer content are vertically centered within the statusbar

#### Scenario: Choose a level-up stat
- **WHEN** a player has a pending level-up choice
- **THEN** the game displays a modal level-up window until the player selects one option
