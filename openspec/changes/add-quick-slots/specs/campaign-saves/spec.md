# Spec Delta

## ADDED Requirements

### Requirement: Persist Quick Slot state
Campaign saves SHALL persist both Quick Slot positions, their item identities, and their positive quantities. Loading a legacy campaign without Quick Slot state SHALL initialize both positions empty without invalidating the save, while normalized new campaigns SHALL preserve starter Inventory quantities.

#### Scenario: Resume populated Quick Slots
- **WHEN** a campaign is saved with Mana Potion X2 in Quick Slot 02 and reloaded
- **THEN** Quick Slot 02 shows Mana Potion X2 and Inventory, resources, and time remain consistent

#### Scenario: Load a legacy campaign
- **WHEN** a supported campaign has no Quick Slot field
- **THEN** both Quick Slots initialize empty and the campaign remains playable and saveable
