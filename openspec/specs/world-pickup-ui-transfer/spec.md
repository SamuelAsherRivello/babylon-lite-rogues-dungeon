# world-pickup-ui-transfer Specification

## Purpose
Present collected world objects as clear, correctly layered transfers to their receiving user-interface destinations.

## Requirements

### Requirement: Transfer a collected pickup into its receiving UI layer
An accepted item, potion, key, or gold pickup SHALL leave the world renderer and appear as a temporary DOM transfer in the UI layer containing its resolved destination. The transfer SHALL render above its destination control.

#### Scenario: Transfer a health potion to an existing receiving slot
- **WHEN** a Health Potion is collected and its receiving slot already exists
- **THEN** a transfer appears over that slot's UI layer and lands at the row's left edge and vertical midpoint

### Requirement: Preserve projected world presentation during transfer
The transfer SHALL begin at the collected object's projected game-view position and world-rendered CSS size under the active camera and world Zoom. Potion transfers SHALL preserve that size throughout travel.

#### Scenario: Collect while a non-default camera and Zoom are active
- **WHEN** a player collects a Mana Potion in Center, Deadzone, or Screen camera mode at any supported world Zoom
- **THEN** its transfer begins at the position and size shown immediately before collection

### Requirement: Land counter pickups on their counter icons
Key and gold transfers SHALL end over their corresponding title-bar icons and interpolate from world-rendered size to the counter icon size.

#### Scenario: Collect gold
- **WHEN** a player collects Gold
- **THEN** the transfer flies over the Gold counter icon before disappearing

### Requirement: Delay visible receiving credit until transfer completion
The receiving Inventory row, Quick Slot quantity, Key count, or Gold count SHALL remain at its pre-collection visible value during a 500ms flight and a 500ms destination pause, then update when the transfer disappears.

#### Scenario: Collect a new Inventory potion
- **WHEN** a potion has no existing receiving slot and Inventory has capacity
- **THEN** its planned empty row is the destination and the row appears with the collected potion only after the destination pause
