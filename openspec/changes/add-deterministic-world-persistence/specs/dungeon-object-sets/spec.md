# Spec Delta

## MODIFIED Requirements

### Requirement: Preserve linked set state across campaign storage
The campaign save SHALL preserve each linked object's stable set identity and any player-caused coordinate or mutable-state delta. On restore, trigger-derived door state SHALL be recalculated from the reconstructed player and barrel occupancy. Returning to a previously visited level SHALL restore the same linked set state without requiring a full serialized floor.

#### Scenario: Resume while the door is open
- **WHEN** a player saves or reloads a level while the barrel or player holds a trigger
- **THEN** the reconstructed linked door is open and traversable

#### Scenario: Return to a visited floor
- **WHEN** a player returns to a previously visited level containing a linked set
- **THEN** its barrel position and linked door state match the saved level
