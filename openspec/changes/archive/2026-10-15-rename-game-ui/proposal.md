# Proposal

## Why

The game interface is assembled in a large `Game.tsx` file and uses mixed selector styles such as `saved_games`, `command_desk`, and `babylon_world`. That makes it hard to identify each visual unit and trace its code, markup, and styles.

## What Changes

- Extract the game UI into lowercase-kebab-case files and folders whose names describe the rendered unit.
- Define `menu-screen` and `game-screen` as the two top-level screens.
- Define `main-menu-window`, `settings-window`, and `level-up-window` as the modal or focused windows.
- Name the main dungeon renderer `world-view` and the minimap renderer `minimap-view`.
- Rename component root selectors to semantic kebab-case names and use BEM child selectors for named descendants.
- Preserve existing game actions, layout, save behavior, rendering, and accessibility behavior.
- **BREAKING** Rename internal CSS class names and React component import paths.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `source-organization-standards`: Define the UI file, folder, component-root, and child-selector naming convention.
- `pixel-game-presentation`: Retain the level-up selection as a named modal window instead of requiring its removal.

## Impact

- Affected code: `rogues-dungeon/src/game/`, `rogues-dungeon/src/systems/rendering/babylon-render-system.tsx`, `rogues-dungeon/src/ui/style.css`, and their tests.
- No dependency, save-data, URL, or gameplay-rule changes.
- A focused Playwright check will verify that the renamed menu, settings window, main world view, and minimap view remain available in the browser.
