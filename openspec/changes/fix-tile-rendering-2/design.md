# Design

## Context

See `proposal.md` for motivation. The current generator produces a semantic walkability grid, while the Wang renderer separately maps neighborhood masks to a small authored tileset. Exact mappings cover only a subset of masks; generated and exported maps can therefore diverge through generic fallbacks. The existing Tiled contract already separates one walkable Grounds tile from non-walkable Walls tiles and stores deterministic seed metadata.

## Goals / Non-Goals

**Goals:**

- Add URL-selectable, hand-authored deterministic scenarios without changing normal generation defaults.
- Resolve tile frames from one canonical layer builder used by runtime rendering and Tiled export.
- Make scenario repairs useful as generalized regression evidence instead of seed-specific conditionals.
- Keep semantic walkability independent from visual tile selection.

**Non-Goals:**

- Replacing the ordinary dungeon generator with a hand-authored generator.
- Adding an overworld generator or changing save-slot semantics.
- Automatically rewriting user-authored Tiled art.

## Decisions

### Named scenario registry

Maintain a small registry of scenario names to deterministic topology builders. URL parsing selects a scenario only when the debug flag and valid name are present; otherwise the existing seeded generator remains the source of the floor. Each builder returns the same floor model as normal generation, including start, exit, entities, semantic cells, and scenario metadata.

This is preferred over numeric-only flags because a name communicates the failure being tested and remains stable when scenarios are added.

### Canonical semantic-to-tile pipeline

Build one renderer-neutral tile-layer result from semantic cells. The result contains the single approved Grounds GID, resolved Walls GIDs, diagnostics, and the neighborhood mask for each cell. Runtime rendering and Tiled export share the same semantic cells and Walls result; repaired maps may override authored GIDs while retaining the semantic grid. Grounds remains deliberately single-tile as required by the map-editing workflow.

The resolver first uses exact Wang matches, then selects the closest compatible authored Wang pattern with cardinal edge agreement weighted above diagonal corner agreement. Ties are deterministic. Unsupported cases remain diagnostics rather than silently choosing an unrelated cardinal face.

### One repair cycle per scenario

The debug workflow exports one scenario at a time. A repaired map records its scenario name and is compared against the generated layer result. Differences become generalized mask rules or resolver fixtures, not branches keyed to a random seed.

### Validation strategy

Pure Node tests cover scenario determinism, path connectivity, layer non-overlap, exact generated/exported frame equality, repaired-map preservation, and a multi-seed sample. One focused browser check verifies that the named scenario URL opens in the game and that its editable-copy action produces the expected map.

## Risks / Trade-offs

- [Risk] A nearest Wang match can be visually plausible but semantically wrong at a corner. -> Mitigation: weight cardinal edges, require walkability/path checks, and keep the scenario repair comparison visible in diagnostics.
- [Risk] A scenario registry can grow into a second level-generation system. -> Mitigation: keep scenarios small, debug-only, and limited to tile edge cases; ordinary floors continue through the existing generator.
- [Risk] Authored repaired GIDs can mask a resolver regression. -> Mitigation: compare generated and repaired layers separately and test both paths.
