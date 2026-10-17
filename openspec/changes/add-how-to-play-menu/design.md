# Design

## Context

Settings is rendered by `SettingsWindow` from one `settings` state value in `game.tsx`. The shared `Dialog` component supplies the modal backdrop, Escape handling, anchored positioning, and menu motion. Settings is used from both the main menu and the running game. See `proposal.md` for motivation and the spec delta for required behavior.

## Goals / Non-Goals

**Goals:**

- Keep help state in the React game UI, separate from simulation, campaign persistence, and Babylon rendering.
- Reuse the existing dialog interaction model while allowing the help dialog to remain visually above Settings.
- Keep each topic's player-facing guidance in one defined UI module with an explicit initial topic.

**Non-Goals:**

- Add tutorial steps, new game rules, persistence, or changes to audio, saves, world rendering, or gameplay input.
- Change the existing Settings action order except for inserting How To Play.

## Decisions

### Keep two explicit UI states

`game.tsx` will retain the existing Settings boolean and add an independent boolean for the help dialog. The Settings component receives an open-help callback, and the new help component receives a close callback. This leaves Settings mounted while help is open and makes close behavior return to the same Settings context. A replacement single dialog state would couple Settings and help navigation, making it easier to lose the Settings dialog when help closes.

### Use a dedicated help-window component and a local topic definition

A new `how-to-play-window.tsx` component will own the seven ordered topics, selected-topic state, semantic topic buttons, and topic copy. Its content remains UI-only rather than entering campaign types or persistence because it has no game-state effect. Placing topic copy directly in `game.tsx` would make the already large composition layer harder to maintain.

### Reuse Dialog with a higher stacking class

The help window will use the shared `Dialog` component and a help-specific class. CSS will center it within the fitted viewport and put its backdrop above the mounted Settings dialog. The wider reference dialog must not inherit the game view's narrower horizontal anchor because that would clip it off-screen. The shared dialog will gain a narrowly scoped way to disable Settings dismissal while help is open, so Escape and backdrop interaction affect only the upper dialog. This preserves the established close button and menu-motion behavior. A custom modal would duplicate dialog behavior and could diverge from existing dialog handling.

### Verify source structure and live interaction

Focused page tests will confirm component composition and required topic labels. One focused Playwright check will open Settings, open How To Play, choose a topic, and close help to prove the nested modal behavior. The full browser suite remains finalization coverage.

## Risks / Trade-offs

- [A narrow viewport can make seven top buttons wrap] -> Allow the topic row to wrap while keeping every button reachable and the content area readable.
- [Nested modal Escape handlers can both run] -> Disable Settings dismissal while help is open so Escape closes only the upper dialog.
- [Help copy can drift from rules] -> Keep it derived from current documented game behavior and cover visible headings and topic selection with tests.

## Migration Plan

No save-data migration is needed. The change is additive UI. Rollback removes the new help state, component, styling, and tests while leaving Settings and stored preferences unchanged.
