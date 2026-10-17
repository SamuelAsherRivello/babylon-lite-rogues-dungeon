# Proposal

## Why

Rogue's Dungeon currently has deterministic melee damage, rejects drops on occupied equipment slots, and has no ranged enemy. Players need permanent gear choices, readable chance-based combat, and positional defense that reward loadout and facing decisions.

## What Changes

- Replace the small equipment catalog with three one-or-two-slot weapon choices and three one-or-two-slot armor choices. Each item modifies only Offense, Defense, and Mana; equipment never has durability or a Mana use cost.
- Allow compatible equipment dragged onto occupied slots to swap atomically when every displaced item fits in Inventory. Preview the complete projected loadout and comparison before release.
- Apply an encumbrance movement penalty when carried item count exceeds capacity: two movement inputs move the player one tile.
- Resolve player melee attacks with weapon-specific HIT and CRIT values plus Luck's HIT bonus. Misses deal no target damage; critical hits deal 150% of final normal damage and display distinct feedback.
- Apply Stamina-scaled Defense by attack direction: 100% from the front, 70% from either side, and 40% from the rear. Preserve shields and the Two-Handed Sword's automatic parry as equipment effects.
- Add a Skeleton Archer that makes cardinal, line-of-sight ranged attacks up to five tiles and displays its projectile before resolving directional damage.
- Preserve current Vitality, Strength, Recovery, Stealth, and loot-tier Luck behavior. This change adds only Luck's +1 HIT point per rank combat effect.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `inventory-management`: Support occupied-slot swaps, two-slot equipment, comparison previews, and encumbrance movement.
- `character-progression`: Define equipment-derived Offense, Defense, and Mana plus Luck's combat HIT effect.
- `combat-resolution`: Replace deterministic player melee damage with HIT, CRIT, miss, and directional-defense resolution.
- `dungeon-turns`: Define ranged enemy turns, projectiles, and two-input encumbered movement.
- `world-floating-feedback`: Present CRIT, MISS, and directional received-damage feedback.
- `game-events`: Publish structured outcomes and facts for misses, critical hits, directional mitigation, equipment swaps, and projectiles.
- `world-map-rendering`: Render the Skeleton Archer and transient ranged projectiles.
- `campaign-saves`: Persist compatible equipment occupancy and combat roll state across reloads.

## Impact

- Affected rules and persistence: item, equipment, enemy, combat-event, and saved-campaign contracts require backward-compatible migration.
- Affected UI and presentation: equipment and Attribute panels, drag previews, floating combat feedback, projectiles, Log, audio, and particle projections.
- Affected verification: focused deterministic test seams for seeded combat outcomes, rule and UI tests, plus one muted Edge check for swap comparison and a projectile hit.
- Playwright adds useful evidence for the browser-visible drag and projectile behavior. It will run after those implementation groups; finalization will run the broader applicable browser suite.
