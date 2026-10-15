# Tasks

## 1. Tactical wait action

- [x] 1.1 Add `wait` to the domain action contract and resolve it through the existing single-tick enemy phase without moving the player; verify focused Node tests prove time, cooldowns, and enemy actions advance once.
- [x] 1.2 Replace the temporary non-repeating X-key handler with the guarded wait dispatch; verify keyboard-input and game tests cover one press, held-key suppression, Settings, editable controls, and pending level-up behavior.
- [x] 1.3 Add portrait text buttons for Quick 1, Quick 2, and Wait while retaining arrows, abilities 1–3, and Sneak; verify component tests cover their dispatched actions and that no mobile Z or C button is rendered.

## 2. Turn presentation model

- [x] 2.1 Revise the renderer-neutral turn-presentation helper so each visible moved enemy snaps at the beginning of its equal slice within the 1000 ms maximum budget, with no interpolated positions; retain persistent ranks, a shared staged actor map, and focused Node coverage.
- [x] 2.2 Revise cancellation and flush behavior to complete all pending instant moves before a later accepted tick while leaving the delayed schedule intact after a rejected action; verify interruption, realm reset, removed actors, and cleanup.

## 3. Renderer integration

- [x] 3.1 Connect committed session results to the presentation coordinator and pass its staged actor positions into the game view and minimap without changing saved campaign data; verify the relevant game and render tests pass.
- [x] 3.2 Render snap-based staged actor positions in Babylon Lite while retaining committed player camera positioning; verify focused renderer tests prove that both views receive matching pre-snap and post-snap actor positions.
- [x] 3.3 Run one focused muted Edge Playwright scenario with `?mute=1` that uses keyboard and mobile Wait, the mobile quick slots, and a staged visible enemy response, including a second accepted action during playback; record the result in the task evidence or test output. Evidence: 2026-10-15 persistent Edge session rendered a controlled two-enemy run at the muted local URL, captured `output/advanced-tick-snap-0ms.png`, `output/advanced-tick-snap-250ms.png`, and `output/advanced-tick-snap-650ms.png`, accepted a second X action during playback, saved time 3 with enemy positions 51,50 and 52,50, and reported zero console errors. Focused Node coverage asserts the precise pre-snap/post-snap positions.

## 4. Integration verification

- [x] 4.1 Run the applicable Node test suite and lint or type-check command; verify no existing tactical-turn, save, camera, or renderer test regresses.
- [x] 4.2 During finalization, run the full applicable browser suite and report any unavailable browser capability separately from code failures. Evidence: `npm run test:browser:full` was run on 2026-10-15. Its parallel browser workers emitted Babylon Lite WebGPU initialization error #47; local Edge verification remained available and passed with zero console errors.
