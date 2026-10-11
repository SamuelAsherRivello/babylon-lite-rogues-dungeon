# Tasks

## 1. Floor geometry and corridor masks

- [x] 1.1 Add deterministic room edge-socket selection that excludes every room corner, and verify generated sockets remain inside valid room boundaries across seeded floors.
- [x] 1.2 Replace center-to-center one-cell carving with width-aware horizontal and vertical corridor sweeping, and verify widths one, two, and three preserve connected walkable paths.
- [x] 1.3 Derive a presentation ground mask and a blocked wall-boundary mask from the authoritative binary floor, and verify exposed corridor sides, bends, room openings, and intersections have the expected boundary cells.
- [x] 1.4 Add focused dungeon tests for corridor width, socket placement, connectivity, corner avoidance, wall adjacency, sparse deep space, and seed determinism.

## 2. Wang world rendering

- [x] 2.1 Extend the renderer-neutral world model to emit separate ground and wall entries with verified Wang role resolution and explicit unsupported diagnostics, and verify game/minimap coordinates are identical.
- [x] 2.2 Update Babylon Lite terrain layers to render Grounds before Walls, omit deep nonwalkable sprites, and preserve the existing diagnostic marker behavior for unsupported roles.
- [x] 2.3 Add focused renderer tests for one-, two-, and three-wide corridors, wall continuity around bends, room openings, intersections, and unsupported-mask omission.

## 3. Tiled repair contract

- [x] 3.1 Rename serialized tile layers to `Grounds` and `Walls`, split object layers into `Pickups` and `Decorations`, and verify layer names and types in exported TMJ data.
- [x] 3.2 Update repair validation and import to read grounds and walls independently, reject overlaps and malformed canonical layers, preserve recognized objects, and verify invalid repairs leave the active floor unchanged.
- [x] 3.3 Regenerate the seed-17 fixture and update the editable-bundle export, documentation, and Tiled guidance to describe the canonical layer contract and corridor width rules.
- [x] 3.4 Add focused map serialization tests covering canonical layers, walkability derived from Grounds, blocked Walls, object-layer placement, required markers, and repaired-map round trips.

## 4. Integration verification

- [ ] 4.1 Run one focused Playwright check with a deterministic map-fix URL and verify visible Grounds, rendered corridor Walls, sparse background, and the Map Fix controls.
- [x] 4.2 Run the applicable focused Node tests and production build, then run the full applicable suite during finalization and record any pre-existing browser or tooltip failures separately.
