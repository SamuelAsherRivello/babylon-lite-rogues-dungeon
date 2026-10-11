# Spec Delta

## Purpose

This capability provides deterministic, named map fixtures that isolate tile-rendering edge cases and make repaired Tiled output reproducible for future regression testing.

## ADDED Requirements

### Requirement: Select a deterministic debug scenario by URL

The game SHALL accept a named debug scenario URL option that selects a deterministic manual-generation topology without changing ordinary random-seed generation when the option is absent.

#### Scenario: Open a named scenario
- **WHEN** a valid scenario name is supplied with the tile-rendering debug flag
- **THEN** the game loads the same rooms, corridors, walkability, entities, and seed metadata on every reload

#### Scenario: Omit the scenario option
- **WHEN** the tile-rendering debug flag or scenario name is absent
- **THEN** normal seeded generation and save-slot behavior remain active

### Requirement: Exercise targeted tile edge cases

Each named scenario SHALL identify the room, corridor, corner, width, or walkability boundary case it is intended to test and SHALL remain playable from its start marker to its exit marker.

#### Scenario: Test a corridor join
- **WHEN** the corridor-join scenario is loaded
- **THEN** it contains a walkable corridor connected to rooms with rendered wall boundaries on both sides and at each room junction

#### Scenario: Test multiple corridor widths
- **WHEN** a width scenario is loaded
- **THEN** it contains at least two supported corridor widths and preserves a continuous walkable path through each width transition

### Requirement: Export an editable scenario map

The game SHALL export a selected debug scenario using the same Grounds, Walls, Pickups, and Decorations layer contract as ordinary editable maps.

#### Scenario: Open editable scenario copy
- **WHEN** the user requests an editable copy for a selected scenario
- **THEN** the generated map includes deterministic metadata, tile layers, object markers, and asset-relative paths suitable for opening in Tiled

### Requirement: Preserve a repaired scenario as regression evidence

The repair workflow SHALL associate one edited Tiled result with its named scenario and SHALL make the resulting tile-layer differences available to automated regression checks.

#### Scenario: Load one repaired scenario
- **WHEN** a valid repaired map for a named scenario is loaded
- **THEN** the game uses its authored Grounds and Walls tiles and retains the scenario identity for comparison
