# Design

## Context

The Babylon world renderer currently represents pickups as paired main-art and shadow sprites through the shared character-sprite helper. Potions already apply a main-art-only -8px visual anchor, while their shadow remains at ground contact. See `proposal.md` for motivation and the pickup-animation delta for behavior.

## Goals / Non-Goals

**Goals:**

- Add a reusable renderer-only oscillation calculation that can be opted into per pickup type.
- Render Health and Mana potion main art with a smooth 1.5px vertical offset around its existing anchor over a 2.4-second cycle.
- Preserve ground contact and depth ordering while narrowing the shadow as the potion rises.

**Non-Goals:**

- Animate every pickup or change pickup game-state data, collection rules, UI-transfer timing, or minimap presentation.
- Add new art, gameplay effects, configuration UI, or a fallback renderer.

## Decisions

- Define a small pure oscillation helper in the animation system that maps time, amplitude, and period to a smooth vertical offset. A sine wave gives continuous motion and deterministic unit tests; manually updating per-pickup animation state would add lifecycle work without a gameplay need. Health and Mana potions use a 1.5px amplitude and a 2.4-second period.
- Keep the opt-in selection near world-object sprite presentation so a newly added pickup type remains stationary unless explicitly assigned oscillation behavior. This satisfies the requirement that animation is not universal.
- Store Key's fixed -8px main-art anchor and 50% shadow width and height in the same presentation metadata without an oscillation amplitude. This keeps the grounding and oscillation decisions independent.
- In the Babylon game-view update loop, add the helper's offset only to `pickup.main.handle` after the shared paired-sprite update. Keep the shadow position and depth calculation based on the original world position, but reduce shadow width from its normal size in proportion to upward lift. This reuses the existing potion anchor and maintains depth stability.
- Do not apply oscillation in the minimap. Its low-resolution geometry remains static and avoids a presentation effect that is too small to be useful.

## Risks / Trade-offs

- [Frame-timing differences could make motion inconsistent] -> Calculate the offset from the renderer clock, not accumulated per-frame state.
- [Lift-linked shadow scaling could accidentally shift the shadow or depth] -> Cover the helper and integration contract with focused tests, and visually verify a potion in the game view.
- [Future pickup types may accidentally animate] -> Make the selection opt-in and test stationary defaults.

## Migration Plan

No saved-state or content migration is required. The change is renderer-only and can be rolled back by removing the opt-in presentation mapping.
