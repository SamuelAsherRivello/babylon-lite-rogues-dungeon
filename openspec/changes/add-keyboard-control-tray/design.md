# Design

## Context

The current desktop status bar is rendered by `StatusBar` in
`rogues-dungeon/src/game/Game.jsx` and uses `.desktop_status` and
`.status_shortcut` styling in `rogues-dungeon/src/ui/style.css`. Gameplay input
is already centralized in `Game.jsx` and the keyboard-input module, while
ability bindings are resolved by the existing game session. See the proposal
and keyboard-control-tray spec for the user-facing contract.

## Goals / Non-Goals

**Goals:**

- Add one React-owned tray state shared by the status bar and its panel.
- Reuse the existing physical keyboard input semantics; keycaps are visual
  indicators and are not mouse controls.
- Keep the tray positioned within the viewport shell and compatible with the
  existing fullscreen layout.
- Make the 0.25-second transform and opacity transition deterministic and
  testable.

**Non-Goals:**

- Changing movement, sprint, ability, or turn-resolution rules.
- Adding a new input manager, persistence setting, sound effect, or mobile
  control mode.
- Adding key-state legends or a second SHIFT control.

## Decisions

1. **Keep tray state in the existing game-shell React layer.** The tray is a
   presentation and input affordance attached to `StatusBar`, so a local
   `expanded` boolean is sufficient. Persisting it would make the compact HUD
   state less predictable and is not required by the spec.

2. **Use an explicit shortcut model for both render modes.** A small ordered
   data structure will define the four expanded rows and their key labels. The
   collapsed summary can use its own exact presentation data, while a shared
   `InputKey` component renders every keycap without pointer activation and
   provides its hover description.

3. **Keep action input on the physical keyboard.** Movement and ability keys
   continue through the existing keyboard handlers. The not-yet-defined quick
   and More controls log physical key presses without dispatching gameplay
   actions until their behavior is added; clicking any keycap does nothing.

4. **Animate with CSS state classes.** The extended layout wrapper will
   transition its transform, carrying the top tab with it, while the collapsed
   controls transition opacity between explicit collapsed and expanded values.
   A CSS transition of `250ms` will provide the requested timing; reduced-motion
   users should receive an immediate equivalent state.

5. **Verify browser-visible behavior with one focused Playwright check.** The
  check will assert both render states, tab toggling, the centered `Input`
  heading, hover descriptions, non-clickable keycaps, and the transition
  duration/style. Broader browser coverage is
   reserved for finalization.

## Risks / Trade-offs

- [Risk] The expanded tray can cover a small amount of world content. → Keep it
  anchored to the status-bar edge, within the viewport, and treat the tray as
  primary HUD UI rather than gutter content.
- [Risk] A visual keycap could accidentally trigger world input. → Render keys
  as non-interactive `kbd` elements and keep the renderer's input handlers
  scoped away from the UI layer.
- [Risk] Existing tests assert the old status-bar JSX shape. → Update focused
  source-shape assertions and add browser evidence for the new contract.
