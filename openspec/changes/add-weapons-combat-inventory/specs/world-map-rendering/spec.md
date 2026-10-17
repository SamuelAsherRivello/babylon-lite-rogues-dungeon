# Spec Delta

## ADDED Requirements

### Requirement: Render ranged combat actors and projectiles
The world view SHALL render a Skeleton Archer and each transient ranged projectile above terrain and below persistent interface content. A projectile SHALL travel from its source to the resolved target before its feedback appears.

#### Scenario: Render an arrow
- **WHEN** a Skeleton Archer fires at the player
- **THEN** an arrow appears along its cardinal travel path before the hit feedback

