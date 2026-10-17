# Spec Delta

## Purpose

Defines efficient dungeon-world presentation that avoids repeated static work while retaining correct visible dynamic effects.

## ADDED Requirements

### Requirement: Compile static world presentation outside the frame loop
The renderer SHALL derive immutable terrain, wall, and static-prop tile presentation from a floor's static world data when that data is created or explicitly invalidated, not once per animation frame.

#### Scenario: Present an unchanged floor
- **WHEN** consecutive frames render an unchanged floor
- **THEN** the selected terrain and wall tile presentation remains stable without recompiling its static world data

#### Scenario: Enter a generated floor
- **WHEN** the active floor changes
- **THEN** the renderer compiles and presents that floor's static world data without stale content from the prior floor

### Requirement: Limit presentation work to visible world cells
The game view SHALL present static chunks and dynamic visuals only when they intersect the camera-visible world area, while preserving in-bounds camera framing and world-depth ordering for visible content.

#### Scenario: Move the camera across a large floor
- **WHEN** the camera changes its visible cell area
- **THEN** newly visible content appears at its correct world position and offscreen content is not drawn

### Requirement: Keep landed combat marks independently transient
Each landed combat mark SHALL keep its own fade timeline, remain independently positioned, and be removed ten seconds after it lands.

#### Scenario: Land combat marks at different times
- **WHEN** two combat marks land at different times
- **THEN** each fades and is removed ten seconds after its own landing time without changing the other mark's lifetime
