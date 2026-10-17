# Tasks

## 1. Progression rules and persisted data

- [x] 1.1 Replace forced upgrade-option state with capped level, ten attributes, and unspent Attribute Points in the campaign types and pure world rules; verify focused Node tests cover level 99, attribute 99, excess XP, three points per level, deferred spending, and no extra time tick.
- [x] 1.2 Add bounded 30-point character-sheet rolling with an injectable random source, and create campaigns only from confirmed sheets; verify unit tests prove each roll totals 30 with every attribute from 1 through 5.
- [x] 1.3 Add configured, one-time XP awards for successful hits, defeats, discoveries, first chest/crate opens, and first floor arrival; verify focused Node tests reject XP from waiting, movement, repeat opens, and revisits.
- [x] 1.4 Update death reset and save migration for the new progression version, preserving committed progression and valid resource fullness while removing obsolete forced-option state; verify migration and death-reset tests pass.

## 2. Character creation and Progression UI

- [ ] 2.1 Add the Create Character menu flow for empty Saved Games with idle player preview, compact profile, all ten values, Roll, Confirm, and cancel; verify a browser test proves cancel leaves the slot empty and confirmation creates a resumable campaign.
- [ ] 2.2 Replace the forced level-up window with a Progression dialog that supports plus/minus drafts, live outcome copy, confirmation, and safe close; verify component or browser coverage proves drafts never mutate committed state and confirmation spends only valid points.
- [ ] 2.3 Connect the existing panel-popup API to unspent Attribute Points after the complete dialog flow is available, preserving its non-dismissible Attributes callout and non-pausing behavior; verify a focused browser test proves it remains after a close or partial spend and clears after all points are spent.
- [ ] 2.4 Remove obsolete forced-level-up actions, UI, styles, tests, and input guards; verify typecheck has no unused references and normal movement remains available with unspent points.

## 3. Status presentation and level celebration

- [ ] 3.1 Rename the Resources card to Status and update Status tooltips with current/maximum prefixes, including level and XP on XP; verify focused UI tests assert the visible card title, tooltip text, and `LVL NN` accessible output.
- [ ] 3.2 Implement the shared-track capacity-marker curve and contrasting centered `LVL NN` text; verify unit or component tests cover ranks 1, 5, 14, and 99 without marker overflow.
- [ ] 3.3 Route level-gain events into short-lived inward sparkle particles and a muted-aware non-diegetic chime; verify focused event/audio tests prove one effect and cue per gained level and no retained particle after completion.
- [ ] 3.4 Update player-facing help and the documented sound-cue inventory for Attribute Points, Status, and the chime; verify referenced UI text and documentation match the implemented behavior.

## 4. Integration verification

- [ ] 4.1 Run `npm run typecheck` and the focused Node test files changed by progression, persistence, and presentation work; verify both commands pass.
- [ ] 4.2 Run one muted Playwright flow in Microsoft Edge that creates a character, gains a level, observes the Status and Attributes callout, allocates points, and reloads; verify the campaign resumes without console errors.
- [ ] 4.3 During finalization, run the full applicable Rogue's Dungeon browser verification in Playwright, desktop Edge, and the built-in browser on `?mute=1`; verify the game view is playable, a canvas is present, WebGPU fallback messaging is absent, and console errors are absent.
