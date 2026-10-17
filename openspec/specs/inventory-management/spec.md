# inventory-management Specification

## Purpose
Manage collected items, compatible equipment groups, and live drag previews so only committed equipment changes alter the player's attributes and gameplay.

## Requirements

### Requirement: Collect ordinary items into Inventory
Ordinary item pickups SHALL enter Inventory without auto-equipping, prompting, or suspending gameplay. Inventory-held items SHALL have no effect on the player. The accepted collection's visible Inventory credit SHALL appear after its world-to-UI transfer completes. Resource potion pickups SHALL follow resource-meter collection rules.

#### Scenario: Collect a sword
- **WHEN** the player walks onto a sword with Inventory capacity available
- **THEN** it leaves the world, transfers to its planned Inventory row, and appears there after the transfer without an equipment or attribute change or dialog

### Requirement: Display bounded alphabetical Inventory
Inventory SHALL show full-width horizontal item entries without groups, ordered alphabetically by item name. Its bordered card title SHALL show current/max carry with at least two-digit counts, such as `Inventory 07/10`. Inventory SHALL always show a vertical scroll track. Capacity SHALL count Inventory entries; equipped items SHALL be outside that count.

#### Scenario: Display Inventory count
- **WHEN** seven items are carried and capacity is ten
- **THEN** the title reads `Inventory 07/10`

#### Scenario: Ignore Inventory drop position
- **WHEN** an equipped item is dropped anywhere in Inventory
- **THEN** it is inserted at its alphabetical position rather than the pointer's row position

#### Scenario: Inventory is full
- **WHEN** the player walks onto an ordinary item with no remaining capacity
- **THEN** movement is accepted and the item remains in the world without a prompt or attribute change

### Requirement: Accept equipment by compatible group
Equipment SHALL expose Weapons and Armor groups with two positions each. A compatible item SHALL be assignable to either position within its group. Sword and shield SHALL both be compatible with Weapons. Position within a group SHALL have no independent attribute modifier. Incompatible or unavailable destinations SHALL reject the drop without committing.

#### Scenario: Choose weapon position
- **WHEN** a sword is dragged into either available Weapons position
- **THEN** it enables there and applies the same item modifiers in either position

#### Scenario: Reject incompatible equipment
- **WHEN** a Chest Plate is dropped into Weapons
- **THEN** the item returns to its source and the player state and time remain unchanged

#### Scenario: Reject an occupied equipment destination
- **WHEN** an Inventory item is dropped onto an occupied equipment position
- **THEN** the drop is rejected, the item remains in Inventory, and no prompt, state change, or world tick occurs

### Requirement: Preview attributes only over a relevant equipment slot
While an item is actively being dragged over a compatible equipment position, Slot Drag Preview SHALL show the projected attribute values for that destination. Values SHALL be green for an increase, red for a decrease, and white when unchanged. Starting a drag, hovering Inventory, hovering an incompatible or occupied position, leaving a relevant equipment position, or ending the drag SHALL show no projected values. Preview SHALL NOT change authoritative attributes, resources, Inventory, combat effects, or world time.

#### Scenario: Preview drag-in
- **WHEN** an Inventory item hovers over a compatible available equipment position
- **THEN** Attributes show the values that enabling that item would produce, using green/red for differences

#### Scenario: Clear preview outside an equipment target
- **WHEN** the pointer leaves a compatible equipment position while an item remains in a drag operation
- **THEN** projected attribute values clear until the item enters another relevant equipment position

### Requirement: Commit or cancel equipment drag atomically
A valid release into or out of equipment SHALL enable or disable the item, apply its modifiers, end preview, restore white attribute numbers, and advance exactly one time unit. A canceled drag, invalid drop, return to the source, or capacity failure SHALL restore the original display and commit nothing.

#### Scenario: Enable equipment
- **WHEN** an Inventory item is fully released into an available compatible position
- **THEN** it leaves Inventory, becomes enabled, applies its effects, and causes one world tick

#### Scenario: Return an item to its source
- **WHEN** a dragged equipped item is released back into its original position
- **THEN** preview ends with no attribute, resource, Inventory, or time change

#### Scenario: Inventory cannot accept drag-out
- **WHEN** equipped gear is released into a full Inventory
- **THEN** it remains equipped and the preview and time cost are canceled

### Requirement: Render draggable item rows consistently
Equipment and Inventory entries SHALL occupy the card's full content width as horizontal rows. Equipment SHALL show Weapons and Armor section titles. Empty positions SHALL look like drop targets without visible placeholder text. Equipment positions SHALL support cosmetic rearrangement within a compatible group, costing one tick for a committed rearrangement.

#### Scenario: Read empty Armor position
- **WHEN** an Armor position is empty
- **THEN** it displays a full-width drop target with a `+` availability marker and no item name

#### Scenario: Show drag affordance only for draggable rows
- **WHEN** an equipment or Inventory row can be dragged
- **THEN** it shows a drag indicator and grab cursor; empty equipment targets and non-draggable rows do not show a grab cursor

#### Scenario: Exchange weapon positions
- **WHEN** the player swaps an equipped sword and shield within Weapons
- **THEN** their positions exchange, their combined attribute effect stays the same, and time advances once

### Requirement: Classify and transfer consumables for Quick Slots
Inventory SHALL distinguish quick-slottable consumables from equipment. Health Potion and Mana Potion entries SHALL be transferable to a compatible Quick Slot or returned from a Quick Slot, while weapons and armor SHALL remain governed by equipment rules and SHALL NOT be accepted by Quick Slots.

#### Scenario: Keep equipment out of Quick Slots
- **WHEN** a sword is dragged toward a Quick Slot
- **THEN** the destination rejects it and the sword remains governed by Inventory and Equipment rules

#### Scenario: Preserve Inventory after an invalid Quick Slot drop
- **WHEN** an incompatible item is released over a Quick Slot
- **THEN** the item remains in its original location and Inventory ordering is unchanged
