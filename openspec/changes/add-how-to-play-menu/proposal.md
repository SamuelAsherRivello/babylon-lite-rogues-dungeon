# Proposal

## Why

Players can open Settings but have no concise in-game explanation of Rogue's Dungeon rules, controls, progression, and saving. A tabbed help dialog gives players this reference without leaving the current menu or advancing game time.

## What Changes

- Add a `How To Play` action to the Settings dialog on both the main menu and active game screen.
- Open a second modal dialog titled `How To Play` above Settings, leaving Settings visible and usable again after the help dialog closes.
- Provide seven top-aligned topic buttons: Basics, Combat, Exploration, Items and gear, Abilities and stamina, Progression, and Saving and controls.
- Display one selected topic at a time with 10 to 100 words of game-specific guidance.
- Preserve existing Settings actions, the current game state, and turn timing while either dialog is opened or closed.
- Add focused automated coverage for the Settings entry point, dialog layering, topic selection, and help content.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pixel-game-presentation`: Extend the Settings flow with the nested How To Play reference dialog and its accessible topic navigation.

## Impact

- Affected UI: `rogues-dungeon/src/game/windows/settings-window.tsx`, a new game-window component for the help dialog, `rogues-dungeon/src/game/game.tsx`, and `rogues-dungeon/src/ui/style.css`.
- Affected verification: focused page tests and a Playwright browser test for player-visible dialog behavior. Playwright adds useful evidence because the change depends on modal stacking and interactive tab selection.
- No changes to domain rules, save data, Babylon rendering, APIs, or dependencies.
