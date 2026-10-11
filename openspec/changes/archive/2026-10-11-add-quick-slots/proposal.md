# Proposal

## Why

Rogue's Dungeon needs a fast, keyboard-accessible way to carry and consume resource potions during a run. Quick slots make consumables distinct from equipment and abilities while preserving the game's turn-based rule that committed drag actions and successful uses advance the world exactly once.

## What Changes

- Add a neutral Quick Slots panel beneath Abilities with two numbered positions: `01 [Q]` and `02 [E]`.
- Add a quick-slottable consumable item type, initially supporting Health Potion and Mana Potion while excluding weapons, armor, and abilities.
- Start each new campaign with Health Potion x1 and Mana Potion x2 in Inventory for testing.
- Allow compatible consumables to move between Inventory and either Quick Slot through drag-and-drop; each committed move costs one turn.
- Combine a matching dragged consumable into an occupied Quick Slot stack and return an entire stack to Inventory when dragged out.
- Consume exactly one potion from a Quick Slot on its keyboard action, clear the slot when quantity reaches zero, and never render x0.
- Reject use when the matching resource is already full, preserving the item and time while emitting a structured rejection event for Log to interpret.
- Persist quick-slot contents and quantities through campaign saves and legacy normalization.

## Capabilities

### New Capabilities

- `quick-slots`: Two-slot consumable storage, quantity tracking, keyboard use, and drag transfer rules.

### Modified Capabilities

- `inventory-management`: Inventory gains a consumable subset that can transfer to and from Quick Slots without equipment compatibility rules.
- `game-events`: Quick-slot transfers, successful uses, and full-resource rejections publish structured events for Log and other subscribers.
- `campaign-saves`: Complete campaign persistence now includes Quick Slot contents and quantities.

## Impact

- Domain model and action resolution in `rogues-dungeon/src/game/types.ts` and `rogues-dungeon/src/systems/procedural-generation/procedural-generation-system.ts`.
- Save migration and serialization in `rogues-dungeon/src/systems/persistence/save-system.ts`.
- React slot presentation, drag routing, and Q/E keyboard dispatch in `rogues-dungeon/src/game/Game.tsx`, with neutral Quick Slot styles in `rogues-dungeon/src/ui/style.css`.
- Existing inventory, event/log projection, keyboard, and browser verification tests will gain focused Quick Slot coverage. Playwright is useful for verifying panel placement, visible labels, drag transfers, and Q/E behavior; proposal does not run it.
- No new dependency is required, and world potion spawning remains outside this change's purpose; starter Inventory items provide the initial manual test fixtures.
