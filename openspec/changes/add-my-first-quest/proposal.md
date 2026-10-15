# Proposal

## Why

The Quest card currently presents hard-coded placeholder text, so it cannot reflect player progress or support future guidance. A durable quest subsystem is needed now to introduce the first player-facing quest without coupling quest rules to movement, pickup, or rendering systems.

## What Changes

- Add a serializable, event-observing quest capability with one quest per campaign and a public query for the current quest and active item.
- Start every new Saved Game with **My First Quest**: Walk through the stairs, Collect a Health Potion, and Collect a coin.
- Complete each item from relevant structured domain events in any order; retain the active item unless it is the item completed, then select the earliest unfinished item.
- Persist in-progress and completed quest state with the Saved Game. A completed My First Quest remains visible with all items crossed out and no replacement quest.
- Replace the placeholder Quest card with data-driven title, active indicator, and completed-item styling.

## Capabilities

### New Capabilities

- `quest-progression`: Defines campaign quests, event-driven item completion, active-item queries, and My First Quest.

### Modified Capabilities

- `campaign-saves`: Persist and safely initialize quest progress in Saved Games.
- `pixel-game-presentation`: Render the active or completed quest in the Quest card.

## Impact

- Affected code: serializable game contracts, campaign creation and migration, an independent quest system, session event processing, Quest React view and styles, and focused Node/browser tests.
- Existing structured pickup and realm-entry events remain the integration boundary; no new dependency or quest-specific logic in world systems is introduced.
- A focused muted Playwright check adds useful evidence for visible title, active arrow, and strike-through state; Node tests cover event matching, active selection, and persistence.
