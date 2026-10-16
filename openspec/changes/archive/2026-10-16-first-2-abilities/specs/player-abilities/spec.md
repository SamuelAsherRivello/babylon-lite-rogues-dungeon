# Spec Delta

## MODIFIED Requirements

### Requirement: Resolve affordable abilities as one action
An accepted ability SHALL deduct its Mana cost immediately, begin its configured presentation, apply its defined effect when that presentation completes, and then advance one time unit followed by one enemy phase. Heal SHALL restore Health within its maximum at the final presentation frame, and Wand SHALL provide offensive magic against its locked target at the final presentation frame. Effect strength, cost, targeting range, and animation timing SHALL be configurable independently of slot binding.

#### Scenario: Cast an affordable ability
- **WHEN** an ability with a valid effect and target is activated with enough Mana
- **THEN** its cost is deducted once immediately, its effect resolves once when its presentation completes, and the world advances once

#### Scenario: Complete Heal
- **WHEN** Heal reaches its final presentation frame
- **THEN** Health is restored within its maximum before the resulting time increment and enemy phase
