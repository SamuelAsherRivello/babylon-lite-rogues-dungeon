# Spec Delta

## Purpose

Defines compact, deterministic level persistence so only player-caused changes are saved between sessions.

## ADDED Requirements

### Requirement: Reconstruct a generated level from its run identity
Each generated level SHALL have an identity comprising the installation world seed, Saved Game number, run number, Dungeon Level, and generator version. Rebuilding a level from the same identity SHALL produce the same base terrain, static entities, and generated object layout.

#### Scenario: Rebuild an unchanged level
- **WHEN** a level is generated twice from the same run identity
- **THEN** both base levels have matching terrain, static entities, object-set layout, and generated stable IDs

### Requirement: Persist compact level changes
The persisted state for a newly generated level SHALL contain only the run identity and player-caused deltas, rather than a serialized base terrain grid or unchanged generated entities. It SHALL retain time, removals, mutable-object changes, changed living actors, and uncollected dynamically spawned items.

#### Scenario: Save an untouched generated level
- **WHEN** a generated level has no player-caused world changes
- **THEN** its persisted data contains no serialized base terrain grid or unchanged generated entities

#### Scenario: Restore changed level state
- **WHEN** a player resumes a level with saved object, actor, item, and removal deltas
- **THEN** the reconstructed level applies those deltas to its deterministic base before play continues

### Requirement: Give mutable generated content stable identities
Every generated object, pickup, living actor, and linked puzzle member whose state can change SHALL have an ID that remains stable when its level identity is regenerated. Persisted references SHALL use those IDs instead of transient array positions.

#### Scenario: Match a stored object delta
- **WHEN** a level is regenerated and contains a saved change for a generated chest
- **THEN** the change is applied to the chest with the matching stable ID

### Requirement: Preserve generated and spawned pickup outcomes
The save SHALL record removal of a collected generated pickup or defeated generated actor until the run ends. When opening a mutable object creates an item, the save SHALL retain that spawned item while it remains uncollected and remove its record after collection, while retaining the object's opened state.

#### Scenario: Resume an opened chest with an uncollected drop
- **WHEN** a player saves after opening a chest and before collecting its generated drop
- **THEN** the resumed level shows the chest as opened and the same drop at its saved location

#### Scenario: Resume after collecting a generated pickup
- **WHEN** a player collects a generated pickup and saves
- **THEN** the resumed level does not recreate that pickup
