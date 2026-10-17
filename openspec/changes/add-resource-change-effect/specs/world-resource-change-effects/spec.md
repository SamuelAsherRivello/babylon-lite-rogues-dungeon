# Spec Delta

## Purpose

Provide a brief world-view pulse for player Health and Mana changes without obscuring the dungeon or HUD.

## ADDED Requirements

### Requirement: Pulse committed player Health changes
The game SHALL show one rectangular pulse in the playable world view when a committed player Health change changes its current value. Health loss SHALL be red and Health gain SHALL be green.

#### Scenario: Player loses Health
- **WHEN** a committed resource event lowers player Health
- **THEN** the playable world view shows one red rectangular pulse

#### Scenario: Player gains Health
- **WHEN** a committed resource event raises player Health
- **THEN** the playable world view shows one green rectangular pulse

### Requirement: Pulse committed player Mana changes
The game SHALL show one purple rectangular pulse in the playable world view when a committed player Mana change changes its current value, regardless of whether Mana rises or falls.

#### Scenario: Player spends Mana
- **WHEN** a committed resource event lowers player Mana
- **THEN** the playable world view shows one purple rectangular pulse

#### Scenario: Player gains Mana
- **WHEN** a committed resource event raises player Mana
- **THEN** the playable world view shows one purple rectangular pulse

### Requirement: Keep the pulse transient and isolated
Each pulse SHALL expand once from its initial rectangle to its larger rectangle while fading out over 200 to 500 milliseconds. It SHALL not cover the HUD or minimap, intercept input, advance game time, or persist after its animation completes.

#### Scenario: Pulse finishes
- **WHEN** a resource pulse reaches the end of its animation
- **THEN** it is no longer visible and gameplay state is unchanged

### Requirement: Remove the permanent green tint
The playable world view SHALL NOT retain a permanent green-tint compositing layer.

#### Scenario: No resource change is pending
- **WHEN** the player has no active resource pulse
- **THEN** the playable world view renders without a permanent green tint
