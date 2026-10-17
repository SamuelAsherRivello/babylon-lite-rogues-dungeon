# Spec Delta

## MODIFIED Requirements

### Requirement: Collect ordinary items into Inventory
Ordinary item pickups SHALL enter Inventory without auto-equipping, prompting, or suspending gameplay. Inventory-held items SHALL have no effect on the player. The accepted collection's visible Inventory credit SHALL appear after its world-to-UI transfer completes. Resource potion pickups SHALL follow resource-meter collection rules.

#### Scenario: Collect a sword
- **WHEN** the player walks onto a sword with Inventory capacity available
- **THEN** it leaves the world, transfers to its planned Inventory row, and appears there after the transfer without an equipment or attribute change or dialog
