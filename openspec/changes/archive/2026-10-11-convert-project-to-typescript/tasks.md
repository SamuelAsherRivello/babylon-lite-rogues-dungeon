# Tasks

## 1. Migration baseline and compiler setup

- [x] 1.1 Record existing working-tree changes and the JavaScript-to-TypeScript rename map; run the current `npm test` baseline and record failures before migration. Verify unrelated keyboard-tray source and planning edits are accounted for and recoverable.
- [x] 1.2 Add development-only TypeScript, React/React DOM/Node declarations, and `tsx`, updating the lockfile without unrelated production upgrades. Verify a reproducible install and runner compatibility with CI's Node 24.
- [x] 1.3 Add strict no-emit shared/browser/tooling TypeScript configurations with explicit inputs, React JSX, ESM/bundler resolution, typed extension imports, and Vite environment declarations. Add `npm run typecheck`; inspect compiler input lists to verify application/test/config coverage and exclusion of Tiled XML assets and generated output.

## 2. Pure systems and domain contracts

- [x] 2.1 Define shared campaign, entity, action, event, resource, item, preference, and floor/cell types; convert procedural generation, level-grid, and pure game helpers to `.ts` with type-only cross-layer imports. Verify compiler diagnostics for those modules are resolved without permissive suppression or new React/rendering dependencies.
- [x] 2.2 Convert persistence and map import/export systems, modeling current and legacy data separately and narrowing untrusted input. Verify storage keys, campaign/generator versions, validation behavior, and emitted payload fields match the baseline.
- [x] 2.3 Convert audio and pure rendering/world helpers to `.ts`, using upstream library declarations or narrowly documented adapters. Verify their consumer contracts type-check and behavior remains covered by the existing game/audio/content tests.
- [x] 2.4 Convert game and audio Node tests to `.ts`, update source imports, and type valid fixtures/test doubles while retaining intentional invalid-input cases. Update the npm test command to run TypeScript through `node --import tsx --test --test-isolation=none`; run these focused tests and verify simulation, save round trips, legacy migration, maps, and audio assertions pass.
- [x] 2.5 Update coding standards with the typed domain-module location, type-only imports, and untrusted-data conventions. Verify documented ownership matches migrated modules and does not require architecture changes.

## 3. Browser application and remaining tests

- [x] 3.1 Convert the React entry point, UI, content, game composition, and Babylon integration to `.tsx`/`.ts`. Type props, state, contexts, refs, DOM handlers, async lifecycle values, and renderer interfaces. Update `index.html` and imports; verify the browser compiler passes while preserving both existing aspect layouts and the WebGPU-only unsupported-browser path.
- [x] 3.2 Convert page/content/tooltip Node tests and update source-file reads and assertions for migrated paths without weakening behavior checks. Run the focused tests and then `npm test`; verify all five migrated Node suites pass relative to the recorded baseline.
- [x] 3.3 Convert Playwright specs, root configuration, and the scroll-area browser fixture to TypeScript; update its dynamic import URL and type page-side helper declarations. Verify the tooling compiler passes and Playwright lists the existing smoke and full-suite cases with the migrated configuration.
- [x] 3.4 Rename Vite configuration to TypeScript, make `npm run build` type-check before building, and add explicit type checking to release validation. Verify `npm run typecheck` and `npm run build` pass, output remains under `rogues-dungeon/dist/`, deployment base remains `/babylon-lite-rogues-dungeon/`, and release/version steps retain their behavior.
- [x] 3.5 Update README and browser-verification documentation for TypeScript, root commands, renamed entry/config/fixture paths, Node 24 support, and muted automated sessions. Verify executable paths and documented commands resolve and generated skills/historical OpenSpec artifacts are untouched.
- [x] 3.6 After tasks 3.1–3.5, run one focused `npm run test:browser` smoke check with `?mute=1` in automated game URLs. Record muted entry and smoke interaction results, including any unavailable browser/WebGPU capability; do not repeat the run per edit.

## 4. Integration and finalization

- [x] 4.1 Audit the completed migration against the rename map and baseline: verify no first-party executable `.js`/`.jsx`/`.mjs` files remain, no obsolete active imports/fixture URLs remain, strict checks have no blanket escapes, XML/public assets are unchanged, and earlier unrelated edits survive.
- [x] 4.2 Record successful final `npm run typecheck`, `npm test`, and `npm run build` results on the supported environment, reusing recent successful results if files have not changed. Verify any pre-existing failure is distinguished from a migration regression.
- [x] 4.3 During finalization, run `npm run test:browser:full` with muted automated sessions and record applicable entry/save/input, layout, presentation, renderer, and dynamic scroll-fixture coverage. Report failed or unavailable checks explicitly before declaring verification complete.
