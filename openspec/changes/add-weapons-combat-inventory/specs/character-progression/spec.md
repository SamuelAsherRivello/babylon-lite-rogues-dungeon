# Spec Delta

## MODIFIED Requirements

### Requirement: Track six persistent character stats
The character SHALL have persistent Vitality, Strength, Luck, Recovery, and Stealth stats. Vitality increases maximum Health, Strength improves weapon offense, Luck adds one percentage point of HIT per rank and retains its separate loot-tier behavior, Recovery improves Stamina recovered from movement, and Stealth reduces effective enemy awareness. Defense SHALL derive primarily from equipped armor and shields, with only a small innate value.

#### Scenario: Apply stat effects
- **WHEN** the character's persistent stats are used during play
- **THEN** each stat applies its defined effect without changing the player's one-cell, one-turn movement rule

#### Scenario: Display Attributes
- **WHEN** the player equips or removes armor or a shield
- **THEN** effective Defense changes chiefly through the equipped item while retaining the character's small innate Defense

### Requirement: Equip five gear slots
The character SHALL have two Weapons positions and two Armor positions. Items SHALL enter Inventory before manual compatible equip. Equipment SHALL use only Offense, Defense, and Mana modifiers and never have durability or a Mana cost. A two-slot item SHALL occupy both positions in its compatible group. Only enabled equipment SHALL modify attributes. The system SHALL not auto-equip or prompt to replace gear.

#### Scenario: Auto-equip into empty slot
- **WHEN** the player collects compatible gear while a position is empty
- **THEN** the gear enters Inventory and that position stays empty until a drag is committed

#### Scenario: Decide on occupied slot
- **WHEN** the player finds gear while matching positions are occupied
- **THEN** it enters Inventory if capacity is available, without a swap/leave prompt

#### Scenario: Equip a two-slot item
- **WHEN** a player equips a Two-Handed Sword into an empty Weapons group
- **THEN** both Weapons positions become occupied by that item and its modifiers apply once

