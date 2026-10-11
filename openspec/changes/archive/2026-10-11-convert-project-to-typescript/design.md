# Design

## Context

See `proposal.md` for motivation and scope. The repository is an ESM npm project with React 19, Vite 8, Babylon Lite 1.32.0, and Playwright. Vite serves `rogues-dungeon/` at `/babylon-lite-rogues-dungeon/`. Pages builds and release validation run on Node 24; the inspected local runtime is Node 26. Tests currently use Node's test runner with isolation disabled and directly import JavaScript helpers. Several tests also read component source files, and a browser test dynamically imports a JSX fixture.

Simulation lives mainly in `src/systems/procedural-generation/`, persistence in `src/systems/persistence/`, and rendering/maps/audio in sibling systems. `src/game/` contains React game composition and helpers. Shared types must not introduce React or Babylon runtime dependencies into pure logic.

The working tree contains unrelated keyboard-tray changes. Application guidance explicitly preserves PC landscape and mobile portrait. This migration preserves the current experience; it does not reconcile historical layout or gameplay descriptions in older planning context.

## Goals / Non-Goals

**Goals:** A complete, strictly checked TypeScript source tree with typed integration boundaries, reproducible tests on CI's Node 24, and the same browser and save behavior.

**Non-Goals:** Gameplay changes, folder restructuring, new rendering libraries, save-schema redesign, cleanup of historical OpenSpec artifacts, dependency upgrades unrelated to typing, or changes to generated skills. CSS, HTML, documentation, JSON, TMX, and Tiled XML TSX assets retain their formats.

## Decisions

### 1. Complete migration with explicit compilation scopes

Rename executable `.js` to `.ts`, `.jsx` to `.tsx`, and test `.mjs` to `.ts`. Rename root configs to `vite.config.ts` and `playwright.config.ts`. Update `index.html`, imports, test globs, source-file reads, fixture URLs, and active documentation together. Preserve ESM and directory placement.

Add a shared TypeScript baseline and separate browser and tooling/test configurations. Use strict checking, no emit, modern ESM, bundler resolution, and React JSX transformation. Explicit `.ts`/`.tsx` imports use the corresponding no-emit compiler option so Vite and the test runner resolve the same files. Browser compilation includes only `rogues-dungeon/src` and the browser fixture, with DOM and Vite client types. Node compilation includes root configs and tests, with Node types and DOM support where Playwright callbacks execute in the page. Scope includes narrowly; exclude public assets and build/report directories so XML `.tsx` tilesets are never parsed as code.

Alternative: permanent `allowJs` or permissive checking would leave the requested conversion incomplete. Temporary intermediate breakage is acceptable while applying; the completed change must contain no executable JavaScript remnants or disabled strictness.

### 2. Model existing data without changing runtime rules

Place pure shared domain types in a discoverable module under `src/game/`, retaining implementation ownership in the current systems. Model campaigns, floors/cells, player/enemy/entity variants, items, equipment, resources, actions, events, and preferences from current producers and consumers. Use discriminated unions where current tags already exist, including actions and entity kinds. Co-locate UI props, context values, event handlers, DOM refs, and renderer-specific types with their owners; use upstream React, Babylon Lite, and pathfinding declarations rather than broad ambient module declarations.

Treat JSON parsing and imported map/save data as `unknown`, narrowing through current validation and normalization paths. Type legacy save representations separately from the current campaign, keeping accepted historical input and existing error behavior. Keep existing storage keys, campaign version, generator version, migration backups, and serialized output unchanged. Define storage interfaces that also accept current in-memory test doubles.

Alternative: pervasive `any`, unchecked casts, or `@ts-nocheck` would hide contract errors. Use narrow documented adapters only where external declarations cannot express a verified runtime API; do not invent library behavior. Preserve deliberately invalid test inputs through the real untrusted-data boundary.

### 3. Use one compiler gate and retain existing test frameworks

Add development dependencies for TypeScript, React/React DOM/Node declarations, and `tsx`. Keep the Node test runner and its existing isolation choice, using `node --import tsx --test --test-isolation=none` with the migrated five test files. Playwright retains its runner and converts its specs/config/fixture to TypeScript. Type-check both configurations through `npm run typecheck`; make `npm run build` execute this gate before Vite. Add explicit type checking to release validation because that workflow currently tests without building; Pages receives the gate through its build command. Preserve versioning, output directories, and deployment paths.

Alternative: local Node type stripping alone would depend on runtime-specific syntax support and leave JSX handling fragmented. The proposed development runner gives local and Node 24 CI tests one execution path; verify it on that supported CI version during implementation.

### 4. Verify behavior through existing coverage

Update path-based tests without weakening their assertions. Use existing simulation, migration, map, audio, layout, and tooltip tests as regression coverage. Do not create tests that merely assert file extensions. Run one focused `npm run test:browser` check after the complete migration group, covering muted entry and existing smoke interactions; reserve `npm run test:browser:full` for finalization, including dynamic fixture loading, aspect layouts, and renderer integration. Report unavailable WebGPU/browser capabilities explicitly. No browser tests run during proposal.

## Risks / Trade-offs

- Strict types may expose pre-existing mismatches → distinguish annotation/inference fixes from runtime defects; document behavior-changing fixes separately rather than silently expanding migration scope.
- Renames can lose active edits or break pending feature plans → retain the latest working file contents, record rename mappings, and leave unrelated OpenSpec artifacts untouched.
- Save migration uses heterogeneous legacy objects → preserve existing fixtures and acceptance rules; assert current save round trips and legacy migrations continue to pass.
- Source-text assertions and fixture URLs can fail after renaming → update all executable/source references while preserving their behavioral intent.
- XML tilesets share the TSX suffix → use directory-based compiler inputs and verify supplied asset contents are unchanged.
- New type packages and runner versions may differ in Node compatibility → select compatible versions during apply, lock them, and verify installation/test execution on Node 24 without upgrading existing production dependencies.

## Migration Plan

1. Record existing dirty-file contents and a pre-migration Node-test baseline, then add compiler and runner setup.
2. Convert pure systems and shared contracts, followed by React/rendering, configs, tests, fixture references, and documentation.
3. Pass strict checks, existing Node tests, production build, and the one focused browser run; finalization runs the full browser suite.
4. Roll back only migration-owned changes if needed, preserving earlier edits. No data migration or storage deletion is needed because persisted formats do not change. Deployment and release remain separate existing workflows.
