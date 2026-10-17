# Spec Delta

## MODIFIED Requirements

### Requirement: Track six persistent character stats
The character SHALL retain ten persistent attributes: Health, Stamina, Offense, Defense, Mana, Vitality, Strength, Luck, Recovery, and Stealth. Each attribute SHALL be an integer from 1 through 99. Health, Stamina, Offense, Defense, and Mana SHALL define their matching Status capacity; the other attributes retain their defined deterministic effects. Defense SHALL derive chiefly from equipped armor and shields while retaining its attribute contribution.

#### Scenario: Apply stat effects
- **WHEN** a character attribute is used during play
- **THEN** its deterministic effect applies without changing the player's one-cell, one-turn movement rule

#### Scenario: Display Attributes
- **WHEN** the player equips or removes armor or a shield
- **THEN** effective Defense changes chiefly through the equipped item while retaining its attribute contribution

#### Scenario: Reach an attribute cap
- **WHEN** the player attempts to increase an attribute already at 99
- **THEN** that attribute remains 99 and the Attribute Point is not spent

### Requirement: Award experience and stat choices
Successful attacks, enemy defeats, discoveries, first opens of chests or crates, and a first arrival at a Dungeon Level SHALL award configured experience exactly once per qualifying event. Movement, waiting, and reused world objects SHALL not award experience. Each level threshold SHALL increase level by one through level 99, retain excess experience, and grant three unspent Attribute Points. Attribute Points SHALL persist until committed in Progression and SHALL not advance a tactical turn.

#### Scenario: Level up
- **WHEN** earned experience crosses a level threshold below level 99
- **THEN** level increases by one, excess experience remains toward the next threshold, and three Attribute Points become available

#### Scenario: Award a one-time world reward
- **WHEN** the player opens a particular chest or crate, records a discovery, or first arrives at a Dungeon Level
- **THEN** that source grants its configured experience once and cannot grant it again from reuse

#### Scenario: Attack an enemy
- **WHEN** the player successfully attacks an enemy
- **THEN** the attack grants its configured experience and the normal tactical turn resolves once

#### Scenario: Spend Attribute Points
- **WHEN** the player confirms a valid Progression allocation
- **THEN** each selected attribute increases by its confirmed amount, the matching number of Attribute Points is spent, and displayed time does not advance

#### Scenario: Preview an allocation
- **WHEN** the player adjusts a draft allocation or closes Progression without confirmation
- **THEN** committed attributes and Attribute Points remain unchanged

### Requirement: Begin each run with empty gear
Starting a fresh run SHALL clear run Inventory and equipped gear while retaining persistent attributes, level, unspent Attribute Points, XP count, partial XP, and ability bindings. The initial nearby stick SHALL be available to collect into Inventory before manual equipment.

#### Scenario: New run equipment
- **WHEN** a fresh run starts after death
- **THEN** Weapons and Armor positions and Inventory are empty while persistent progression remains

### Requirement: Preserve progression on death
At zero Health, the player SHALL begin a newly generated Dungeon Level 1 with run Inventory, equipment, current resources, Time, and run counters reset. Persistent attributes, level, unspent Attribute Points, XP count, partial XP, ability bindings, and Difficulty SHALL remain. Difficulty SHALL not be shown in the player-facing interface.

#### Scenario: Death starts a fresh Level 1
- **WHEN** the character dies
- **THEN** a new Level 1 layout starts with Time at zero, empty run equipment and Inventory, and starting run counters and resources while character progression and hidden Difficulty remain

#### Scenario: Death starts fresh floor
- **WHEN** the character dies
- **THEN** the run restarts at its initial depth with a new dungeon layout and empty gear while persistent progression remains intact

## ADDED Requirements

### Requirement: Celebrate a level gain
Crossing a level threshold SHALL present sparkles converging on the player and play the documented level-gain chime once. The celebration SHALL not stop the world or require an immediate allocation.

#### Scenario: Gain a level during play
- **WHEN** an XP award increases the character level
- **THEN** sparkles arrive from surrounding directions and merge on the character while the level-gain chime plays once

### Requirement: Prompt for unspent Attribute Points
When Attribute Points are unspent, Attributes SHALL present a panel-local `LEVEL UP` callout with the available point count and an `Open Progression` action. The callout SHALL not pause the world or be dismissible. Opening Progression SHALL show a full-game dialog that may close without committing a draft; the callout SHALL remain until no Attribute Points remain.

#### Scenario: Defer allocation
- **WHEN** the character gains Attribute Points and continues to act
- **THEN** the Attributes callout remains available while ordinary gameplay continues

#### Scenario: Close without spending
- **WHEN** the player closes Progression without confirmation
- **THEN** all committed values remain unchanged and the Attributes callout remains

#### Scenario: Spend only some points
- **WHEN** the player confirms an allocation that leaves Attribute Points unspent
- **THEN** the callout remains and shows the reduced available-point count

### Requirement: Create a balanced starting character
An empty Saved Game SHALL require a character roll before a campaign begins. Each roll SHALL distribute exactly 30 points across the ten attributes, with every attribute from 1 through 5. The player SHALL be able to reroll without limit and confirm only a rolled sheet.

#### Scenario: Reroll a character sheet
- **WHEN** the player selects Roll again
- **THEN** all ten displayed attributes form a new valid 30-point sheet without changing the Saved Game

#### Scenario: Confirm a character sheet
- **WHEN** the player confirms a rolled sheet
- **THEN** the campaign begins at Level 1 with that sheet and no Attribute Points
