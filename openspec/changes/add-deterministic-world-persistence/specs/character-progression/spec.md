# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve progression on death
At zero Health, the player SHALL begin a newly generated Dungeon Level 1 with a positive hidden run number one greater than the previous run number. Run Inventory, equipment, current resources, Time, run counters, and level-state deltas SHALL reset. The installation world seed, persistent base attributes, XP count, partial XP, ability bindings, and Difficulty SHALL remain, with the five inactive attributes still zero. Difficulty and run number SHALL not be shown in the player-facing interface.

#### Scenario: Death starts a fresh Level 1
- **WHEN** the character dies
- **THEN** a new Level 1 layout starts with Time at zero, empty run equipment/Inventory, and starting run counters/resources, while character progression and hidden Difficulty remain

#### Scenario: Death advances deterministic run identity
- **WHEN** the character dies in a Saved Game
- **THEN** its next run uses the same installation world seed and Saved Game number with a run number increased by one

#### Scenario: Death starts fresh floor
- **WHEN** the character dies
- **THEN** the run restarts at its initial depth with new dungeon layout and empty gear while persistent progression remains intact
