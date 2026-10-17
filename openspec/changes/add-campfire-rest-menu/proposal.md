# Proposal

## Why

Campfires are currently static, blocked world objects with no player-facing interaction. Giving them a restrained idle animation and a deliberate rest prompt makes them readable environmental landmarks while reusing the dungeon's established one-turn action loop.

## What Changes

- Replace the single campfire sprite with a subdued red, orange, and white multi-frame idle animation that loops at the hero idle cadence.
- Show an in-world Campfire popup when the player bumps an adjacent campfire. It presents the body text `You may rest one turn` and a `Rest` button.
- Make `Rest` dispatch exactly one ordinary wait turn, then dismiss the menu.
- Dismiss an unanswered campfire menu when the player makes a move in a different cardinal direction, without consuming a turn solely for dismissing it.
- Reuse the existing world-popup placement behavior so the menu remains within the game view and avoids the campfire and player grid spots.

## Capabilities

### New Capabilities

- `campfire-resting`: Animated campfire presentation and the player-initiated rest interaction.

### Modified Capabilities

- `dungeon-turns`: Add campfire bump interactions and specify that confirmed resting resolves as one turn.
- `tooltip-presentation`: Extend the in-world popup placement contract to the interactive campfire menu.

## Impact

- Affects campfire art assets, Babylon Lite sprite atlas/frame selection, world interaction state, and React world-overlay UI.
- Affects focused domain, animation/rendering, and popup-placement tests; a focused muted Playwright check is useful during apply because the feature is browser-visible and interactive.
- Adds no dependencies or external APIs.
