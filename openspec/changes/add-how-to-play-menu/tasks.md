# Tasks

## 1. Build the help dialog

- [x] 1.1 Create the `how-to-play-window.tsx` UI component with the seven specified top topic buttons, Basics selected by default, and 10 to 100 words of accurate guidance per topic; verify focused page tests assert every label and topic definition.
- [x] 1.2 Extend the shared dialog dismissal contract so an underlying Settings dialog can remain mounted without responding to Escape or backdrop input; verify a focused test covers dismissal gating.
- [x] 1.3 Add responsive help-dialog styles that keep the top topic controls and selected content readable in fitted landscape and portrait shells; verify the focused page test covers the help CSS hooks.

## 2. Connect Settings to help

- [x] 2.1 Add the How To Play action to Settings and pass an explicit open-help callback from both the main-menu and active-game Settings render paths; verify focused page tests cover both paths.
- [x] 2.2 Manage help visibility independently from Settings visibility so closing help restores the same Settings dialog without changing campaign state or advancing time; verify focused tests cover close behavior.
- [x] 2.3 Run `npm run typecheck` and the focused Node test file after the component and Settings integration, and fix any failures.
- [x] 2.4 Run one focused Playwright check in Microsoft Edge at a muted game URL that opens Settings, opens help, selects a topic, and closes help back to Settings; retain full browser-suite coverage for finalization.

## 3. Integration verification

- [x] 3.1 Run `npm test` and verify the complete Node suite passes with the new Settings and help coverage.
