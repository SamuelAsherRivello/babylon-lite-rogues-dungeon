# Design

## Context

The current Babylon Lite renderer loads one `Idle/Down/00.png` file as `texturePaths.hero`, creates a one-cell actor atlas, and places the player at `[x * 32 + 16, y * 32 + 16]` with a 32x32 sprite. The supplied Hero Warrior assets are already present under the runtime asset tree: `Idle`, `Run`, and `Attack` each have Down/Side/Up sequences; `Death` has six frames without directional subfolders. Directional frames are 32x48, while Death frames are 48x48. The project uses nearest filtering, shared texture/engine lifetime management, and renderer-neutral world coordinates.

## Goals / Non-Goals

**Goals:**

- Make the complete supplied Hero Warrior inventory available from a character-specific catalog.
- Render the initial player as an animated idle character while preserving the existing player grid coordinate and camera/minimap contracts.
- Keep feet anchoring independent from collision, movement, saves, and procedural map generation.
- Provide pure catalog/selection tests and one focused browser check for the visible oversized sprite.

**Non-Goals:**

- Do not redesign combat, movement, collision, save data, Tiled map data, or enemy actors.
- Do not invent directional Death art; Death remains a single six-frame sequence unless supplied data changes.
- Do not add a renderer fallback, dependency, or music/sound behavior.
- Do not force Attack or Death triggers into gameplay before corresponding player events exist; expose and document those paths instead.

## Decisions

### Character catalog is data, not renderer conditionals

Add a small character-specific module that declares each animation's frame paths, frame dimensions, direction support, frame count, loop/completion behavior, timing, display size, and feet pivot. The renderer consumes this catalog rather than encoding Hero Warrior paths in separate branches. This keeps all supplied animations testable and makes future character replacement local. A sprite-sheet-only implementation was rejected because the supplied files are individual frames with different dimensions and directory shapes.

### Use shared loaded textures with per-frame sprite handles

Load the referenced PNGs through the renderer's existing shared texture acquisition/release path and create atlas/handle data that can update the player's current frame. Preserve nearest filtering and no mipmaps. Avoid one texture load per render frame; preload the catalog once during renderer setup and release all acquired textures and atlases during cleanup. The existing one-image hero setup will be replaced at the actor boundary, while enemy and item loading remains unchanged.

### Keep logical position at the cell center and apply a feet pivot for display

WorldRender continues to expose the player at its integer cell. The game renderer derives the character's display position from that cell and the declared frame size, placing the frame's bottom center on the cell's bottom edge. This deliberately permits the top of a 48-pixel frame to extend above the cell. The minimap uses the logical player marker only, so animation size cannot alter camera, collision, or minimap geometry. A larger collision cell or a change to player coordinates was rejected because it would change game rules.

### Use a pure selection function for animation reachability

Provide a pure selection seam taking animation name, direction, and optional action state, returning the validated frame sequence and fallback behavior. Initial state is `Idle` with a stable default direction. Existing movement/attack/death events should be mapped only where their current contracts support it; otherwise tests call the seam directly and documentation records the deferred trigger. This keeps animation policy out of procedural-generation rules and avoids coupling render timing to turn advancement.

### Verification layers

Catalog validation covers every file, dimension, frame count, direction, and loop/completion declaration. Renderer-focused tests cover initial idle selection, frame changes, feet anchoring, disposal, and unchanged logical coordinates. The existing browser suite gets one focused `?mute=1` check after the implementation group to confirm the Hero Warrior is visible, taller than one grid cell, and remains feet-aligned while the player moves. Full applicable tests remain finalization work.

## Risks / Trade-offs

- [Risk] Individual frame textures increase startup work compared with one static image. → Mitigation: share texture promises, preload once per renderer engine, and release references on disposal.
- [Risk] A frame may use a different transparent padding or visual foot position. → Mitigation: validate dimensions and inspect representative frames; keep the pivot explicit in the catalog so corrections do not alter logical coordinates.
- [Risk] The minimap could accidentally render the oversized game sprite. → Mitigation: keep player geometry logical in `WorldRender` and use a marker-only minimap path with a focused consistency test.
- [Risk] Attack and Death may appear inert until gameplay events are added. → Mitigation: expose all sequences through the tested selection API and list deferred triggers in documentation/results.

## Migration Plan

No save or map migration is required. Replace the renderer's static hero resource with the catalog-backed actor, retain the existing player coordinates, run focused tests and the browser check, then run the full applicable suite. Rollback is a source revert that restores the one-image hero path; the supplied asset files remain compatible and need no destructive transformation.

## Open Questions

None that change the specified behavior or implementation boundary. Exact animation timing may be tuned from visual inspection during apply without changing the catalog contract, provided all four animation groups and their frame inventories remain intact.
