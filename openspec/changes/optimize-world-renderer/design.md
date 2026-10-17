# Design

## Context

See proposal.md for motivation. The current Babylon Lite render loop creates a large render model and patches terrain and wall sprites every frame. Sprite layers are GPU-instanced, but many individual layers and offscreen dynamic updates still create CPU and draw overhead.

## Goals / Non-Goals

**Goals:** Compile floor-static tile decisions once; cull static chunks and live visuals by the camera; make the minimap semantic; expire individual landed decals after ten seconds; separate future fog and lighting data from static geometry.

**Non-Goals:** Implement the user-facing fog-of-war or directional lighting rules, change gameplay simulation for offscreen actors, alter camera semantics, or use a fallback renderer.

## Decisions

- Use a floor-keyed compiled static presentation model. Wang/autotile frame choice and immutable prop placement are computed once. This avoids full-frame tile decisions while allowing a future explicit static invalidation path.
- Partition compiled terrain/walls into fixed grid chunks and select intersecting chunks from camera bounds. One whole-floor cache is rejected because it scales GPU allocation with total floor area and does not cull large levels.
- Keep entities, animated pickups, torches, traps, and combat effects as dynamic overlays; cull their visual updates. Gameplay and turn processing remain independent of visibility.
- Use separate per-cell discovery and normalized light-intensity data as overlay inputs. Fog is expected to update relatively rarely and may be binary; lighting may update more frequently and remain continuous. Neither causes static chunk recompilation.
- Use a small minimap cell palette instead of gameplay PNG atlases. This retains shared geometry and prepares the minimap to honor future discovery state.
- Keep each landed combat decal as an individual record and layer/visual unit. It fades after landing and is removed at ten seconds; it is not baked or merged because independent lifetime is required.

## Risks / Trade-offs

- [Chunk seams or stale static cache] → Key cache entries by floor identity/static revision and validate chunk boundaries with terrain tests.
- [Culling misses edge sprites] → Expand visible bounds by one tile/chunk margin.
- [Future fog/light shader needs differ] → Keep masks as renderer-agnostic cell data and choose the compositing technique later.
- [Individual decals raise temporary layer count] → Cap only by natural ten-second expiry and cull offscreen visuals; do not batch their lifetime.

## Migration Plan

Introduce compiled presentation helpers with focused tests, replace the per-frame static patch loop, then move minimap and particles onto the new lifecycle. Existing camera and draw ordering tests remain regression coverage. Reverting the renderer change restores the prior live layers without data migration.

## Open Questions

The future light cone shape and fog visual style are intentionally deferred; both fit the mask boundary without changing this task breakdown.
