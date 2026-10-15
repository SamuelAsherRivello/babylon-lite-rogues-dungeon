# Tasks

## 1. Quest domain and campaign persistence

- [x] 1.1 Add serializable quest contracts, My First Quest defaults, normalization, event projection, and read-only query in an independent game module; verify focused Node tests cover all three matching events, ignored events, non-active completion, active advancement, and completion.
- [x] 1.2 Initialize new campaigns with My First Quest and migrate/save/load missing or invalid quest state without changing other campaign data; verify focused save and campaign tests cover fresh, legacy, partial, and completed quests.
- [x] 1.3 Connect committed session results to quest event projection before autosave without adding quest rules to the world resolver; verify session tests prove a committed stair, potion, and gold action each persist the corresponding state.

## 2. Quest presentation

- [x] 2.1 Replace placeholder Quest-card content with the public quest query, title, active arrow, and completed-item styling; verify source/UI tests assert My First Quest, the three labels, selection semantics, and crossed-out state.
- [x] 2.2 Run one focused muted Playwright check that opens a new Saved Game and verifies the visible initial My First Quest card; retain the broader browser suite for finalization coverage. Human verification confirmed the quest works.

## 3. Change verification

- [x] 3.1 Run the relevant Node test suite, TypeScript compilation, and OpenSpec strict validation; verify all new quest behavior and artifacts pass without regressing existing game tests.
