# Tasks

## 1. Character motion presentation

- [x] 1.1 Add the static `SUB_GRID_MOVEMENT` boolean and extend the transient turn-presentation state to sample fractional player and actor positions, schedule enemy starts at `index * 1000 / visibleMovedCount`, and retarget active or pending movement from its sampled position; verify focused Node tests cover `easeOutCubic`, 250 ms travel, ten-enemy start times, a later accepted retarget, and disabled direct-grid placement.
- [x] 1.2 Preserve floor reset, actor removal, rank assignment, and rejected-action behavior in the motion state; verify focused Node tests cover reset, removal, and no retarget for a rejected action.

## 2. World rendering

- [x] 2.1 Render the player, enemies, minimap, and Center, Deadzone, and Screen camera modes from shared interpolated presentation positions while retaining current sprite animation selection and each camera mode's established policy; verify focused renderer tests cover matching fractional coordinates and camera centers.
- [x] 2.2 Keep the renderer frame loop sampling motion without changing campaign state, turn resolution, or save state; verify the existing focused game and rendering tests pass.

## 3. Browser verification

- [x] 3.1 Add or update a muted Edge Playwright check that performs rapid accepted movement and confirms visible positional travel remains responsive; verify with the focused browser test using `?mute=1` and the completed human playtest.
- [x] 3.2 Run the applicable full test suite and lint checks, then report any unavailable browser capability or unrelated failure.
