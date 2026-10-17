# Design

## Context

See proposal.md for the behavior change. The domain rules already hold serializable campaigns, apply accepted actions atomically, publish structured events, and derive effective attributes from equipment. React owns drag presentation, while Babylon Lite renders world actors and transient effects.

## Goals / Non-Goals

**Goals:**

- Keep all rule outcomes reproducible through a stored combat random state or deterministic seeded roll source.
- Make two-slot equipment, swaps, and comparisons one atomic loadout transaction.
- Keep combat rules independent of React and rendering.

**Non-Goals:**

- Adding equipment durability, weapon Mana costs, ability upgrades, additional equipment groups, or a five-slot layout.
- Changing the Rat or Skeleton from adjacent melee behavior.
- Moving Luck's loot-tier changes into this work.

## Decisions

### Model occupancy independently from item modifiers

Items carry compatible group, slot span, Offense, Defense, Mana, HIT, CRIT, and named perks. A two-slot item appears once in the equipment data with both slots referencing its occupancy identity. Effective attributes deduplicate occupied references so it applies modifiers once.

This retains the two-slot group UI and avoids a second item copy. Existing saves normalize legacy one-slot items and reject or repair invalid duplicate occupancy.

### Resolve swaps from a projected complete loadout

The drag resolver builds a projected equipment and Inventory result first. It only returns a transaction if all required slots are compatible and every displaced item fits. The same projection powers before-and-after comparison and the final action, preventing preview and commit from disagreeing.

### Use one bounded combat roll

Combat uses a 1 through 100 roll. Values within weapon CRIT are critical; values up to weapon HIT plus Luck are normal hits; remaining values miss. The rule engine emits the full result, and presentation maps it to numeric damage, `CRIT <damage>`, or `MISS`.

The game persists the roll source state with campaign data so reloads do not alter later outcomes. Stamina still determines current Offense and Defense before applying the result. Critical damage multiplies final normal player damage by 1.5 and rounds up.

### Derive incoming direction from source and heading

Enemy melee and ranged attacks include a cardinal source direction. The rule engine compares it with the player's latest cardinal heading and scales effective Defense at front 100 percent, side 70 percent, and rear 40 percent. Shields add base Defense for all directions. The Two-Handed Sword's automatic parry uses an explicit combat outcome rather than a hidden random block.

### Reuse the enemy action pipeline for the archer

The existing enemy action planner receives a cardinal line-of-sight range predicate for the Skeleton Archer. Its action creates a transient projectile record and a combat event in the same enemy phase. Rendering projects that record above the world until it reaches the player; rules do not wait on React animation.

## Risks / Trade-offs

- [Existing saves contain single-slot equipment] -> Normalize valid legacy entries during migration and preserve items rather than discarding them.
- [Two-slot swaps can overflow Inventory] -> Validate all displaced items before any mutation.
- [Random outcomes make tests flaky] -> Inject a deterministic roll sequence in focused tests and persist campaign roll state.
- [Projectile timing can desynchronize rule and animation] -> Commit damage in the action result and let presentation play a non-authoritative travel record.

## Migration Plan

1. Add serializable item occupancy, combat-result, projectile, and roll-state contracts with save migration.
2. Update rules and UI projections, then render item comparison, feedback, and projectiles.
3. Add focused unit and UI checks, followed by one muted Edge check for swap comparison and archer projectile feedback.
4. Run the applicable full browser suite during finalization.
