# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, run identity, level-state deltas, player position, time, attributes/resources, XP, Inventory, equipment, ability bindings, objectives, counters, and Log. Restored generated levels SHALL be rebuilt from run identity and deltas without storing their unchanged base terrain or entities. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level and Difficulty, is restored without retaining a transient drag preview

#### Scenario: Resume a changed generated level
- **WHEN** an occupied Saved Game is resumed with saved level-state deltas
- **THEN** the generated level is reconstructed with the same player-caused object, actor, pickup, and removal changes

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

### Requirement: Restore application view preferences
Zoom, Camera, desired Fullscreen, and the Url Args developer setting SHALL be stored in localStorage and restored on load/refresh independently of the selected Saved Game. Url Args SHALL default to off. Invalid or unavailable preferences SHALL use defaults 1, Center, windowed, and Url Args off while keeping play usable. Developer aspect preview SHALL not be persisted as a player preference.

#### Scenario: Reload selected view preferences
- **WHEN** Zoom 2 and Camera Screen were stored before refresh
- **THEN** the app restores those settings without requiring a campaign save

#### Scenario: Show deterministic URL arguments
- **WHEN** Url Args is enabled during an active deterministic run
- **THEN** the current URL includes world, level, slot, run, and seed arguments for that run

#### Scenario: Keep ordinary player URLs clean
- **WHEN** Url Args is disabled
- **THEN** the current URL omits world, level, slot, run, and seed arguments while preserving unrelated supported URL arguments

#### Scenario: Invalid preference record
- **WHEN** preference data is missing, malformed, or out of range
- **THEN** supported defaults are used without preventing a new or resumed game

### Requirement: Migrate supported legacy campaigns without deletion
Supported legacy campaigns SHALL preserve supported persistent progression while replacing their active run with a new deterministic Level 1. The migration SHALL retain an original backup before replacing the primary record. Legacy realm, position, entities, Time, Inventory, equipment, and full-floor snapshots SHALL not remain playable. A migration failure SHALL mark the Saved Game invalid while leaving its original stored content intact.

#### Scenario: Resume a legacy campaign
- **WHEN** a valid previous campaign is selected
- **THEN** it starts a new deterministic Level 1 with its supported persistent progression and no legacy run state

#### Scenario: Preserve the legacy backup
- **WHEN** a valid previous campaign is reset into a deterministic run
- **THEN** the game retains its original serialized data as a migration backup before replacing the primary Saved Game

#### Scenario: Preserve a failed migration
- **WHEN** a legacy campaign cannot be migrated
- **THEN** its data remains stored and the menu clearly marks it as unavailable to resume

## ADDED Requirements

### Requirement: Launch complete deterministic URLs without saving
When world, level, slot, run, and seed URL arguments are all valid and present, the game SHALL start the requested deterministic run without reading or writing the matching Saved Game. It SHALL keep unrelated supported URL arguments active.

#### Scenario: Start a deterministic test run
- **WHEN** the game opens with complete valid run identity URL arguments
- **THEN** it starts the requested world, level, slot, run, and seed identity without replacing local Saved Game data
