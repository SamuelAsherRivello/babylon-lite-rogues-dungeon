# Design

## Context

See `proposal.md` for motivation and `specs/world-resource-change-effects/spec.md` for behavior. The game already publishes committed `resource.changed` events with resource, previous, current, and an event identity. The React game boundary subscribes to those events, while `BabylonWorld` renders non-authoritative overlays over the main dungeon canvas. The current green-tint layer is a permanent overlay in that renderer path.

## Goals / Non-Goals

**Goals:**

- Project Health and Mana event deltas into transient presentation effects.
- Keep the effect inside the main world view and independent of game-state mutation.
- Support multiple distinct events in one committed result, such as Heal spending Mana while restoring Health.

**Non-Goals:**

- Changing resource calculations, events, saves, audio, meter-fill animation, camera shake, floating text, or minimap rendering.
- Adding a post-processing shader or a WebGPU renderer dependency.
- Adding pulses for Stamina, Offense, Defense, or XP.

## Decisions

### Project events at the React boundary

The game subscription will convert each committed Health `resource.changed` event and each Mana-gain event into a small transient effect record keyed by event ID. Mana-loss events deliberately create no record, so a Heal action that spends Mana while restoring Health emits only its green Health-gain effect. The record contains only presentation data: ID, color, and start time or animation lifetime. Timers remove records after the 1,000-millisecond fade completes and are cleared when a session ends.

This keeps the game rules and save format unchanged. It also follows the existing floating-feedback and resource-gain projection pattern. Projecting inside the procedural system would couple authoritative rules to CSS presentation.

### Render CSS rectangular outlines over the main world view

`BabylonWorld` will receive the transient effect records and render an inert overlay element for each main-view effect. CSS will draw a thick, soft-edged rectangular band, animate it from the outer shape 1 to the inner shape 2 in 650 milliseconds, and fade it to transparent over a separate 1,000 milliseconds. The band will use a pixel-aligned border, glow, and `pointer-events:none`.

The overlay keeps the effect independent of Babylon Lite draw state and automatically matches the world-view bounds at every zoom. Rendering through the existing permanent shader layer would require a persistent layer model and makes removal timing less direct. A canvas or WebGPU post-effect is unnecessary for a single border animation.

### Map event direction to color

Health events use red for a lower current value and green for a higher value. Only Mana gains use purple. Mana losses and events with no current-value change create no effect.

### Delete the test tint as part of the same renderer change

The permanent `gameViewShaderSystem` layer, its renderer invocation, CSS selector, and green-shader assertion will be removed. The focused page test will instead assert that resource effects are projected and main-world-only.

## Risks / Trade-offs

- [Several resource events may arrive in one commit] -> Render one overlay per event so Health and Mana feedback are not lost; overlapping outlines may briefly blend.
- [A short pulse can be missed at low frame rates] -> Use a 650-millisecond contraction and a 1,000-millisecond fade so its visual weight persists after the shape motion ends.
- [A border could cover world interaction] -> Keep it non-interactive and above only the main canvas, never the minimap or HUD.
- [Stale effects can survive a session switch] -> Clear the transient effect state and timers with the existing session cleanup paths.

## Migration Plan

1. Remove the permanent green layer and its test coverage.
2. Add event projection, world-overlay rendering, CSS animation, and focused tests.
3. Run one muted Edge Playwright check that triggers a Health or Mana change and verifies the pulse appears without HUD or minimap coverage.
4. Run the applicable broader browser suite during finalization.
