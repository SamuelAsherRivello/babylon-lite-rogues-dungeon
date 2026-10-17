# Spec Delta

## MODIFIED Requirements

### Requirement: Present each resolved tactical turn within one second
The game SHALL use a one-second window to start visible enemy movement after each accepted action that advances time, without delaying logical turn resolution or later input. A moved player, enemy, or future NPC SHALL travel from its displayed position to its committed grid destination over 250 milliseconds using a fast-start, slow-arrival easing curve. A movement that starts within the window MAY finish after it.

#### Scenario: Player advances a turn
- **WHEN** an accepted action advances tactical time and changes the player position
- **THEN** the game immediately commits the full logical result and starts the player's 250 millisecond positional movement without delaying later input

#### Scenario: No visible enemy moves
- **WHEN** a resolved turn changes no visible enemy position
- **THEN** the game does not reserve or display a one-second delay before later input

### Requirement: Stage visible enemy movement in playback order
The game SHALL present only visible enemies that changed cells during a resolved turn one at a time in ascending playback order. For N visible moved enemies, their starts SHALL occur at zero and each following multiple of 1000 divided by N milliseconds. Once an enemy's assigned start arrives, its position SHALL tween for 250 milliseconds to its committed destination rather than snap.

#### Scenario: Several visible enemies move
- **WHEN** several visible eligible enemies move during one resolved turn
- **THEN** each enemy starts in ascending playback order at its equal interval in the one-second start window and travels for 250 milliseconds after its assigned start time

#### Scenario: Ten visible enemies move
- **WHEN** ten visible eligible enemies move during one resolved turn
- **THEN** their movement starts occur at 0, 100, 200, 300, 400, 500, 600, 700, 800, and 900 milliseconds

#### Scenario: Enemy becomes visible
- **WHEN** an enemy first appears in the game view
- **THEN** the game assigns it the next playback rank for its remaining lifetime on that floor

#### Scenario: Enemy leaves and returns to view
- **WHEN** an enemy with a playback rank leaves the game view and later becomes visible again
- **THEN** it is excluded while offscreen and resumes its prior playback rank when visible

## ADDED Requirements

### Requirement: Retarget presentation during later actions
The game SHALL accept later actions while character movement is active. When a later accepted action changes a character's committed destination, the renderer SHALL begin a new 250 millisecond movement from that character's current displayed position to its newest destination.

#### Scenario: Player acts during character travel
- **WHEN** the player submits an accepted action before the player's or an enemy's current movement tween ends
- **THEN** the action resolves immediately and every affected character moves from its current displayed position toward its latest committed destination

#### Scenario: Rejected action during character travel
- **WHEN** a player action is rejected while character movement is active
- **THEN** the active movement continues unchanged

## REMOVED Requirements

### Requirement: Catch up presentation before a later action
**Reason**: Accepted later actions now retarget active character travel from its displayed position instead of flushing it.
**Migration**: Use the retargeted presentation behavior for later accepted actions.
