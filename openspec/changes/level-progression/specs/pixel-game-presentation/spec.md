# Spec Delta

## MODIFIED Requirements

### Requirement: Display turn and game status
The titlebar SHALL show the title `Dungeon Roguelite (DR)`, world, Dungeon Level, Time, keys, and gold; the secondary panel SHALL show Minimap, Quest, and Log; and the primary panel SHALL show Status, Attributes, Abilities, Slots, and Inventory. Statusbar content SHALL be vertically centered within its region. Difficulty SHALL remain hidden. A level gain SHALL not force a modal stat-choice window. Item-decision overlays SHALL be removed.

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
- **WHEN** a player gains a level during play
- **THEN** gameplay remains available after the celebration and no modal stat-choice window blocks it

### Requirement: Render bordered cards and plain Quest
Each panel card SHALL have a border with its title interrupting the top edge, left aligned by default. The secondary panel SHALL order Minimap, Quest, Log; the primary panel SHALL order Status, Attributes, Abilities, Slots, Inventory. Quest SHALL show plain active objective text without numbered slots, icons, artwork, or scrolling.

#### Scenario: Read the objective
- **WHEN** the active objective is Find the exit
- **THEN** the Quest card displays that text simply, like a Log entry
