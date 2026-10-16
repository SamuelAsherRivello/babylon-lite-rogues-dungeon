# Design

## Context

The game currently resolves the full ability action in its pure world system, while the React game layer starts movement smoke effects after committed events and Babylon Lite renders them from real time. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Keep Mana commitment, pending ability effects, tactical completion, and target identity deterministic and testable outside React.
- Render the existing nine-frame smoke-poff asset in purple at ability-specific scale, position, and real-time lifetime.
- Keep independent ability cooldowns in the real-time presentation/session layer so ordinary gameplay remains responsive.

**Non-Goals:**

- Add new spell assets, extra abilities, random combat outcomes, a renderer fallback, or a global gameplay-input lock.
- Persist transient particles or cooldown timestamps across a reload.

## Decisions

### Pending ability actions bridge pure rules and presentation

An accepted cast immediately records Mana spend and a pending effect payload, including the original player position, completion time, and, for Wand, the chosen enemy ID. Completion dispatches a dedicated resolution action that applies the pending effect and then calls the existing tactical tick. This replaces immediate effect-and-tick resolution, preserving a deterministic core while letting the renderer run independently. Applying the effect only in React was rejected because saves, events, and combat state would no longer have a single authoritative owner.

### Wand follows an identity, not a coordinate

The renderer resolves the locked enemy's live position every frame. Resolution re-finds the same ID; a missing target is a harmless completion. Fixed-coordinate impact was rejected because it does not meet the selected moving-target behavior; retargeting was rejected because it changes combat intent after casting.

### Extend the shared particle contract

Particle data carries an ability presentation kind, source position, optional target ID, and visual scale parameters. Babylon Lite derives interpolation and scale from `performance.now()` using an effect-specific duration, sampling nearest frames and applying a purple color multiplier. Heal uses a hardcoded 554 ms lifetime (30% faster than the 720 ms ordinary smoke-poff), scales from 120% to 360%, and uses the player's render depth plus a fixed offset so it remains above the player instead of following normal y-depth sorting. This extends the existing world-particle route instead of adding a second animation renderer.

### Cooldowns are UI/session timing gates

The game session records the last accepted time for each ability and rejects requests for the same ability until one second has elapsed. The gate is checked before dispatch, does not enter campaign state, and leaves other action paths untouched. Campaign-persisted cooldowns were rejected because they are presentation-time behavior and would create reload-clock ambiguity.

## Risks / Trade-offs

- [Overlapping delayed abilities can complete in a different order from ordinary actions] -> Store explicit pending effects and resolve each by its own completion callback with focused ordering tests.
- [A target may disappear before Wand impact] -> Preserve target ID, render toward its live position while it exists, and resolve no damage when missing.
- [Real-time timers can outlive a run transition] -> Clear pending ability callbacks and transient particles when changing sessions or returning to the menu.
- [Browser timing is difficult to assert solely in unit tests] -> Add one focused Playwright check covering visible purple presentation and cooldown feedback after pure-logic tests.

## Migration Plan

1. Implement pending ability state and deterministic completion actions with focused tests.
2. Add particle variants, renderer interpolation, and cooldown feedback.
3. Run focused Node tests and one muted browser interaction check.
4. Roll back by restoring immediate ability resolution if a release issue appears; no saved-data migration is required because transient state is not saved.
