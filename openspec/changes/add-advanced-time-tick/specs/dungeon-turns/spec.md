# Spec Delta

## MODIFIED Requirements

### Requirement: Advance one tactical turn per accepted grid action
A legal player step, actionable bump interaction, or explicit wait action SHALL advance time by exactly one turn, and enemies SHALL act once during that turn. A mouse-selected destination with no legal cardinal route SHALL be rejected without moving the player, advancing time, or causing an enemy action.

#### Scenario: Walk into traversable space
- **WHEN** the player makes one accepted grid move
- **THEN** the player moves one cell and the displayed time increases by one

#### Scenario: Bump an enemy
- **WHEN** the player bumps an adjacent enemy
- **THEN** one attack action resolves and time advances once

#### Scenario: Wait in place
- **WHEN** the player presses X or the mobile Wait button outside editable controls, Settings, and a level-up choice
- **THEN** the player stays in place, displayed time increases by one, and the normal enemy phase resolves once

#### Scenario: Blocked terrain
- **WHEN** the player attempts to move into an impassable cell with no actionable target
- **THEN** the player stays in place and time does not advance

#### Scenario: Commit equipment or ability assignment
- **WHEN** a valid equipment drag or ability reorder is committed
- **THEN** its change is applied before one time increment and one enemy phase

#### Scenario: Settings remains open
- **WHEN** no gameplay action is accepted while Settings is open
- **THEN** world Time and enemies remain unchanged through the ordinary action-driven time rule

#### Scenario: Unreachable mouse destination
- **WHEN** the player selects a mouse destination with no legal cardinal path
- **THEN** the player stays in place and time does not advance
- **AND** enemies do not act
