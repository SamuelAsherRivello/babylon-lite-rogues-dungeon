# Design

## Context

`world-procedural-system.ts` currently owns all enemy decisions inside `enemyPhase`. `Enemy` persists awareness, a cooldown, and heading. The project already provides `findCardinalPath` in `game/a-star.ts`, backed by the installed `@esengine/pathfinding` package.

## Goals / Non-Goals

**Goals:**

- Keep enemy decisions pure, deterministic, serializable, and separate from React and rendering.
- Make routing, collision outcomes, and state transitions independently testable.
- Keep each eligible enemy to one action per accepted player turn.

**Non-Goals:**

- Add target memory, investigation, patrol, flee, ranged attacks, new enemy types, or browser-visible AI controls.
- Change player movement, combat values, awareness tuning, or tactical turn cost.

## Decisions

### Persist a narrow AI state

Add a compact `ai` record to `Enemy` with state, target identity, and existing scheduling data retained in the entity. States are `idle`, `pursue`, `attack`, and `blocked`. New enemies begin idle. Migration normalizes enemies without this record to idle so existing campaign data remains playable.

This persists only data that can affect a later turn or save restore. It does not retain a last-known player position because the confirmed behavior returns to idle on lost awareness.

### Separate planning from resolution

Create a domain-only enemy AI module that accepts a campaign snapshot and returns typed intents. `enemyPhase` remains the coordinator: it builds the snapshot, gets intents, applies them in ascending enemy ID order, emits existing combat/resource events, and runs death handling.

The split prevents earlier mutations in an enemy phase from changing later enemies' decisions. It also makes state transitions testable without renderer or session setup.

### Route with the existing cardinal path helper

Pursuit calls `findCardinalPath` with terrain and the snapshot's occupied cells. It uses the first step only. Cardinal paths prevent diagonal corner cutting by construction. The path search receives a fixed node or distance limit so a 100 by 100 floor cannot create unbounded work per enemy.

The first implementation must set the limit as a named tuning constant and test both a route within the limit and an unreachable target. A future performance change can use a per-phase shared distance field without changing state or intent contracts.

### Resolve collisions deterministically

The resolver maintains a reservation set seeded from snapshot occupants. It releases an actor's origin when resolving that actor, permits a destination only once, and rejects swaps or moves into occupied cells unless a later explicit rule allows them. A rejected route intent changes the actor to `blocked` and does not move it.

Stable ID ordering makes same-state, same-position saves replay identically. This replaces the current implicit dependency on entity-array order.

### Cooldown policy

Cooldown advances after a resolved attack or successful move. A blocked or idle result does not spend an action cooldown. This makes a newly opened route usable on the next accepted player turn rather than forcing a second delay.

## Risks / Trade-offs

- [Many pursuing enemies run path searches in one turn] → Bound the search and cover dense-floor behavior with focused tests.
- [Saved enemies lack AI state] → Normalize the state during existing campaign migration and preserve all other enemy fields.
- [Reservation rules can create clumps] → Make blocked behavior explicit now; defer cooperative movement rules until a concrete enemy behavior needs them.
- [Existing tests assume direct diagonal movement] → Replace only assertions that conflict with the new cardinal-routing contract and retain cooldown, damage, and one-action coverage.

## Migration Plan

1. Extend enemy normalization to add an idle AI record for legacy or malformed state values.
2. Save the normalized state through the existing campaign autosave path.
3. If rollback is required, tolerate the persisted AI record in migration while returning enemies to the legacy decision branch.
