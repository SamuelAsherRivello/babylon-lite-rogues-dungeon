# Spec Delta

## ADDED Requirements

### Requirement: Persist quest progress with a Saved Game
Campaign saves SHALL persist the current quest, each item’s completion state, and the active item. Loading a supported campaign without quest data SHALL initialize My First Quest without discarding existing game progress.

#### Scenario: Resume partial quest progress
- **WHEN** a Saved Game with one completed My First Quest item is reloaded
- **THEN** its completed item and active remaining item are restored unchanged

#### Scenario: Load a pre-quest campaign
- **WHEN** a supported existing Saved Game has no quest data
- **THEN** it receives a new My First Quest with all items unfinished and preserves its other campaign state
