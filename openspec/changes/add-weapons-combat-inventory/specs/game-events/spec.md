# Spec Delta

## ADDED Requirements

### Requirement: Publish combat outcome facts
Combat events SHALL identify HIT, CRIT, or MISS outcomes, attempted and applied damage, attack direction, mitigation, and projectile identity when applicable. Equipment swap events SHALL identify every displaced and equipped item.

#### Scenario: Publish a critical attack
- **WHEN** a player attack critically hits
- **THEN** its combat event identifies the critical outcome and applied damage

#### Scenario: Publish an equipment swap
- **WHEN** a valid equipment swap commits
- **THEN** its equipment event identifies the incoming item and each displaced item

