# Spec Delta

## Purpose

Quick Slots provide two fast, keyboard-accessible positions for consumable items. They let players move eligible potions between Inventory and a neutral two-slot panel, consume one item at a time, and preserve remaining quantities across turns and saves.

## ADDED Requirements

### Requirement: Render two neutral Quick Slots
The game SHALL render a Quick Slots panel beneath Abilities with exactly two full-width rows. Each row SHALL show its position as `01` or `02`, use neutral slot styling rather than the purple ability accent, and show either a centered empty `+` marker or the quick-slotted item name with its positive quantity as `Name XN`.

#### Scenario: Show empty Quick Slots
- **WHEN** a new campaign has no quick-slotted items
- **THEN** the panel shows rows `01` and `02`, each with a `+` marker and no `X0` text

#### Scenario: Show a populated stack
- **WHEN** Mana Potion quantity 2 occupies Quick Slot 02
- **THEN** row 02 reads `Mana Potion X2` and uses neutral slot colors

### Requirement: Accept only quick-slottable consumables
Quick Slots SHALL accept Health Potion and Mana Potion items, and SHALL reject weapons, armor, abilities, and any other non-consumable item without changing state or time.

#### Scenario: Reject equipment drag
- **WHEN** a weapon or armor item is dragged from Equipment or Inventory onto a Quick Slot
- **THEN** the drop is rejected, the source remains unchanged, and world time does not advance

#### Scenario: Accept a potion drag
- **WHEN** a Health Potion or Mana Potion is dragged from Inventory into an empty Quick Slot
- **THEN** the item leaves Inventory, occupies the destination, and one world turn advances

### Requirement: Transfer and combine Quick Slot quantities
The player SHALL be able to drag a Quick Slot stack back to Inventory, returning the entire positive stack in one committed turn. Dragging a matching potion from Inventory onto its occupied Quick Slot SHALL combine quantities in one committed turn. A Quick Slot SHALL never retain or render quantity zero.

#### Scenario: Return an entire stack
- **WHEN** Mana Potion X2 is dragged from Quick Slot 02 to Inventory
- **THEN** both potions return to Inventory, Quick Slot 02 becomes empty, and time advances once

#### Scenario: Combine a matching potion
- **WHEN** Mana Potion X1 is dragged onto Quick Slot 02 containing Mana Potion X1
- **THEN** Quick Slot 02 becomes Mana Potion X2, the Inventory item is removed, and time advances once

#### Scenario: Reject a different potion in an occupied slot
- **WHEN** Health Potion is dragged onto Quick Slot 02 containing Mana Potion
- **THEN** the drop is rejected and neither source nor destination changes

### Requirement: Use Quick Slots through Q and E
Pressing Q SHALL request the item in Quick Slot 01 and pressing E SHALL request the item in Quick Slot 02. A successful use SHALL consume exactly one item, apply its resource restoration, emit its committed events, and advance one world turn. When the quantity reaches zero, the slot SHALL clear.

#### Scenario: Consume one potion from Q
- **WHEN** Quick Slot 01 contains Health Potion X2 and the player presses Q
- **THEN** Health increases within its maximum, the slot becomes Health Potion X1, and time advances once

#### Scenario: Clear an exhausted slot
- **WHEN** Quick Slot 01 contains Health Potion X1 and the player successfully presses Q
- **THEN** the item is consumed, Quick Slot 01 becomes empty, and no `X0` is rendered

#### Scenario: Reject an empty Quick Slot
- **WHEN** the player presses E while Quick Slot 02 is empty
- **THEN** no item is consumed, no event or message is produced, and time does not advance

### Requirement: Reject use at a full resource
Using a Quick Slot potion SHALL be rejected when the corresponding resource is already at its maximum. The potion quantity and Quick Slot SHALL remain unchanged, time SHALL not advance, and a structured rejection event SHALL be emitted for Log to interpret.

#### Scenario: Reject a full Health resource
- **WHEN** Quick Slot 01 contains Health Potion X1 and Health is already full
- **THEN** the potion remains in the slot, time remains unchanged, and a full-resource rejection event is emitted
