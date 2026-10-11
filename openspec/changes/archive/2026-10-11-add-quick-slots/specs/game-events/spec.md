# Spec Delta

## ADDED Requirements

### Requirement: Publish Quick Slot events
Quick Slot transfers, successful consumable uses, and rejected uses SHALL publish structured events with the item identity, quantity or resource facts, source/destination where applicable, outcome, and game time. Full-resource rejections SHALL be available to Log without requiring domain systems to format user-facing text.

#### Scenario: Record a Quick Slot transfer
- **WHEN** a potion is committed from Inventory to Quick Slot 01
- **THEN** an event identifies the potion, source, destination, resulting quantity, and committed time

#### Scenario: Record a full-resource rejection
- **WHEN** a Health Potion is used while Health is full
- **THEN** a rejected event identifies the resource, current and maximum values, item, and rejection reason
