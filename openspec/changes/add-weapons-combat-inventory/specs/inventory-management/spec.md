# Spec Delta

## MODIFIED Requirements

### Requirement: Accept equipment by compatible group
Equipment SHALL expose Weapons and Armor groups with two positions each. A compatible item SHALL be assignable to either position within its group. Two-slot equipment SHALL require and occupy both positions in its compatible group. Sword and shield SHALL both be compatible with Weapons. Position within a group SHALL have no independent attribute modifier. Incompatible or unavailable destinations SHALL reject the drop without committing. A compatible Inventory item dropped into occupied required positions SHALL swap atomically when every displaced item can enter Inventory.

#### Scenario: Choose weapon position
- **WHEN** a one-slot sword is dragged into either available Weapons position
- **THEN** it enables there and applies the same item modifiers in either position

#### Scenario: Reject incompatible equipment
- **WHEN** a Chest Plate is dropped into Weapons
- **THEN** the item returns to its source and the player state and time remain unchanged

#### Scenario: Reject an occupied equipment destination
- **WHEN** an Inventory item is dropped onto an occupied equipment position but the displaced items cannot all enter Inventory
- **THEN** the drop is rejected, the item remains in Inventory, and no prompt, state change, or world tick occurs

#### Scenario: Swap one-slot weapon
- **WHEN** a Sword is released over an occupied Weapons position and Inventory has room for the displaced item
- **THEN** the Sword equips, the displaced item enters alphabetical Inventory order, and one turn advances

#### Scenario: Reject two-slot capacity failure
- **WHEN** a Two-Handed Sword is released while both Weapons positions are occupied and Inventory lacks room for both displaced items
- **THEN** the release is rejected with no equipment, Inventory, attribute, or time change

### Requirement: Preview attributes only over a relevant equipment slot
While an item is actively being dragged over a compatible complete equipment destination, Slot Drag Preview SHALL show the projected complete-loadout attribute values for that destination. It SHALL compare current and projected Offense, Defense, Mana, and perks. Values SHALL be green for an increase, red for a decrease, and white when unchanged. Starting a drag, hovering Inventory, hovering an incompatible or invalid destination, leaving a relevant equipment position, or ending the drag SHALL show no projected values. Preview SHALL NOT change authoritative attributes, resources, Inventory, combat effects, or world time.

#### Scenario: Preview drag-in
- **WHEN** an Inventory item hovers over a compatible available equipment position
- **THEN** Attributes show the values that enabling that item would produce, using green/red for differences

#### Scenario: Preview an occupied slot
- **WHEN** Dagger (Magic) hovers an occupied Weapons position and the displaced item fits in Inventory
- **THEN** the comparison includes the equipped item's removal and the Dagger's addition before release

#### Scenario: Clear preview outside an equipment target
- **WHEN** the pointer leaves a compatible equipment position while an item remains in a drag operation
- **THEN** projected attribute values clear until the item enters another relevant equipment position

### Requirement: Commit or cancel equipment drag atomically
A valid release into, out of, or within equipment SHALL apply the complete projected loadout transaction, end preview, restore white attribute numbers, and advance exactly one time unit. A canceled drag, invalid drop, return to the source, or capacity failure SHALL restore the original display and commit nothing.

#### Scenario: Enable equipment
- **WHEN** an Inventory item is fully released into an available compatible position
- **THEN** it leaves Inventory, becomes enabled, applies its effects, and causes one world tick

#### Scenario: Return an item to its source
- **WHEN** a dragged equipped item is released back into its original position
- **THEN** preview ends with no attribute, resource, Inventory, or time change

#### Scenario: Inventory cannot accept drag-out
- **WHEN** equipped gear is released into a full Inventory
- **THEN** it remains equipped and the preview and time cost are canceled

## ADDED Requirements

### Requirement: Penalize encumbered movement
When Inventory entry count exceeds carrying capacity, the player SHALL need two valid movement inputs in the same intended direction to move one tile. Non-movement inputs and rejected movement SHALL not arm or consume the pending movement input.

#### Scenario: Take an encumbered step
- **WHEN** an encumbered player presses the same valid movement direction twice
- **THEN** the second input moves one tile and advances one turn
