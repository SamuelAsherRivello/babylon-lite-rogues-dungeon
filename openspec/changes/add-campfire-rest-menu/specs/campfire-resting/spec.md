# Spec Delta

## Purpose

Defines the visual idle behavior and voluntary resting interaction for dungeon campfires.

## ADDED Requirements

### Requirement: Animate the campfire at an idle cadence
Each campfire SHALL render a looping idle animation with at least three frames at the hero idle frame cadence. Its red, orange, and white palette SHALL be visibly less bright than the prior campfire art while remaining readable with nearest-sampled pixel rendering.

#### Scenario: Observe a campfire
- **WHEN** a campfire is visible in the main game view
- **THEN** it cycles continuously through its idle frames without advancing tactical time

#### Scenario: Render a campfire at native zoom
- **WHEN** the player uses Native zoom
- **THEN** the campfire remains crisp and legible in its occupied grid cell

### Requirement: Offer a rest menu after a campfire bump
When the player bumps an adjacent campfire, the game SHALL show an in-world popup menu titled `Campfire`, with the body `You may rest one turn` and a `Rest` button. Opening the menu SHALL NOT advance time.

#### Scenario: Bump an adjacent campfire
- **WHEN** the player attempts a cardinal move into an adjacent campfire
- **THEN** the player remains in place and the Campfire rest menu appears

#### Scenario: Confirm rest
- **WHEN** the player selects `Rest` in the Campfire menu
- **THEN** the player remains in place, one ordinary wait turn resolves, and the menu closes

#### Scenario: Decline by moving away
- **WHEN** the Campfire menu is visible and the player makes a cardinal move in a direction other than the campfire
- **THEN** the menu closes and that move follows its normal acceptance and turn rules
