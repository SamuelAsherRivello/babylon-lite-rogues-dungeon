# Proposal

## Why

The renderer currently recalculates and rewrites static terrain and wall sprites every animation frame, and keeps landed combat particles for an hour.  This makes large floors cost CPU and GPU work that does not improve the visible scene and leaves the renderer poorly prepared for per-cell fog and lighting.

## What Changes

- Compile static tile selection, including Wang/autotile results, when a floor is created or its static geometry changes rather than during rendering.
- Render the game view from camera-culled static chunks while preserving world depth, camera behavior, and pixel-perfect output.
- Draw only visible dynamic objects and animate only visible animated visuals; retain correct world simulation while offscreen.
- Replace the asset-heavy minimap presentation with a compact semantic cell vocabulary derived from the same world coordinates.
- Keep landed combat marks as independent decals that fade and remove after ten seconds.
- Establish separate fog-discovery and continuous-light mask inputs so future per-cell visibility and lighting do not invalidate static terrain chunks.

## Capabilities

### New Capabilities

- `world-renderer-performance`: Efficient static-world caching, culling, and independently expiring combat decals for the dungeon renderer.

### Modified Capabilities

- `world-map-rendering`: Game view and minimap presentation acquire visible-cell culling, semantic minimap output, and future visibility/light-mask compatibility.

## Impact

Affected systems include world render-model generation, Babylon Lite sprite layers, camera visibility calculations, minimap drawing, particle lifecycle, and renderer-focused tests. No renderer fallback or new runtime dependency is introduced.
