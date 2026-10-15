# Spec Delta

## Purpose

Make each resolved tactical turn readable by presenting enemy reactions over a fixed, interruptible time window.

## ADDED Requirements

### Requirement: Present each resolved tactical turn within one second
The game SHALL use at most one second to present visible enemy movement after each accepted action that advances time, without delaying logical turn resolution or later input.

#### Scenario: Player advances a turn
- **WHEN** an accepted action advances tactical time
- **THEN** the game immediately commits the full logical result and starts a presentation interval of no more than one second for that turn

#### Scenario: No visible enemy moves
- **WHEN** a resolved turn changes no visible enemy position
- **THEN** the game does not reserve or display a one-second delay before later input

### Requirement: Stage visible enemy movement in playback order
The game SHALL present only visible enemies that changed cells during a resolved turn one at a time in ascending playback order, dividing the available one-second budget equally among those movements. Each movement SHALL be an instantaneous change from its source cell to its destination cell at the beginning of its assigned time slice; the interval between moves SHALL be a delay, not a positional tween.

#### Scenario: Several visible enemies move
- **WHEN** several visible eligible enemies move during one resolved turn
- **THEN** the first enemy snaps immediately, and every later enemy snaps at the start of its equal assigned slice across the one-second budget rather than tweening from source to destination

#### Scenario: Enemy becomes visible
- **WHEN** an enemy first appears in the game view
- **THEN** the game assigns it the next playback rank for its remaining lifetime on that floor

#### Scenario: Enemy leaves and returns to view
- **WHEN** an enemy with a playback rank leaves the game view and later becomes visible again
- **THEN** it is excluded while offscreen and resumes its prior playback rank when visible

### Requirement: Catch up presentation before a later action
The game SHALL complete all pending staged enemy movements immediately before presenting the result of a newly accepted time-advancing action.

#### Scenario: Player acts during enemy playback
- **WHEN** the player submits another accepted action before the current playback window ends
- **THEN** all prior staged enemy positions snap to their already resolved destinations and a new one-second window starts for the newly resolved turn

#### Scenario: Rejected action during enemy playback
- **WHEN** a player action is rejected while enemy playback is active
- **THEN** the pending playback continues unchanged
