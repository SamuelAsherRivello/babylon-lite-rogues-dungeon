# Migration verification

## Pre-migration baseline

- Branch: `main`.
- Node: 26.7.0 locally; CI targets Node 24.
- `npm test`: 95 tests, 92 passed, 3 failed before migration.
- Existing failures: `uses a command desk and removes template corner units`; `uses the shared card inset for log, equipment, and inventory scrollbars`; `wires UI tooltips to pointer and keyboard focus with accessible descriptions`.
- Existing edits: keyboard-tray proposal/design/spec/tasks, `src/game/Game.jsx`, `src/ui/style.css`, and `test/browser/entry.spec.mjs`.
- Local recovery material is in ignored `.setup/typescript-baseline/`: the binary Git diff, original dirty implementation files, complete test output, and the executable-file rename map. No source renames have occurred at baseline capture.

## Implementation results

- Converted 48 executable source/test/configuration files to TypeScript. Added shared domain contracts and browser declarations. Both compiler input lists cover every renamed executable and exclude `public/` and `dist/`; Tiled XML `.tsx` assets are unchanged.
- `npm ci`: passed with the committed dependency versions; production dependencies were not upgraded. A running Vite process initially locked a native dependency on Windows; stopping that verified project process allowed the clean install to pass.
- Final strict browser and tooling compilation: passed on Node 24.21.0. Local `npm run typecheck` also passed on Node 26.7.0.
- Final five Node suites: 95/95 passed on Node 24.21.0. Local `npm test`: 95/95 passed. Updated type-sensitive source assertions and the three stale baseline UI expectations to reflect the already edited titlebar, keyboard tray, and scrollbar styles.
- `npm run build`: passed. Final Vite build also passed on Node 24.21.0; output is `rogues-dungeon/dist/`, with `/babylon-lite-rogues-dungeon/` retained.
- Playwright discovery: all 11 existing cases found through `playwright.config.ts`. Smoke: 7/7 passed. Final full suite: 11/11 passed, including the dynamically imported `scroll-area.tsx` fixture, keyboard controls, save fixtures, portrait/mobile/DPR layout, and fullscreen.
- Corrected browser fixtures to carry the existing generator version. Missing versions had caused the unchanged save loader to discard those fixtures. Corrected the 125%-zoom assertion to measure visible layout and its clipping boundary: the invisible collapsed tray intentionally extends below the shell for its animation and contributes to `scrollHeight`.
- Playwright CLI: movement autosave (Time 1), save/return/reload/resume, URL mute notice, settings, Zoom 2, Deadzone camera, portrait Info/Control, and fullscreen at `{ x: 0, y: 0, width: 1280, height: 720 }` passed. Explicitly removing `navigator.gpu` produced the existing unsupported-browser message. Final primary-page console: 0 errors; one Chromium warning that Windows ignores `powerPreference`. Relevant game asset requests returned 200.
- Headless full-suite execution emitted Babylon `#47` initialization diagnostics in this environment; those tests validate browser UI and integration, not rendered pixels. The CLI's normal session initialized Babylon Lite WebGPU successfully, and its separate unsupported-WebGPU check passed. No renderer fallback was added.
- Typing identified the existing fullscreen rectangle mismatch (`left`/`top` versus `x`/`y`); corrected fullscreen geometry and verified it in browser. Other runtime edits are local narrowing/normalization adaptations. Storage keys, campaign version 3, generator version, and serialized map/save fields are retained.
- Source audit: every rename target exists, retired executable paths are absent, no first-party executable JavaScript remains outside ignored outputs/generated skills/public assets, and no `any`, `@ts-ignore`, or `@ts-nocheck` was introduced. Scoped compatibility assertions document intentionally incomplete legacy test inputs.
- The user approved including the existing keyboard-tray and overlapping Tab-focus edits with the modified CSS in the migration commit. Other OpenSpec proposals and generated skills are excluded from the commit scope.
- No delta specs: `skip_specs: true`; strict OpenSpec validation passed.
