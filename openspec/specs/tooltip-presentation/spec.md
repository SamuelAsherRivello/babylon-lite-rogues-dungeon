# tooltip-presentation Specification

## Purpose
Defines concise React UI tooltips and larger React-rendered world popups anchored to the dungeon grid. It keeps their triggers separate while requiring each presentation to respect its own placement bounds. A world popup is an in-world panel that appears near an entity or grid location without covering protected areas of interest.

## Requirements

### Requirement: Give the player and each enemy an independent resources model
The player and every enemy SHALL own a separate instance of the same six-row resources data model, with each instance containing that entity's own values.

#### Scenario: Create a new enemy
- **WHEN** an enemy is created for a dungeon floor
- **THEN** it receives its own Health, Stamina, Offense, Defense, Mana, and XP resource values

#### Scenario: Change one entity's resources
- **WHEN** a player's or enemy's resource value changes
- **THEN** only that entity's resource instance changes and other entities retain their values

### Requirement: Render concise tooltips for React UI elements
The application SHALL render a short, wide text tooltip for a React UI element when that element is hovered or receives keyboard focus, and SHALL keep the complete tooltip within the application viewport.

#### Scenario: Hover or focus a UI element
- **WHEN** a tooltip-enabled React UI element is hovered by a pointer or receives keyboard focus
- **THEN** a compact horizontal text tooltip appears for that element and remains fully inside the application viewport

#### Scenario: UI tooltip near a viewport edge
- **WHEN** the default tooltip position would extend beyond an edge of the application viewport
- **THEN** the tooltip is repositioned within the viewport without clipping its text

### Requirement: Show an enemy world popup while its grid spot is hovered
The game SHALL show a React-rendered enemy world popup while the mouse hovers an enemy grid spot, with persistent side-by-side PORTRAIT and RESOURCES sections.

#### Scenario: Hover an enemy
- **WHEN** the mouse targets a grid spot occupied by an enemy
- **THEN** the in-world popup appears with PORTRAIT on the left containing only that enemy's sprite and RESOURCES on the right rendering that enemy's own six resource rows in the same order and visual style as the player's Resources tab

#### Scenario: Leave the enemy grid spot
- **WHEN** the mouse no longer targets an enemy grid spot
- **THEN** the enemy world popup is removed

#### Scenario: Enemy resource values
- **WHEN** the enemy panel displays its RESOURCES section
- **THEN** its six rows read Health, Stamina, Offense, Defense, Mana, and XP from the hovered enemy's own resources instance and do not show the player's values

### Requirement: Keep world popups inside the game-world frame and off protected grid spots
The enemy world popup placement SHALL use the hovered grid spot's center and extents, the player's grid spot and extents, and the visible game-world frame dimensions. The complete popup SHALL fit inside the frame and SHALL NOT overlap either grid spot.

#### Scenario: Find a valid panel position
- **WHEN** at least one placement fits within the game-world frame without overlapping the hovered or player grid spot
- **THEN** the world popup is shown at a valid position

#### Scenario: No valid panel position
- **WHEN** no placement fits within the game-world frame while avoiding both protected grid spots
- **THEN** the world popup is hidden

#### Scenario: World view geometry changes
- **WHEN** the game-world frame resizes or its camera or zoom changes the projected grid spot positions
- **THEN** the world popup placement is recalculated from the updated frame and grid spot geometry
