# Proposal

## Why

The current Wang renderer has seed-specific corrections and generic fallbacks, so a new seed can produce visibly incorrect floor and wall tiles even when the underlying level is walkable. We need deterministic, hand-authored debug scenarios that isolate tile-join failures and let one edited Tiled map teach generalized rules instead of adding another seed-specific patch.

## What Changes

- Add named, deterministic manual-generation scenarios selected by a debug URL flag.
- Provide a scenario that deliberately exercises corridor widths, room joins, corners, and walkable/non-walkable boundaries.
- Export each scenario as an editable Tiled map using the same Grounds and Walls layers used by normal levels.
- Keep scenario generation separate from ordinary random dungeon generation and normal gameplay defaults.
- Compare one repaired scenario against its generated layers and use the differences to derive generalized Wang resolution rules.
- Make generated runtime rendering and generated Tiled exports use the same canonical tile-layer resolution.
- Add multi-seed and scenario regression checks for connectivity, layer semantics, and rendered tile consistency.

## Capabilities

### New Capabilities

- `manual-tile-render-scenarios`: Deterministic, named debug scenarios for isolating and repairing Wang tile-rendering cases.

### Modified Capabilities

- `world-map-rendering`: Generated and repaired maps use one canonical tile-layer resolver, with no silent arbitrary wall-face fallback for supported scenarios.

## Impact

- Affected generation, Wang autotiling, Tiled export/import, URL option parsing, runtime rendering, and focused game tests under `rogues-dungeon/src/` and `rogues-dungeon/test/`.
- Adds a debug-only URL surface; ordinary random seeds and save slots retain their existing gameplay behavior.
- No new runtime dependency is required. Playwright is useful for one focused browser check after implementation, but proposal work does not launch it.
