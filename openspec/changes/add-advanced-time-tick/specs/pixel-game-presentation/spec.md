# Spec Delta

## MODIFIED Requirements

### Requirement: Provide mobile eight-way movement
Portrait SHALL render cardinal movement buttons, ability buttons 1–3, Sneak, Quick 1, Quick 2, and Wait in the lower content area. The statusbar SHALL provide Control and Info buttons. Control SHALL be selected by default and show the mobile controls; Info SHALL show the information panels in the bottom area. These controls SHALL use the same game action rules as keyboard input. The previous eight-way controller, diagonal buttons, and Brace button SHALL be removed. Z and C SHALL not have mobile buttons.

#### Scenario: Move with virtual controller
- **WHEN** the player presses a cardinal arrow
- **THEN** one corresponding movement request is sent

#### Scenario: Activate a mobile ability
- **WHEN** the player presses an available numbered ability button
- **THEN** the ability currently assigned to that position is requested

#### Scenario: Use a mobile quick slot
- **WHEN** the player presses Quick 1 or Quick 2
- **THEN** the corresponding quick-slot use action is requested

#### Scenario: Wait with the mobile controls
- **WHEN** the player presses Wait
- **THEN** the game requests one wait action without moving the player
