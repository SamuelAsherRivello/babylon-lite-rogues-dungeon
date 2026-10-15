# Design

## Context

`Game.tsx` contains both screen composition and many presentational components. Its JSX and `style.css` use mixed selector styles, while `BabylonWorld` uses one `babylon_world` class for the main renderer and minimap renderer.

## Goals / Non-Goals

**Goals:**

- Place the named screens, windows, panels, cards, controls, and renderer views in lowercase-kebab-case files and folders.
- Give each named rendered unit a matching semantic root selector.
- Use BEM child selectors for named elements inside a component root.
- Keep the existing UI behavior and state ownership intact.

**Non-Goals:**

- Change gameplay rules, persistence, WebGPU rendering, visual layout, or player controls.
- Add a CSS framework or change the current stylesheet architecture beyond the renamed selectors.

## Decisions

### Split by rendered UI unit

Move UI composition out of `Game.tsx` into files grouped by type: `screens`, `windows`, `panels`, `cards`, and controls. Preserve campaign state, callbacks, and reducer dispatch in `Game.tsx`; extracted components receive typed props. This gives each visible unit a stable filename without moving gameplay state into the UI layer.

Keeping every component in `Game.tsx` was rejected because it would not meet the requested filename naming model.

### Use semantic names at every UI boundary

Use `menu-screen` and `game-screen` for the two application states. Use `main-menu-window`, `settings-window`, and `level-up-window` for focused windows. Use `world-view` for the primary renderer and `minimap-view` for the minimap renderer, rather than reusing a renderer-library name.

The Babylon renderer continues to own rendering mechanics. Its React host accepts the view role and renders the corresponding semantic class, so the game UI decides meaning without duplicating renderer code.

### Use BEM for named descendants

Each component root uses a lower-kebab-case class. Named descendants append `__`, such as `main-menu-window__saved-game-list` and `world-view__canvas`. State and variants use `--`, such as `world-view--minimap`, where a shared structure is preferable to a separate root.

Flat global child selectors were rejected because they can collide as the game UI grows.

### Retain the level-up window

The current implementation pauses for a stat selection. Keep that behavior and rename the component and selectors as `level-up-window`; update the presentation requirement that incorrectly required level-up overlays to be removed.

## Risks / Trade-offs

- Renaming selectors can leave stale styles or break layout rules. → Search for obsolete selectors, build the project, and run focused browser checks.
- Moving components can introduce import cycles or change props. → Keep state and game actions in `Game.tsx` and use explicit typed props.
- Existing tests may assert legacy class names. → Update tests to assert the semantic names and preserved interactions.

## Migration Plan

1. Extract components and rename selectors in one change.
2. Update tests and run the focused checks.
3. Roll back by reverting the change if the rendered layout or interaction behavior regresses.
