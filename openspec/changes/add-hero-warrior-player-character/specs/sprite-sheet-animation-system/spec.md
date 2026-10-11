# Spec Delta

## Purpose

Provide a reusable playback capability for any image-based sprite animation, including character actors and non-character effects, without coupling animation control to one specific asset or gameplay role.

## ADDED Requirements

### Requirement: Create an animation entity from image frames
The system SHALL create an animation entity from either a grid-based sprite sheet descriptor or an ordered list of individual image frames, with declared frame size and playback timing.

#### Scenario: Create from a sprite sheet
- **WHEN** a valid sheet source and grid dimensions are provided
- **THEN** the entity exposes the declared animation frames in grid order

#### Scenario: Create from individual images
- **WHEN** a valid ordered image-frame list is provided
- **THEN** the entity exposes those images in the supplied order as one animation sequence

#### Scenario: Invalid source is provided
- **WHEN** a source is missing, empty, or has inconsistent frame metadata
- **THEN** entity creation reports a validation error and does not silently discard frames

### Requirement: List animations on an entity
An animation entity SHALL list its registered animation names and expose each animation's frame count, timing, and loop configuration.

#### Scenario: List a multi-animation entity
- **WHEN** an entity contains Idle, Run, and Attack animations
- **THEN** listing returns all three names with their independent metadata

### Requirement: Control playback
An animation entity SHALL support selecting an animation, starting playback, stopping playback, and reporting its current animation, frame, and playing state.

#### Scenario: Start and stop playback
- **WHEN** a caller selects an animation and starts then stops it
- **THEN** the entity reports the selected animation, stops advancing frames, and preserves a deterministic stopped frame

#### Scenario: Select an unknown animation
- **WHEN** playback is requested for a name that is not registered
- **THEN** the request fails with a clear validation result and leaves the current playback state unchanged

### Requirement: Apply finite and infinite loop counts
The system SHALL interpret `loopCount` as additional repeats: `-1` repeats forever, `0` plays once, and each positive integer repeats the animation that many additional times before completion.

#### Scenario: One-shot animation
- **WHEN** an animation has `loopCount: 0`
- **THEN** it plays one complete sequence, stops, and reports completion

#### Scenario: Finite repeated animation
- **WHEN** an animation has `loopCount: 2`
- **THEN** it plays three complete sequences total and then stops at completion

#### Scenario: Infinite animation
- **WHEN** an animation has `loopCount: -1`
- **THEN** it continues cycling until explicitly stopped or replaced

### Requirement: Preserve logical actor ownership
Animation playback SHALL update visual frame state without changing the owning actor's logical position, collision, or lifecycle ownership.

#### Scenario: Animate an oversized character
- **WHEN** a character animation frame is larger than one world cell
- **THEN** only the visual frame changes while the actor retains its existing logical coordinate and disposal responsibility
