# Tasks

## 1. Model, save, and catalog equipment

- [ ] 1.1 Add serializable one-slot and two-slot equipment occupancy, combat properties, and deterministic combat-roll state; migrate existing saves without losing valid items and verify focused persistence tests.
- [ ] 1.2 Replace the equipment catalog with Dagger (Magic), Sword, Two-Handed Sword, Leg Armor (Magic), Chest Armor, and Suit of Armor; verify each item has only Offense, Defense, Mana, HIT, CRIT, and declared perks.
- [ ] 1.3 Make effective attributes deduplicate two-slot equipment and apply Mana as a maximum-resource bonus without a use cost; verify focused attribute and resource-cap tests.

## 2. Implement loadout transactions and carrying penalty

- [ ] 2.1 Implement projected one-slot and two-slot equipment swaps that validate every target and displaced Inventory item before mutation; verify success, cancellation, incompatible target, and full-Inventory cases.
- [ ] 2.2 Add two-input same-direction movement while Inventory exceeds capacity and preserve normal behavior for all other inputs; verify focused movement tests.
- [ ] 2.3 Extend structured equipment events with swap and occupancy facts; verify Log policy and event-order tests.

## 3. Implement combat outcomes and defense direction

- [ ] 3.1 Resolve player melee outcomes with a persisted deterministic 1-to-100 roll, weapon-specific HIT, Luck HIT bonus, weapon CRIT, and 150 percent rounded-up critical damage; verify normal hit, miss, crit, and reload determinism.
- [ ] 3.2 Apply Stamina-scaled Defense at front 100 percent, side 70 percent, and rear 40 percent; preserve shield defense and Two-Handed Sword automatic parry; verify all four cardinal attack directions.
- [ ] 3.3 Publish outcome, damage, direction, mitigation, and parry facts through combat events; verify event consumers receive no target damage on MISS.

## 4. Add archer rules and presentation

- [ ] 4.1 Add Skeleton Archer generation and five-tile cardinal line-of-sight attack behavior while preserving Rat and Skeleton melee-only behavior; verify focused enemy and world-generation tests.
- [ ] 4.2 Project and render transient archer projectiles before their non-authoritative impact feedback; verify renderer ordering, path, and cleanup tests.
- [ ] 4.3 Render directional player received-damage feedback and normal, CRIT, and MISS player attack feedback; verify focused feedback and particle projection tests.
- [ ] 4.4 Run a muted Edge check for an archer projectile and directional impact feedback; record the focused browser evidence and reserve the applicable full browser suite for finalization.

## 5. Update loadout and comparison interface

- [ ] 5.1 Render two-slot occupancy, item Offense, Defense, Mana, HIT, CRIT, and perks in equipment and Inventory details; verify page tests cover the requested names and labels.
- [ ] 5.2 Render complete before-and-after comparison deltas for valid empty and occupied drop targets, including both slots for a two-slot item; verify component tests and drag-state cleanup.
- [ ] 5.3 Run a muted Edge drag-and-drop check that previews and commits a valid occupied-slot swap, then run `npm test` and `npm run typecheck`; resolve regressions caused by this change.
