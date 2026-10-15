# Tasks

## 1. Tactical wait action

- [x] 1.1 Add `wait` to the domain action contract and resolve it through the existing single-tick enemy phase without moving the player; verify focused Node tests prove time, cooldowns, and enemy actions advance once.
- [ ] 1.2 Replace the temporary non-repeating X-key handler with the guarded wait dispatch; verify keyboard-input and game tests cover one press, held-key suppression, Settings, editable controls, and pending level-up behavior.
- [ ] 1.3 Add portrait text buttons for Quick 1, Quick 2, and Wait while retaining arrows, abilities 1–3, and Sneak; verify component tests cover their dispatched actions and that no mobile Z or C button is rendered.

## 2. Turn presentation model

- [ ] 2.1 Add a renderer-neutral turn-presentation helper that compares consecutive committed campaigns, assigns persistent playback ranks to enemies first visible in the game view, stages only visible moved enemies across a 1000 ms maximum budget, and keeps a shared staged actor map; verify focused Node tests cover no visible moves, several moves, rank persistence, offscreen exclusion, and deterministic ordering.
- [ ] 2.2 Add cancellation and flush behavior that completes all staged actors before a later accepted tick while leaving playback intact after a rejected action; verify focused Node tests cover interruption, realm reset, removed actors, and cleanup.

## 3. Renderer integration

- [ ] 3.1 Connect committed session results to the presentation coordinator and pass its staged actor positions into the game view and minimap without changing saved campaign data; verify the relevant game and render tests pass.
- [ ] 3.2 Render staged actor positions with cancellable frame updates in Babylon Lite while retaining committed player camera positioning; verify focused renderer tests prove that both views receive matching staged actor positions.
- [ ] 3.3 Run one focused muted Edge Playwright scenario with `?mute=1` that uses keyboard and mobile Wait, the mobile quick slots, and a staged visible enemy response, including a second accepted action during playback; record the result in the task evidence or test output.

## 4. Integration verification

- [ ] 4.1 Run the applicable Node test suite and lint or type-check command; verify no existing tactical-turn, save, camera, or renderer test regresses.
- [ ] 4.2 During finalization, run the full applicable browser suite and report any unavailable browser capability separately from code failures.
