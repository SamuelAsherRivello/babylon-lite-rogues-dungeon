# Tasks

## 1. Shortcut model and status-bar integration

- [x] 1.1 Define the ordered four-row shortcut model and exact collapsed summary in the game UI layer, preserving the existing physical-key identities; verify the model covers `123`, `QWE`, `ASD`, and `ZXC` exactly once.
- [x] 1.2 Add the collapsible tray and centered tab to the desktop status bar while preserving the current status-bar and fullscreen shell structure; verify the collapsed render shows only the requested summary plus tab.
- [x] 1.3 Keep movement and ability actions on the existing physical keyboard paths, render keycaps as non-interactive `InputKey` elements, and log temporary Q/E/Z/X/C physical presses; verify focused logic tests cover accepted/rejected ability/movement behavior and no-op temporary controls.

## 2. HUD presentation and animation

- [x] 2.1 Style the expanded panel, aligned keycap columns, labels, single large top tab, and collapsed summary using the existing HUD palette and typography; verify no obsolete key-state legend or SHIFT key remains.
- [x] 2.2 Add the 250ms position transition and synchronized panel opacity cross-fade, including an immediate reduced-motion variant; verify computed styles expose the requested duration and both state classes reach the correct positions.
- [x] 2.3 Verify the tray remains inside the viewport and attached to the status bar across windowed and fullscreen layouts with focused layout assertions.

## 3. Browser verification

- [x] 3.1 Add one focused Playwright browser check for collapsed/expanded rendering, tab toggling, exact labels, non-interactive keycaps, and the 0.25-second transition; verify it passes with the repository's browser smoke command.
- [x] 3.2 Run the applicable unit/source-shape suite and production build after integration; verify existing unrelated failures are reported separately from keyboard-tray regressions.
