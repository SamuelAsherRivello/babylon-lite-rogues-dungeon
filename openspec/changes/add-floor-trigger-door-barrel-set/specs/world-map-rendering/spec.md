# Spec Delta

## MODIFIED Requirements

### Requirement: Keep world views geometrically consistent
The game view and minimap SHALL derive terrain, walls, object coordinates, actor coordinates, and linked puzzle-object states from the same active realm. They SHALL use identical traversal and placement rules with arguments controlling view bounds, scale, detail, layers, and markers. During playback, the minimap SHALL match staged coordinates for actors visible in the game view. The minimap SHALL provide a simplified low-resolution representation of the realm rather than unrelated artwork.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** walls, player, and exit occupy matching map coordinates despite different scale and detail

#### Scenario: Show a linked puzzle set
- **WHEN** both views render a Floor Trigger Door Barrel Set
- **THEN** the barrel, floor trigger, and door occupy matching map coordinates in both views
- **AND** each view distinguishes active from inactive trigger and open from closed door states

#### Scenario: Update puzzle feedback after a push
- **WHEN** a barrel is pushed onto or off its linked trigger
- **THEN** the game view and minimap both update the barrel position, trigger state, and door state from the same resolved world state

#### Scenario: Stage enemy movement
- **WHEN** a resolved turn is presenting a visible enemy movement
- **THEN** the game view and minimap show that enemy at the same staged coordinate, before or after the instantaneous snap, with no interpolated coordinate

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale terrain or actors
