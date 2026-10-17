# Spec Delta

## MODIFIED Requirements

### Requirement: Resolve tactical enemy actions
Living enemies SHALL persist an `idle`, `pursue`, `attack`, or `blocked` tactical state with individual awareness and cooldown data. After an accepted player turn, each due enemy SHALL select at most one deterministic action from a shared turn snapshot. An aware enemy SHALL use a cardinal route toward the player, attack when cardinally adjacent, and return to idle immediately when awareness is lost. The resolver SHALL commit move intents in stable enemy-ID order and prevent two enemies from entering the same cell.

#### Scenario: Eligible enemy routes around a blocker
- **WHEN** an aware, due enemy has no direct cardinal step to the player but has a cardinal route around blocking terrain or entities
- **THEN** it enters or remains in pursue state and moves one cell along that route

#### Scenario: Enemy attacks from cardinal adjacency
- **WHEN** an aware, due enemy is cardinally adjacent to the player
- **THEN** it enters attack state and performs one attack without moving

#### Scenario: Enemy loses awareness
- **WHEN** an enemy in pursue, attack, or blocked state no longer has the player in effective awareness range
- **THEN** it enters idle state and neither retains nor searches a remembered player position

#### Scenario: Contested destination
- **WHEN** two due enemies select the same walkable destination during one enemy phase
- **THEN** stable enemy-ID order selects one move and the other enemy remains out of that destination

#### Scenario: No route exists
- **WHEN** an aware, due enemy has no legal cardinal route to the player
- **THEN** it enters blocked state without crossing terrain, object, or entity blockers

#### Scenario: Enemy waits for its cooldown
- **WHEN** an aware enemy's action cooldown is not due after an accepted player turn
- **THEN** that enemy neither moves nor attacks during the turn

#### Scenario: Eligible enemy approaches
- **WHEN** an enemy is aware and its action cooldown is due after an accepted player turn
- **THEN** it moves one cardinal cell toward the player or performs one attack when cardinally adjacent

#### Scenario: Enemy approaches
- **WHEN** an enemy can reach or attack the player during its action
- **THEN** it moves or attacks once according to its behavior
