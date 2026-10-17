# Tasks

## 1. Replace permanent tint with event projection

- [x] 1.1 Remove the permanent green-tint layer and its renderer wiring; verify the focused page test no longer finds any permanent world tint.
- [x] 1.2 Project committed Health and Mana `resource.changed` events into bounded transient UI state, including event IDs, requested color mapping, simultaneous events, and session cleanup; verify focused Node tests cover Health loss, Health gain, and both Mana directions.

## 2. Render the rectangular resource wave

- [x] 2.1 Pass transient resource effects into the main Babylon world view and render one non-interactive, main-view-only rectangular overlay per effect; verify renderer and page tests cover no minimap or HUD overlay.
- [x] 2.2 Add the 350-millisecond, single-run pixel-aligned rectangular shape-1-to-shape-2 contraction and fade CSS animation; verify focused tests assert its color variants, direction, timing, and pointer behavior.

## 3. Verify integration

- [x] 3.1 Run one muted Edge Playwright check that causes a Health or Mana change and confirms the pulse appears then expires without covering the HUD or minimap.
- [x] 3.2 Run `npm test` and `npm run typecheck`; record results and resolve regressions attributable to this change.
- [x] 3.3 During finalization, run the applicable full browser suite and confirm a fresh reload has no permanent tint while resource pulses remain transient.

## 4. Refine pulse semantics and visual weight

- [x] 4.1 Suppress Mana-loss pulses while retaining red Health loss, green Health gain, and purple Mana gain; verify a Heal action projects only green.
- [x] 4.2 Render the shape-1-to-shape-2 pulse as a 650-millisecond thick, soft-edged rectangular wave with a separate 1,000-millisecond fade; verify focused tests cover both timings and visual weight.
