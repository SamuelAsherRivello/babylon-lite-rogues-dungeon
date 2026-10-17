# Spec Delta

## ADDED Requirements

### Requirement: Place campfire world menus away from protected grid spots
The Campfire rest menu SHALL be rendered as an in-world React popup and use the visible game-world frame, the campfire grid spot, and the player grid spot to find a complete placement that remains inside the frame without overlapping either protected spot.

#### Scenario: Open a campfire menu where placement is available
- **WHEN** the player bumps a campfire and at least one popup placement fits the game-world frame without covering the campfire or player grid spot
- **THEN** the Campfire menu is shown at a valid position

#### Scenario: Reframe a visible campfire menu
- **WHEN** camera, zoom, or game-world frame geometry changes while the Campfire menu is visible
- **THEN** its placement is recalculated from the updated grid geometry

#### Scenario: No available placement for a campfire menu
- **WHEN** no Campfire menu placement fits within the game-world frame while avoiding the campfire and player grid spots
- **THEN** the Campfire menu is hidden
