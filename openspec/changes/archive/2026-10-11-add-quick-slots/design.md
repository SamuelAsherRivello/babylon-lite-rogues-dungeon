# Design

## Context

The current domain model treats every Inventory item as equipment, with `Item.group` limited to weapons and armor. Drag resolution therefore routes Inventory items only to Equipment or back to Inventory. Keyboard handling already centralizes non-movement actions in `Game.tsx`, while `applyAction` owns validation, resource changes, event emission, and turn advancement. See proposal.md and the Quick Slots delta for the requested behavior.

## Goals / Non-Goals

**Goals:**

- Add a serializable two-entry Quick Slot model with positive stack quantities.
- Keep item compatibility and turn-cost validation in the domain action layer, not in React-only code.
- Reuse existing inventory drag previews and action/session autosave behavior while adding explicit Quick Slot destinations.
- Keep structured Quick Slot events independent from Log wording.
- Normalize legacy campaigns without Quick Slot state and preserve the requested starter consumables in new campaigns.

**Non-Goals:**

- Do not change world potion spawning or pickup behavior; world potion availability is a separate future concern.
- Do not add quick-slot support for equipment, abilities, or arbitrary future item types in this change.
- Do not add a mobile-specific key scheme; mobile may expose the same two actions through the existing control surface only if the implementation has a direct existing pattern.

## Decisions

### Use a discriminated consumable item model

Extend the serializable item contract with an explicit consumable kind/resource rather than inferring quick-slot eligibility from names or equipment groups. Health Potion and Mana Potion instances carry stable IDs, names, a consumable resource, and a quick-slottable classification; equipment retains its group and modifiers. This prevents weapons and armor from entering Quick Slots and leaves room for future consumables without another UI-only allowlist.

An alternative was to keep potion items as equipment-shaped records and check their names. That would couple gameplay to display text and make save migration fragile, so it is rejected.

### Store two nullable stack records on the player

Add `quickSlots: [QuickSlot | null, QuickSlot | null]` to the player state. Each `QuickSlot` stores a consumable item identity/definition and `quantity >= 1`; Inventory continues to hold item instances, so transferring a stack back expands it into that many Inventory entries. Matching Inventory-to-slot drops increment the destination quantity, while different consumables and occupied incompatible destinations reject atomically.

An alternative was to keep stack counts as duplicate Inventory rows. That makes rendering and save migration harder and cannot express a single quick-slot stack cleanly, so the stack belongs to the Quick Slot.

### Add explicit actions for transfer and use

Add domain actions for assigning an Inventory item to a Quick Slot, returning a Quick Slot stack to Inventory, and using a Quick Slot. The action resolver validates source identity, destination compatibility, capacity, quantity, resource fullness, and index bounds before mutating state. Committed transfers and successful uses call the existing turn tick exactly once; rejected actions return the existing rejected-action shape with zero ticks.

Quick-slot use reuses the existing Health/Mana restoration rules and emits resource plus consumable events. Full-resource use emits a structured rejection event and does not tick or decrement quantity.

### Extend the existing pointer drag routing

Keep the shared pointer-drag lifecycle in `Game.tsx`, add Quick Slot drop metadata, and expand the drop resolver to return Quick Slot destinations. Inventory and Quick Slot rows become drag sources where compatible; ability and equipment sources remain excluded from Quick Slot actions. Preview state remains pure and is cleared on invalid destinations, cancellation, or release.

### Bind Q and E at the keyboard boundary

Extend the existing keyboard effect so non-repeating Q and E dispatch the corresponding Quick Slot use action when a campaign is active and settings/upgrades are not blocking input. Empty and rejected uses are handled by the domain resolver, not by separate UI-side resource logic.

### Normalize saves at the persistence boundary

Campaign migration adds empty Quick Slots when the field is absent, removes invalid or zero quantities, and preserves valid positive stacks. New campaign creation seeds Inventory with Health Potion x1 and Mana Potion x2. Save writes always emit the normalized two-slot shape.

### Verification split by layer

Focused Node tests cover item classification, starter state, transfer validation, stacking, use/depletion, full-resource rejection, events, and save migration. Source/UI tests cover the panel, neutral styling, labels, Q/E dispatch, and drop metadata. One focused Playwright check should verify the rendered panel, drag of both starter potions, visible quantities, and Q/E depletion with `?mute=1`; the broader browser suite remains finalization coverage.

## Risks / Trade-offs

- [Risk] Existing saved campaigns contain equipment-shaped records and no Quick Slot field → [Mitigation] Keep Quick Slot migration additive, initialize missing state empty, and retain existing Inventory/equipment migration behavior.
- [Risk] Expanding a returned stack can exceed Inventory capacity → [Mitigation] validate total destination capacity before mutation and reject the entire transfer atomically.
- [Risk] Existing world potion entities and new starter Inventory potions could appear to duplicate the feature → [Mitigation] preserve world entities unchanged and scope this change's new state to starter Inventory plus Quick Slots.
- [Risk] A keyboard action could accidentally repeat while held → [Mitigation] use the existing non-repeating key guard for Q/E.

## Migration Plan

1. Add the item/Quick Slot types and normalize missing legacy fields at load.
2. Seed only newly created campaigns with Health Potion x1 and Mana Potion x2.
3. Implement domain actions and structured events, then connect React drag and keyboard controls.
4. Run focused logic/source tests and one muted Playwright browser check.
5. If rollback is required, remove the new UI/action paths; normalized saved campaigns retain the additive Quick Slot field and remain readable by the migration boundary.

## Open Questions

None for the agreed scope. Full-resource use is resolved as a rejected, event-emitting, zero-turn action.
