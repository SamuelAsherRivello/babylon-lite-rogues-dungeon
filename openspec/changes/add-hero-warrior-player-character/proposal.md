# Proposal

## Why

Rogue's Dungeon currently renders the player with a single 32x32 idle image even though the repository already contains a complete Hero Warrior frame set. Integrating that supplied character now gives the player a readable, animated identity while preserving the existing grid-based movement and world coordinates.

## What Changes

- Add a maintained Hero Warrior animation catalog for the supplied `Attack`, `Death`, `Idle`, and `Run` animation folders, including their directional variants and frame counts.
- Add a reusable `sprite-sheet-animation-system` for character and other image-based sprite animations, supporting animation entities, animation listing, start/stop controls, sprite sheets, and ordered individual frame images.
- Define `loopCount` consistently: `-1` loops forever, `0` plays once, and positive values specify additional repeats.
- Use the existing 32x48 directional frames and 48x48 non-directional frames at nearest filtering, with a documented feet/pivot rule that anchors the bottom of the character to the player's 32x32 world cell while allowing the upper body to extend above the cell.
- Replace the player's single static hero texture with the catalog-backed idle animation, initially using the existing player position and a stable default facing direction.
- Expose animation selection through the actor/rendering boundary so movement, attack, and death behavior can use the supplied animations without discarding any frames; gameplay triggers not yet represented by current game events remain explicitly deferred.
- Preserve the current 32-unit world grid, camera behavior, minimap/player-coordinate consistency, Babylon Lite WebGPU-only renderer, nearest sampling, lifecycle cleanup, and unrelated working-tree changes.
- Add focused catalog, animation-selection, anchoring, renderer, and browser-visible verification coverage plus asset provenance links/documentation.

## Capabilities

### New Capabilities

- `sprite-sheet-animation-system`: Provide reusable image-animation entities, source loading, playback controls, animation listing, and finite or infinite looping.
- `hero-warrior-animation`: Provide the Hero Warrior's complete animation inventory, directional selection, timing/loop metadata, and feet-anchored player presentation.

### Modified Capabilities

- `world-map-rendering`: The player actor presentation changes from a single static image to a catalog-backed animated sprite while retaining the same world-cell coordinate in both game and minimap views.

## Impact

- Affected renderer and world-model integration: `rogues-dungeon/src/systems/rendering/babylon-render-system.jsx` and `rogues-dungeon/src/systems/rendering/world-render-system.js`, plus a character-specific catalog/state module and focused tests.
- Affected animation architecture: a generic sprite-sheet/frame-list animation module used by the Hero Warrior adapter and available to future character or image-based actors.
- Affected runtime assets under `rogues-dungeon/public/assets/Characters/Hero_Warrior/Frames/`; the existing supplied frames are already present and should remain unmodified unless a runtime-safe copy or metadata file is required.
- Affected asset provenance documentation, which must identify the supplied Dungeons-and-Pixels pack and avoid asserting an unverified license.
- Browser verification is useful because the requested result is visible and depends on sprite size, nearest sampling, animation playback, and feet alignment; proposal work will not launch Playwright, while apply/finalization should include the repository's `?mute=1` browser checks.
- No new dependency, map format, save-data field, or player grid-coordinate change is intended.
