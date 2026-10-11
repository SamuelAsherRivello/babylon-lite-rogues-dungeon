# Spec Delta

## Purpose

Provide a complete, testable Hero Warrior animation capability for the player so supplied directional and action frames are available without changing the game's grid-based movement contract.

## ADDED Requirements

### Requirement: Use the reusable animation system
The Hero Warrior catalog SHALL register its sprite-sheet and individual-frame sources through the reusable animation system rather than defining a Hero-only playback contract.

#### Scenario: Hero catalog is registered
- **WHEN** the Hero Warrior assets are initialized
- **THEN** their animation names and frame sequences are available through the generic entity listing and playback controls

### Requirement: Preserve the supplied animation inventory
The character capability SHALL expose `Attack`, `Death`, `Idle`, and `Run` as distinct animations, preserving every usable supplied frame and directional variant.

#### Scenario: Inventory is loaded
- **WHEN** the character catalog is initialized
- **THEN** it contains `Idle`, `Run`, and `Attack` variants for Down, Side, and Up, plus the six-frame `Death` sequence

#### Scenario: Missing or malformed frame is referenced
- **WHEN** a catalog entry cannot load or fails its declared dimensions
- **THEN** the catalog validation reports the animation and frame path instead of silently substituting or dropping it

### Requirement: Select a stable initial idle presentation
The player SHALL begin rendering with the Hero Warrior `Idle` animation and a deterministic default direction, while remaining at the same player world-cell coordinate.

#### Scenario: Initial player render
- **WHEN** a new game view is rendered
- **THEN** an idle Hero Warrior frame is visible at the player coordinate with the default direction and no change to player state coordinates

### Requirement: Anchor oversized frames to the player cell
The character SHALL anchor the bottom of each rendered frame to the bottom of the player's 32x32 grid cell, allowing the 32x48 or 48x48 artwork to extend above the cell without shifting collision or logical position.

#### Scenario: Tall frame is rendered
- **WHEN** a Hero Warrior frame taller than one grid cell is displayed
- **THEN** its feet remain aligned with the bottom edge of the player's cell and its upper pixels may extend into cells above

### Requirement: Keep all animations reachable through the actor boundary
The runtime SHALL provide a tested animation-selection seam for every catalog animation, including action animations that current gameplay does not yet trigger; untriggered animations SHALL remain documented as deferred rather than discarded.

#### Scenario: Animation selection is requested
- **WHEN** a valid animation and direction are selected
- **THEN** the renderer resolves the corresponding frame sequence with its declared loop or completion behavior

#### Scenario: Current gameplay has no trigger
- **WHEN** no existing player event requests `Death` or `Attack`
- **THEN** those animations remain available through the catalog/selection seam and the missing gameplay trigger is reported as an intentional deferred integration
