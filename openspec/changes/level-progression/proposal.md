# Proposal

## Why

Rogue's Dungeon has XP and a level field, but its current level-up flow is easy to miss, blocks play behind a forced three-option choice, and gives new Saved Games an identical character. The prototype needs a readable, accelerated progression loop that lets a reviewer create a distinct character, feel meaningful growth across a few dungeon levels, and understand how resources and level relate.

## What Changes

- Add character creation when a player selects an empty Saved Game. The Create Character window shows an idle hero preview, a compact profile, ten attributes, reroll, confirmation, and cancellation without creating a campaign until confirmation.
- Generate every starting sheet from a fixed 30-point pool: each of the ten attributes starts at least 1, no attribute exceeds 5 at creation, and rerolls redistribute the same pool rather than changing total starting power.
- Set character level and each attribute to a maximum of 99. Make ranks 1 through 5 visibly meaningful, and keep a focused prototype build at rank 14 powerful but clearly early-game.
- Replace forced level-up choices with three spendable Progression points per level in the prototype. Earned points persist until the player opens Progression, previews allocations, and confirms permanent increases. A preview never reduces committed values or advances game time.
- Award XP from successful attacks, enemy defeats, discoveries, opened chests or crates, and new dungeon levels. Preserve character level, all spent and unspent points, and partial XP through death, reload, and checkpoints; prevent repeatable XP farming from movement, waiting, or reused world objects.
- Make level gain a visible and audible milestone: sparkles converge from every direction onto the player, merge, then play a chime. The player may continue play and choose when to open Progression.
- Retain a reusable panel-popup API that can darken an individual panel and present a panel-local call to action. The API supports the level-up Attributes callout, but the current implementation keeps that callout disabled until the rest of Level Progression is implemented. When enabled, it darkens only the Attributes panel and offers an `Open Progression` action without pausing the world. The callout has no dismissal path and remains until the player confirms allocations that leave no Attribute Points unspent. Selecting it opens the full Progression dialog over the game; that dialog may close without committing a draft allocation, after which the callout remains.
- Rename the player Resources panel to Status. Make player level readable in the XP meter as `LVL 01`, using contrast that stays legible over both the filled and unfilled portions of the bar. Add current and maximum values to every Status-bar tooltip, including level and XP progress for the XP tooltip.
- Preserve the existing shared 0-to-99 meter track. Starting attribute ranks 1 through 5 map to visually significant capacity markers from roughly 10 to 50 percent, while later focused growth approaches but never exceeds the track width.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `character-progression`: replace forced stat choices with persistent Progression points, define character and attribute caps, XP sources and persistence, and level-gain presentation.
- `campaign-saves`: require character creation before an empty Saved Game becomes a campaign and persist the new progression state.
- `resource-meters`: make the player level prominent and readable in XP, define scaled attribute capacity markers, and expose live resource values through tooltips.
- `tooltip-presentation`: extend resource UI tooltips with current and maximum values.
- `game-audio`: add the level-gain chime to the event-based sound catalog.
- `pixel-game-presentation`: replace the forced level-up modal and rename the primary HUD card from Resources to Status.

## Impact

- Affected systems include the campaign domain model, progression and turn rules, save migration and slot selection, resource calculations and UI, dialogs, reusable panel callouts, tooltips, particle presentation, and sound-event routing.
- Existing level-up modal behavior, XP award rules, and initial fixed attribute values change.
- Browser-visible behavior warrants one focused muted Playwright check after implementation, with the full applicable browser suite reserved for finalization.
