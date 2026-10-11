# Proposal

## Why

Rogue's Dungeon currently uses untyped JavaScript across simulation, persistence, rendering, and React UI. Converting the project to TypeScript will make contracts between these layers explicit and catch incompatible state, props, and API usage before the game runs.

## What Changes

- Convert all first-party executable JavaScript: application `.js`/`.jsx`, Node and Playwright `.mjs` tests, the browser fixture, and root Vite/Playwright configurations to `.ts`/`.tsx`.
- Add strict, no-emit type checking with separate browser and Node/tooling environments, development-only TypeScript tooling, and typed React/Node APIs.
- Define shared simulation and integration types, including campaign state, actions, events, resources, inventory, procedural cells, renderer inputs, and persistence boundaries.
- Update imports, the HTML entry point, test source-file references, documentation, and npm/CI commands for the migrated files.
- Preserve current gameplay, both existing aspect layouts, WebGPU-only rendering, asset URLs, three save slots, serialized saves, and deployment/release behavior.

Acceptance: all first-party executable code is TypeScript, strict checking and existing behavior checks pass, production builds succeed at the existing deployment base, and saved games continue to load without a schema/version change. XML Tiled `.tsx` assets remain unchanged and outside TypeScript inputs.

## Capabilities

### New Capabilities

None. This is a source-language and tooling migration.

### Modified Capabilities

None. Existing behavior requirements remain unchanged. This change declares `skip_specs: true`; no delta specifications are needed for the refactor.

## Impact

Affected: `rogues-dungeon/src/`, `rogues-dungeon/test/`, `rogues-dungeon/index.html`, root npm configuration and lockfile, Vite/Playwright configuration, GitHub Pages/release verification steps, README, and coding/browser-verification documentation. Add TypeScript, React/React DOM/Node type packages, and a TypeScript test runner as development dependencies; retain production libraries and their versions.

Existing uncommitted edits and active OpenSpec changes must survive the migration; pending plans referencing JavaScript paths will need to use the corresponding migrated paths when applied. This change does not implement those pending features or rewrite their artifacts.

Playwright provides useful regression evidence for renamed browser entry points, renderer integration, and fixture loading. Select one focused smoke run after migration during apply; run the full existing browser suite at finalization. Every automated game URL includes `?mute=1`. No browser session is needed during proposal.
