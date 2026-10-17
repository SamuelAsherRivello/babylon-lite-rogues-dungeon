# Design

## Context

See proposal.md for motivation. The game currently creates one fixed attribute sheet, stores forced three-option level-up entries in `progression.pendingUpgrades`, blocks actions while one is present, and renders `level-up-window.tsx`. `world-procedural-system.ts` owns campaign creation, XP awards, resource normalization, and death reset. `save-system.ts` owns versioned localStorage migration. React owns the Saved Game menu, HUD cards, tooltips, and windows; the Babylon event layer can present world effects and route sound cues.

The reusable `GameCard` panel-popup API already exists. Its level-up use remains disabled until the complete unspent-point flow is available, then the new flow enables it instead of adding a second panel overlay pattern.

## Goals / Non-Goals

**Goals:**

- Replace forced choices with a persistent, previewable Attribute Point budget.
- Make first-run character sheets varied but equal in total value.
- Keep progression rules pure enough for Node tests and migrate existing campaigns safely.
- Give level gains a readable HUD path, a world celebration, and audio feedback.

**Non-Goals:**

- Weapon upgrading, weapon crafting, item-level requirements, talent trees, and randomized character art.
- Accounts, online persistence, or any renderer fallback.
- A balance promise beyond the prototype's accelerated two-to-three-minute level cadence.

## Decisions

### Store committed progression separately from UI drafts

Replace `pendingUpgrades` with a non-negative `attributePoints` integer alongside capped level, XP, threshold, and all ten attributes. A Progression dialog holds draft deltas in React state. Only a confirm action sends the aggregate allocation to the rules layer, which validates available points and the 99 cap, applies the increase, normalizes affected resources, and does not tick time.

This prevents a preview from mutating an autosaved campaign. It also removes the current global action gate. Retaining the forced-option array would preserve a state shape that cannot express partially spent or deferred points.

### Generate sheets from bounded equal-value rolls

Character creation starts every attribute at one, then distributes the remaining 20 points at random among attributes below five. The roll helper accepts an injectable random source for deterministic tests. A campaign is created only after confirmation, using the chosen sheet; canceling does not write a slot.

Random totals or hand allocation were rejected because they either change initial power between rerolls or ask a first-time player to understand every attribute before playing.

### Make XP sources explicit and idempotent

Rules-layer helpers award configured XP for hit, defeat, discovery, first chest/crate open, and first floor arrival. World state records completion where needed so reopening or revisiting cannot re-award it. The tuning constants stay near the rules that produce events and are adjusted against the prototype cadence. The level loop preserves excess XP, grants three points per threshold, and stops granting levels at 99.

This uses domain events and persistent world flags instead of UI-driven awards, which keeps save/reload and turn behavior consistent.

### Use a diminishing capacity curve on the shared track

Resource maximums remain game values derived from attributes. Presentation maps the rank to a cap-marker percentage on the existing 0-to-99 track: ranks 1 through 5 use the linear 10 through 50 percent early range; later ranks use a monotonic diminishing curve that places rank 14 below the edge and rank 99 at or below 99 percent. Fill is current value as a fraction of maximum multiplied by that marker percentage.

The track does not grow with a stat, so a high rank cannot stretch the HUD. A purely linear rank-to-percent mapping would overflow at rank 14.

### Reuse the popup pattern and separate it from the dialog

After the full point flow exists, Attributes receives the existing panel-local `LEVEL UP` popup whenever points remain. It is intentionally non-dismissible, but it does not pause actions. Its action opens a modal Progression dialog. Closing the dialog abandons its React draft and returns to the still-visible panel popup. The flow removes the current forced `LevelUpWindow` and its input block.

The initial code keeps the popup call site disabled while its supporting state and dialog are incomplete, avoiding a dead-end call to action. A global forced modal was rejected because it interrupts combat; a dismissible panel callout was rejected because it can hide the only route to spend points.

### Version and migrate saves at the persistence boundary

Advance the campaign version and normalize legacy progression when loading: introduce missing attributes at valid minimums, clamp level and attributes to 99, retain valid partial XP, convert missing points to zero, discard obsolete forced-option entries, and rebuild resource caps while preserving valid fullness ratios. Migration continues to make a backup before replacing an older supported record.

This lets existing Saved Games load safely without mixing migration rules into the game UI.

### Drive presentation from progression events

The level-up rules event includes the player location and gained level. The turn-presentation and renderer path use it to start inward sparkle particles, while audio maps it to one non-diegetic chime. React derives `LVL NN`, Status tooltip prefixes, and panel copy from current campaign state rather than cached display values.

## Risks / Trade-offs

- [A rapidly changing character sheet can leave the campaign imbalanced] → Keep XP rewards configurable, add boundary tests, and use the capped capacity curve.
- [Migrated saves can have values outside the new range] → Clamp only normalized copied data and retain a backup before writing the migrated record.
- [A celebration can overlap other world animation] → Give the level event a distinct, short-lived particle lifecycle and clean it up after completion.
- [The panel callout can obscure Attributes] → It covers only that card and remains the deliberate, visible route into Progression.

## Migration Plan

1. Add the new progression version and pure normalizers before reading or writing new campaigns.
2. Load supported existing records through the normalizer, retain a backup where the existing save policy does, and write the updated record only after successful normalization.
3. Release the UI and event presentation after the rules and save shape are stable.
4. Roll back by restoring a recorded legacy payload from the existing backup key; the new UI does not require irreversible world conversion.
