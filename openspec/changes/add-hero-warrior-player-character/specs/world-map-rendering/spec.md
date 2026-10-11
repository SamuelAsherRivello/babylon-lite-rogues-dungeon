# Spec Delta

## MODIFIED Requirements

### Requirement: Keep world views geometrically consistent
The game view and minimap SHALL derive terrain, walls, object coordinates, and actor coordinates from the same active realm. They SHALL use identical traversal and placement rules with arguments controlling view bounds, scale, detail, layers, and markers. The player marker SHALL use the Hero Warrior actor's logical grid coordinate in both views even when the game view renders an oversized animated frame. The minimap SHALL provide a simplified low-resolution representation of the realm rather than unrelated artwork.

#### Scenario: Show the same player and exit
- **WHEN** both views render the active realm
- **THEN** walls, the Hero Warrior's feet anchor, player logical coordinate, and exit occupy matching map coordinates despite different scale, animation detail, and presentation

#### Scenario: Descend to another realm
- **WHEN** the player completes a dungeon
- **THEN** both views update to the newly generated realm with no stale terrain, player animation state, or actors

#### Scenario: Animate the player while the minimap is visible
- **WHEN** the Hero Warrior advances through idle or another selected animation
- **THEN** the game view updates its frame while the minimap continues to show one player marker at the unchanged logical cell
