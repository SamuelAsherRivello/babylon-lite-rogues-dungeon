# Design

## Context

The current Babylon Lite renderer loads one `Idle/Down/00.png` file as `texturePaths.hero`, creates a one-cell actor atlas, and places the player at `[x * 32 + 16, y * 32 + 16]` with a 32x32 sprite. The supplied Hero Warrior assets are individual PNG frames: `Idle`, `Run`, and `Attack` have Down/Side/Up sequences, while `Death` has six non-directional frames. Directional frames are 32x48 and Death frames are 48x48. The project uses nearest filtering, shared texture/engine lifetime management, and renderer-neutral world coordinates.

## Goals / Non-Goals

**Goals:**

- Create a reusable image-animation entity for characters and other sprite-based uses.
- Support both grid-based sprite sheets and ordered individual image frames.
- Provide animation listing, selection, start/stop state, frame progression, and `loopCount` semantics.
- Use the generic system for the complete Hero Warrior catalog while initially rendering the player with Idle.
- Keep feet anchoring independent from collision, movement, saves, and procedural map generation.

**Non-Goals:**

- Do not redesign combat, movement, collision, save data, Tiled map data, or enemy actors.
- Do not invent directional Death art or require gameplay triggers for Attack and Death in this change.
- Do not add a renderer fallback, dependency, or music/sound behavior.
- Do not make animation playback mutate an actor's logical position or turn-based game state.

## Decisions

### Generic playback core with asset-specific catalogs

Implement a reusable animation entity and playback API that accepts either a sprite-sheet descriptor or ordered frame-image descriptors. Character catalogs such as Hero Warrior data register animation names and metadata with that core. This supports future characters, particles, props, and UI effects without embedding Hero-specific conditionals. A Hero-only system was rejected because the user explicitly wants character and other image-based sprite uses.

### Loop count means additional repeats

Store `loopCount` per animation: `-1` means infinite looping, `0` means one complete play, and a positive value means that many additional repeats after the initial play. Completion stops finite animations and exposes a completed state; explicit stop also halts frame advancement. This matches the requested semantics and avoids ambiguous separate boolean/count settings.

### Entity state is visual and lifecycle-owned

An animation entity owns current animation, frame index, playback state, elapsed timing, completion, and loaded visual resources. It does not own world coordinates, collision, combat, or save state. The actor or renderer owns the entity and disposes it with the actor lifecycle. This preserves the existing renderer-neutral world model and keeps animation reuse safe for non-character sprites.

### Shared loading and nearest sampling

Use the existing shared texture acquisition/release path for all image sources, and retain nearest filtering and no mipmaps. Sprite-sheet sources use declared grid dimensions; individual-frame sources retain their supplied ordering and dimensions. Textures are loaded once per shared engine and released only when no entity references them. A one-texture-per-frame render loop was rejected because it would add avoidable startup and runtime churn.

### Hero presentation and feet pivot

The Hero Warrior adapter registers `Idle`, `Run`, `Attack`, and `Death` with their directional variants and frame counts. Initial player state selects Idle with a stable default direction. The renderer places each frame's bottom center on the bottom edge of the player's 32x32 cell, allowing 32x48 and 48x48 art to extend upward. The minimap renders only the logical player marker.

### Verification layers

Pure animation-system tests cover source validation, animation listing, start/stop, unknown names, frame progression, completion, and loop counts of `-1`, `0`, and positive values. Hero catalog tests cover every supplied frame and adapter registration. Renderer tests cover resource cleanup, feet anchoring, unchanged logical coordinates, and minimap consistency. One focused Playwright run with `?mute=1` confirms the visible Hero Warrior; full applicable coverage remains finalization work.

## Risks / Trade-offs

- [Risk] Supporting two source formats increases metadata branches. → Mitigation: normalize both into one ordered frame-sequence contract before playback.
- [Risk] Individual frame textures increase startup work. → Mitigation: share texture promises and release references through entity lifecycle cleanup.
- [Risk] A frame may use different transparent padding or visual foot position. → Mitigation: keep the pivot explicit and validate representative frames without changing logical coordinates.
- [Risk] Attack and Death may remain visually unused until gameplay events exist. → Mitigation: keep them registered and directly selectable, and document those triggers as deferred.

## Migration Plan

No save or map migration is required. Add the generic system, register the Hero catalog, replace the static player texture path, and retain existing player coordinates. Run focused tests, the browser check, and final suite. Rollback is a source revert that restores the one-image hero path; supplied assets remain compatible and need no destructive transformation.

## Open Questions

None that change the specified behavior or implementation boundary. Exact frame timing may be tuned during apply from visual inspection while preserving the source formats and loop semantics.
