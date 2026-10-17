# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, realm/map, entities, player position, time, attributes/resources, XP, Inventory, equipment occupancy, combat roll state, ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including two-slot equipment occupancy and later combat roll outcomes, is restored without retaining a transient drag preview

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

### Requirement: Migrate supported legacy campaigns without deletion
Supported version-1 campaigns SHALL migrate to the current attribute, item, and equipment-occupancy schema without silently deleting the original saved data. Existing realm, position, entities, Time, XP, and supported items SHALL be retained. A migration failure SHALL mark the Saved Game invalid while leaving its original stored content intact.

#### Scenario: Resume a legacy campaign
- **WHEN** a valid previous campaign is selected
- **THEN** its old equipment and progression are mapped into the current model and the resulting game can be saved and resumed

#### Scenario: Preserve a failed migration
- **WHEN** a legacy campaign cannot be migrated
- **THEN** its data remains stored and the menu clearly marks it as unavailable to resume
