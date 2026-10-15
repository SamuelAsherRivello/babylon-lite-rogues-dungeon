# Spec Delta

## Purpose

Defines independent, persistent quest progress that reacts to game events and exposes an active objective for future game guidance.

## ADDED Requirements

### Requirement: Maintain one current campaign quest
Each campaign SHALL have exactly one current quest, with a title, ordered items, completion state for each item, and at most one active unfinished item. Other game systems SHALL NOT contain quest-specific completion behavior.

#### Scenario: Start a new Saved Game
- **WHEN** a player begins a new Saved Game
- **THEN** its current quest is My First Quest with its three items unfinished and Walk through the stairs active

#### Scenario: Retain a completed quest
- **WHEN** all current quest items are complete
- **THEN** the campaign retains that completed quest and has no active quest item or replacement quest

### Requirement: Complete quest items from structured game events
The quest capability SHALL observe structured domain events and update only items whose predicates match the event. It SHALL treat realm entry as stair completion, a collected Health Potion as potion completion, and collected gold as coin completion.

#### Scenario: Complete items in a different order
- **WHEN** the player collects gold before using stairs or collecting a Health Potion
- **THEN** only Collect a coin becomes complete and the active unfinished item remains unchanged

#### Scenario: Ignore an unrelated event
- **WHEN** the quest capability receives a movement, combat, key-collection, or rejected collection event
- **THEN** it leaves every quest item unchanged

### Requirement: Select the active unfinished item deterministically
All unfinished items SHALL be available concurrently. Completing a non-active item SHALL retain the active item; completing the active item SHALL activate the earliest remaining unfinished item in quest order.

#### Scenario: Advance after active completion
- **WHEN** Walk through the stairs is active and the player enters a realm
- **THEN** Collect a Health Potion becomes active unless it was already complete

#### Scenario: Finish the quest
- **WHEN** the final unfinished item completes
- **THEN** the quest has no active item

### Requirement: Provide public quest state
The quest capability SHALL provide a read-only public query for the current quest and its active item so future systems can use it without inspecting UI state.

#### Scenario: Query completed quest state
- **WHEN** another game system queries a fully completed My First Quest
- **THEN** it receives the quest title and completed items with no active item
