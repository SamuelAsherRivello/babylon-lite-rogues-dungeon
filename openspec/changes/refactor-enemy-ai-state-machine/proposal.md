# Proposal

## Why

Enemy behavior currently combines awareness, cooldown, movement, collision, and attacks in one turn-loop branch. Enemies cannot route around blockers, and adding enemy behaviors would make that branch difficult to change or test safely.

## What Changes

- Replace direct-vector enemy movement with a serialized, deterministic state machine.
- Give pursuing enemies bounded cardinal A* routing around terrain and occupied cells.
- Resolve enemy intentions from a turn snapshot and commit them in stable ID order with destination reservations.
- Preserve the current immediate loss-of-awareness behavior: an enemy returns to idle without searching or remembering the player's position.
- Migrate saved enemies that lack AI state into a valid idle state without discarding a campaign.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dungeon-turns`: Enemy action resolution gains explicit deterministic states, cardinal routing, collision handling, and loss-of-awareness behavior.

## Impact

- Affects the domain Enemy contract, campaign migration, procedural enemy creation, and tactical enemy phase.
- Reuses the installed `@esengine/pathfinding` dependency through the existing cardinal path helper.
- Adds focused domain and migration tests. A browser check is useful only as a focused movement-observation check after implementation; the full browser suite remains finalization coverage.
