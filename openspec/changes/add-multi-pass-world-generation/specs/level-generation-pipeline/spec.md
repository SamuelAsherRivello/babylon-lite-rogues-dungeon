# Spec Delta

## Purpose

Provides a deterministic, extensible level-generation contract in which each active level owns a grid and is produced by ordered passes that can be composed without coupling gameplay rules to a particular terrain algorithm.

## ADDED Requirements

### Requirement: Represent an active level as a sized grid
The active level SHALL expose its grid width and height, semantic cell state, generation seed, generator identity, and world/realm/level identity to downstream gameplay and rendering systems.

#### Scenario: Inspect a generated level
- **WHEN** a level is generated
- **THEN** its dimensions, seed, generator identity, semantic cells, start location, and exit location are available without inspecting generator internals

### Requirement: Execute deterministic ordered passes
The level generator SHALL execute its declared passes in order, using the level seed and pass parameters so that identical inputs produce identical level geometry and placements.

#### Scenario: Regenerate a seeded level
- **WHEN** the same world, realm, level, seed, dimensions, and pass parameters are generated twice
- **THEN** both results have identical semantic cell state, start and exit locations, and generated entity placements

### Requirement: Scope pass writes
Each pass SHALL declare or derive the cells it is allowed to modify, and SHALL leave cells outside its scope unchanged unless an explicit later pass owns them.

#### Scenario: Apply a local structured pass
- **WHEN** a rectilinear structure pass targets a reserved overworld area
- **THEN** it may modify cells inside that area while preserving unrelated organic terrain elsewhere on the level

### Requirement: Preserve protected gameplay cells
The generation pipeline SHALL protect required cells and markers, including the start, exit, mandatory entrances, and already placed gameplay entities, from destructive later-pass writes.

#### Scenario: A later obstacle pass reaches the start
- **WHEN** an obstacle pass would make the start cell non-walkable
- **THEN** the pass rejects, reroutes, or skips that write and the start remains valid and walkable

### Requirement: Validate generated connectivity
The pipeline SHALL validate required reachability and report a generation failure or repair result when the required start-to-exit route is absent.

#### Scenario: A pass seals the exit route
- **WHEN** the completed level has no walkable path from start to exit
- **THEN** generation does not silently activate the invalid level and exposes a deterministic failure or repair diagnostic

### Requirement: Keep gameplay and presentation semantics separate
Passes SHALL write gameplay-relevant semantic terrain such as walkability and terrain role independently from derived renderer details such as autotile or Wang frame selection.

#### Scenario: Change terrain art
- **WHEN** a renderer tile mapping changes
- **THEN** collision, pathfinding, reachability, and saved semantic cell state remain unchanged
