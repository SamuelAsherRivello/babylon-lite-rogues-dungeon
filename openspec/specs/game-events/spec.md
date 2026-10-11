# game-events Specification

## Purpose
Provide relevant structured events from major game systems so the Log and other subscribers can react independently without coupling domain behavior to displayed message text.

## Requirements

### Requirement: Publish structured events from major systems
Movement/time, combat, resources, pickups/Inventory, equipment, abilities, progression, realm/death, objectives/counters, and saves SHALL emit relevant events describing their accepted results or failures. Events SHALL carry structured facts, stable type, ordering identity, and associated game time rather than preformatted log sentences. Domain publishers SHALL not decide which events appear in Log.

#### Scenario: Equipment emits facts
- **WHEN** a sword is enabled by a committed drag
- **THEN** the equipment system emits an event identifying the item, source, destination, and attribute changes without constructing an equipped log sentence

#### Scenario: Potion emits resource change
- **WHEN** a Mana Potion is consumed
- **THEN** relevant pickup and resource events identify the item, resource, previous value, new value, and cause

### Requirement: Log subscribes across major systems
The Log system SHALL listen to relevant domain events from all major game systems and centrally decide which become entries and how their raw facts become readable text. Systems SHALL remain functional if a Log event is ignored or the Log display is hidden. Direct domain-to-HUD message rendering SHALL be removed.

#### Scenario: Event becomes Log entry
- **WHEN** an enabled Log rule receives an item-collected event
- **THEN** it creates the configured text entry using that event's facts

#### Scenario: Hide Log on mobile
- **WHEN** the portrait lower area is initially scrolled to its visible controls and Log is below the fold
- **THEN** the Log system continues processing selected events for later Info display

### Requirement: Preserve events when logging is disabled
Developer requests to stop logging a behavior SHALL change the Log filter or formatting policy while preserving relevant source-event emission and other listeners. Insufficient-Mana actions SHALL continue to show no user message even if the system exposes a rejection event.

#### Scenario: Stop logging movement
- **WHEN** a developer disables movement Log entries
- **THEN** movement events continue reaching other listeners and game time still advances normally

### Requirement: Extend source events before adding new Log coverage
If desired Log coverage lacks a suitable domain event or facts, the responsible system SHALL add or extend that event before the Log policy is updated. Existing suitable events SHALL be reused. Gameplay systems SHALL not add ad hoc log-only callbacks or formatted message fields for new coverage.

#### Scenario: Add logging of a new outcome
- **WHEN** a developer asks for a resource-cap change to be logged and current events lack the before/after maximum
- **THEN** the resource event gains those facts and the Log policy handles that event

### Requirement: Preserve event order without duplicate side effects
Events SHALL follow committed action order, with rejected or canceled actions explicitly distinguished from commits. Re-rendering, resizing, refreshing a view, or processing an existing event SHALL not reapply gameplay or append duplicate Log entries. Raw event emission SHALL be independent of the rendered Log and of save feedback.

#### Scenario: Commit one attack
- **WHEN** one accepted attack emits combat, resource, progression, and time results
- **THEN** listeners receive them in deterministic action order and Log projects each selected event at most once

#### Scenario: Save fails while Log records the failure
- **WHEN** saving emits a failure event and Log creates an entry
- **THEN** this does not recursively trigger another gameplay action or an endless save-failure loop

### Requirement: Publish Quick Slot events
Quick Slot transfers, successful consumable uses, and rejected uses SHALL publish structured events with the item identity, quantity or resource facts, source/destination where applicable, outcome, and game time. Full-resource rejections SHALL be available to Log without requiring domain systems to format user-facing text.

#### Scenario: Record a Quick Slot transfer
- **WHEN** a potion is committed from Inventory to Quick Slot 01
- **THEN** an event identifies the potion, source, destination, resulting quantity, and committed time

#### Scenario: Record a full-resource rejection
- **WHEN** a Health Potion is used while Health is full
- **THEN** a rejected event identifies the resource, current and maximum values, item, and rejection reason
