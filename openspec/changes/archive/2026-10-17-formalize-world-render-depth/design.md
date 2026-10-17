# Design

## Context

See `proposal.md` for motivation. The current Babylon renderer creates separate sprite layers for terrain, walls, props, effects, enemy variants, and the player. Each layer enables Y sorting, but their fixed layer order prevents walls and independent entity layers from participating in one cross-layer depth order. `CharacterSprite` already groups a main handle and a shadow handle for player, enemies, and barrels.

## Goals / Non-Goals

**Goals:**

- Give every shadow-bearing world visual the same composite entity contract.
- Define one depth key and one deterministic tie-break policy for world visuals that can overlap.
- Preserve the documented trigger, particle, reticle, minimap, and debugging behavior.

**Non-Goals:**

- Change collision, turn resolution, map coordinates, source art, camera rules, or WebGPU support.
- Add new enemies, props, effects, or a depth mode selected by the player.

## Decisions

### Use a renderer-neutral world-depth entry list

Build each frame's shared world pass as entries with an identity, a ground-contact pixel Y, and a category tie-break. Sort by Y, then category, then stable identity. Apply the resulting draw order to Babylon layers or handles. This replaces reliance on the construction order of separate atlas layers.

Using an entry list keeps the sort policy testable without a GPU and allows all atlas types to interleave. Keeping one static layer per atlas was rejected because it cannot make a wall and a character from different layers compete by Y.

### Treat composite visuals as one render entity

Use the existing `CharacterSprite` pattern for player, rat, skeleton, and barrel. Each entity computes one presented position and depth key. Its shadow receives the base order, then its main sprite receives the next order. Main art uses its visual foot position for the entity's ground-contact coordinate, including taller skeleton and hero frames.

Rendering shadow and main as unrelated entries was rejected because movement, hiding, and ordering could diverge between the two children.

### Keep base terrain and floor decals outside the shared pass

Walkable terrain remains the first pass. Floor triggers and later floor decals remain above terrain and below world-depth visuals. They can have a stable internal order but do not compete with walls, objects, or characters.

Adding terrain and decals to the depth list was rejected because it can make a nearby world item reveal or cover an otherwise continuous floor tile.

### Define the depth-anchor and exception rules directly

Walls use their visible front or ground-contact edge. Props, pickups, stairs, barrels, characters, and moving projectiles use their current ground-contact position. Same-position ties are deterministic, with an entity shadow before its main sprite. Screen-space UI, reticles, tooltips, diagnostics, and pivot markers remain an overlay. Effects that promise a fixed owner-relative depth, such as Heal, derive order from the owner rather than their independent world Y. The minimap shares world data but keeps its simplified visual policy.

Using sprite centers would make tall frames overlap incorrectly. Sorting all effects by their world Y would break the existing Heal guarantee.

## Risks / Trade-offs

- [A Babylon Lite layer cannot express the required interleaving] -> Keep the renderer-neutral list as the authority and map each ordered entry to bounded per-entry layers or handles.
- [Sub-grid motion produces unstable equal-depth ties] -> Use stable entity IDs after category order and test repeated frames at equal Y.
- [Existing dirty renderer work already changes entity composition] -> Preserve unrelated edits and adapt the implementation to the current working tree rather than reverting it.
- [A visual regression appears only at runtime] -> Run focused renderer tests, one muted automated browser check, and the documented human playtest after implementation.

## Migration Plan

1. Add and test renderer-neutral entry and depth-key helpers.
2. Route existing player, enemy, barrel, wall, prop, pickup, stair, and effect drawing through the pass policy without changing campaign data.
3. Run focused checks and one muted automated browser check.
4. Run the human playtest against the verified project server after apply.

Rollback restores the existing renderer ordering. No saved campaign migration is required because render entries are derived from current floor state.
