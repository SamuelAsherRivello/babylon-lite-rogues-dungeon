# Spec Delta

## MODIFIED Requirements

### Requirement: Present each resolved tactical turn within one second
The game SHALL use a one-second window to start visible enemy movement after each accepted action that advances time, without delaying logical turn resolution or later input. A moved player, enemy, pushable barrel, or future NPC SHALL travel from its displayed position to its committed grid destination over 250 milliseconds using a fast-start, slow-arrival easing curve. A movement that starts within the window MAY finish after it. Only world objects whose grid coordinates change during an accepted turn belong to this sub-grid movement set; floor triggers and doors remain in place and redraw their state.

#### Scenario: Player advances a turn
- **WHEN** an accepted action advances tactical time and changes the player position
- **THEN** the game immediately commits the full logical result and starts the player's 250 millisecond positional movement without delaying later input

#### Scenario: Push a barrel
- **WHEN** an accepted cardinal move pushes a barrel into its next grid cell
- **THEN** the player and that barrel each start a 250 millisecond positional movement from their displayed position to their committed destinations

#### Scenario: No visible enemy moves
- **WHEN** a resolved turn changes no visible enemy position
- **THEN** the game does not reserve or display a one-second delay before later input
