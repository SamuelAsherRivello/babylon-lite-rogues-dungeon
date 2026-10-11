# Proposal

## Why

The current status bar exposes keyboard shortcuts as a small inline legend, but
it does not provide a focused control surface for players who need to discover
those actions. Add a fold-out keyboard tray that keeps the current status bar
compact when closed while making all twelve controls visible when opened.

## What Changes

- Add a fold-out keyboard-control tray inside a game-width region of the bottom
  status bar, with its tab attached to the top edge of the extended layout.
- Keep the collapsed state visually equivalent to the current status-bar
  layout plus a larger centered tab; the collapsed text is exactly:
  `Move WASD | Quick: A E | Abilities: 123 | More ZXC`.
- Add an expanded state titled `KEYBOARD CONTROLS` with four aligned rows:
  `Abilities: 1 2 3`, `Quick: Q W E`, `Move: A S D`, and `More: Z X C`.
- Render all twelve controls as individual, non-interactive keycaps in
  consistent columns. Only physical keyboard input performs actions; the tab
  alone controls expansion and collapse.
- Move the complete extended layout, including its attached top tab, over 0.25
  seconds and fade the collapsed status-bar controls from visible to hidden.
- Preserve the existing game palette, typography, status-bar placement, and
  fullscreen/windowed usability.

## Capabilities

### New Capabilities

- `keyboard-control-tray`: A collapsible keyboard shortcut tray
  with compact and expanded presentations and animated state transitions.

### Modified Capabilities

- None.

## Impact

The change affects the React game shell in `rogues-dungeon/src/game/Game.jsx`,
the HUD styles in `rogues-dungeon/src/ui/style.css`, and focused UI/browser
tests under `rogues-dungeon/test/`. It should reuse the existing keyboard input
dispatch rather than introduce a second gameplay action path. Playwright adds
useful evidence for the browser-visible tray: one focused check should verify
collapsed/expanded rendering, tab interaction, non-interactive keycaps, and the
0.25-second transition; the full applicable suite remains for finalization.
