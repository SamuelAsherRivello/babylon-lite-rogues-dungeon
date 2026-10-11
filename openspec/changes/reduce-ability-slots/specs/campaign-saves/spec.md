# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave and resume complete runs
The selected Saved Game SHALL autosave after each accepted time tick and restore its complete campaign after reload, including Dungeon Level, persistent Difficulty, realm/map, entities, player position, time, attributes/resources, XP, Inventory, equipment, three ability bindings, objectives, counters, and Log. Save & Return to Main Menu SHALL persist the latest committed state before returning.

#### Scenario: Resume after reload
- **WHEN** the player reloads and chooses an occupied Saved Game
- **THEN** the same complete committed game state, including Dungeon Level and Difficulty, is restored without retaining a transient drag preview

#### Scenario: Save after a turn
- **WHEN** a move, attack, ability, or slot drag advances time
- **THEN** the resulting state is saved after its enemy phase

### Requirement: Handle unavailable local storage
If localStorage cannot be read or written, the game SHALL present a clear save error and SHALL keep the current campaign playable for the current page session.

#### Scenario: Storage write fails
- **WHEN** the browser rejects a save write
- **THEN** the player sees that progress could not be saved and can continue the active session

### Requirement: Restore application view preferences
Zoom, Camera, and desired Fullscreen SHALL be stored in localStorage and restored on load/refresh independently of the selected Saved Game. Invalid or unavailable preferences SHALL use defaults 1, Center, and windowed while keeping play usable. Developer aspect preview SHALL not be persisted as a player preference.

#### Scenario: Reload selected view preferences
- **WHEN** Zoom 2 and Camera Screen were stored before refresh
- **THEN** the app restores those settings without requiring a campaign save

#### Scenario: Invalid preference record
- **WHEN** preference data is missing, malformed, or out of range
- **THEN** supported defaults are used without preventing a new or resumed game

### Requirement: Restore fullscreen intent through browser permissions
The app SHALL distinguish stored fullscreen preference from actual browser fullscreen. A stored enabled preference SHALL request entry when a permitted user gesture is available after load. Fullscreen events, user exits, and failures SHALL synchronize the actual control state without falsely reporting entry or interrupting play.

#### Scenario: Browser blocks automatic entry after refresh
- **WHEN** fullscreen preference is enabled but the browser requires a gesture
- **THEN** the preference is retained, the control reflects windowed reality, and entry is requested on the next permitted interaction

#### Scenario: Exit with browser controls
- **WHEN** the player exits fullscreen through browser controls
- **THEN** actual state and stored preference update to windowed

### Requirement: Migrate supported legacy campaigns without deletion
Supported version-1 campaigns SHALL migrate to the new attribute and item schema without silently deleting the original saved data. Existing realm, position, entities, Time, XP, supported items, and ability bindings in positions 01–03 SHALL be retained. Any ability in legacy position 04 SHALL be discarded during normalization. A migration failure SHALL mark the Saved Game invalid while leaving its original stored content intact.

#### Scenario: Resume a legacy campaign
- **WHEN** a valid previous campaign is selected
- **THEN** its old equipment, progression, and first three ability bindings are mapped into the new model and the resulting game can be saved and resumed

#### Scenario: Discard the removed legacy binding
- **WHEN** a valid saved campaign contains an ability in position 04
- **THEN** the campaign loads with positions 01–03 preserved and position 04 absent, without being marked invalid

#### Scenario: Preserve a failed migration
- **WHEN** a legacy campaign cannot be migrated
- **THEN** its data remains stored and the menu clearly marks it as unavailable to resume

### Requirement: Expand undersized saved floors safely
When an otherwise valid saved campaign contains a generated floor smaller than 100 by 100 tiles, the game SHALL expand it into a centered 100 by 100 tile floor before play resumes. The migration SHALL preserve the active floor's terrain, player, entities, time, and progression by applying the same coordinate offset to every retained world position.

#### Scenario: Resume a legacy 40 by 20 floor
- **WHEN** the player loads a valid campaign whose active floor is 40 by 20 tiles
- **THEN** the game resumes it on a 100 by 100 tile floor with the original terrain, player, and entities centered together
- **AND** their relative positions, time, and progression are unchanged

#### Scenario: Resume an already expanded floor
- **WHEN** the player loads a valid campaign whose active floor is already 100 by 100 tiles
- **THEN** the game preserves its map dimensions and world coordinates without applying another offset
