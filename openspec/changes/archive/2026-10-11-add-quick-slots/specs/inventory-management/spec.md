# Spec Delta

## ADDED Requirements

### Requirement: Classify and transfer consumables for Quick Slots
Inventory SHALL distinguish quick-slottable consumables from equipment. Health Potion and Mana Potion entries SHALL be transferable to a compatible Quick Slot or returned from a Quick Slot, while weapons and armor SHALL remain governed by equipment rules and SHALL NOT be accepted by Quick Slots.

#### Scenario: Keep equipment out of Quick Slots
- **WHEN** a sword is dragged toward a Quick Slot
- **THEN** the destination rejects it and the sword remains governed by Inventory and Equipment rules

#### Scenario: Preserve Inventory after an invalid Quick Slot drop
- **WHEN** an incompatible item is released over a Quick Slot
- **THEN** the item remains in its original location and Inventory ordering is unchanged
