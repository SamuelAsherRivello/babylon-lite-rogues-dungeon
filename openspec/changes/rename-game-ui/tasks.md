# Tasks

## 1. Establish the UI module structure

- [ ] 1.1 Create lowercase-kebab-case screen, window, panel, card, control, and view modules; move presentational UI out of `Game.tsx` while keeping campaign state and dispatch ownership in `Game.tsx`; verify TypeScript resolves all imports.
- [ ] 1.2 Implement `menu-screen`, `game-screen`, `main-menu-window`, `settings-window`, and `level-up-window` roots with the current interactions and accessibility roles; verify save-slot selection, settings open and close, and level-up selection work in focused component or browser tests.
- [ ] 1.3 Extract the information, mobile-control, titlebar, statusbar, card, and drag-preview units into matching lowercase-kebab-case modules; verify the existing game tests pass.

## 2. Rename renderer views and selectors

- [ ] 2.1 Update the Babylon renderer host to expose `world-view` for the main dungeon and `minimap-view` for the minimap, including matching canvas, loading-message, tooltip, and feedback selectors; verify world and minimap canvases render without changing renderer options.
- [ ] 2.2 Replace legacy UI root selectors with semantic lowercase kebab-case selectors and convert named descendants to BEM `__` selectors; verify a repository search finds no obsolete renamed selector references.
- [ ] 2.3 Update responsive, animation, and state selectors to target the renamed roots without changing layout or interaction states; verify the TypeScript build and focused layout tests pass.

## 3. Update contracts and verify the browser UI

- [ ] 3.1 Update UI-facing tests to assert the semantic screen, window, and renderer-view names while preserving user interactions; verify the relevant unit and browser test files pass.
- [ ] 3.2 Run one focused Playwright check in Edge for the menu screen, settings window, game screen, world view, and minimap view; verify each expected root appears and settings can be closed.
- [ ] 3.3 Run the project typecheck and applicable test suite; record any unavailable browser capability and reserve the full browser suite for finalization.
