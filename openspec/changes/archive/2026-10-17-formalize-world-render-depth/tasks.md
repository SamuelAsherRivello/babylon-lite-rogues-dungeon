# Tasks

## 1. Shared world-depth model

- [x] 1.1 Define renderer-neutral render-pass and world-depth entry helpers, including ground-contact anchors and deterministic same-position tie-breaking; verify focused Node tests cover north and south wall overlap, stable equal-Y ordering, and floor-decal separation.
- [x] 1.2 Route wall, prop, pickup, stair, moving projectile, player, enemy, and barrel presentation through the shared world-depth policy; verify focused renderer tests cover cross-atlas interleaving without changing map coordinates or minimap mover positions.

## 2. Composite render entities and explicit exceptions

- [x] 2.1 Apply one composite main-and-shadow render-entity contract to the player, rat, skeleton, and barrel; verify focused tests cover identical presented position, hide behavior, and shadow-before-main ordering for each entity type.
- [x] 2.2 Keep terrain, floor triggers, reticle, tooltip, diagnostics, pivot markers, and owner-fixed effects in their specified passes; verify focused renderer and particle tests cover trigger-under-barrel, reticle overlay, and Heal above its player.
- [x] 2.3 Update world-rendering documentation with the three render passes, depth-anchor rule, tie-break policy, and exceptions; verify the documented rule matches focused test names and renderer behavior.

## 3. Visual verification

- [x] 3.1 Run the focused Node renderer and animation tests and `npm run typecheck`; inspect the declared npm scripts for lint coverage and report its absence rather than adding tooling outside this change. Focused tests (15) and typecheck passed; no lint script is configured.
- [x] 3.2 Ran the focused muted Edge Playwright barrel scenario in one worker: it entered the deterministic save, rendered its WebGPU canvas, moved the player and barrel while retaining the rat, and passed (1/1, 7.3s). The scenario explicitly focuses the canvas before movement input.
- [x] 3.3 Used `ai-skills-create-playtest`: verified the project-owned Vite listener (PID 107604), HTTP 200, and Rogue's Dungeon document identity at the human route; provide the focused depth playtest URL and pass/fail steps in the apply handoff.

## 4. Finalization

- [ ] 4.1 During finalization, run the full applicable test suite and broader browser coverage, including the three required Rogue's Dungeon browser contexts; confirm no rendering, input, layout, or console-error regression.
