# Rogue's Dungeon Code Organization

- `src/game/types.ts` owns serializable domain contracts: campaigns, floors, entities, items, actions, events, and preferences. Pure game helpers and the simulation/persistence/map systems must not acquire React or renderer dependencies. `src/game/Game.tsx` is the existing React composition layer.
- `src/systems/procedural-generation/` owns generation and turn rules; `persistence/`, `maps/`, `audio/`, and `rendering/` own their corresponding integrations.
- `src/content/` mounts the active game experience.
- `src/ui/` owns the PC-landscape/mobile-portrait browser surface, developer-only PC aspect preview, command desk, and styles. Keep primary game UI inside the fitted viewport; do not restore template corner units. Portrait uses a statusbar Control/Info toggle to switch the bottom content.
- Keep movement, enemy phases, persistence, and choices deterministic from explicit state where practical.
- Keep supplied Tiled tile sources and sample maps together under `public/assets/` so their relative references remain valid.
- Use `.ts` for executable modules and `.tsx` for React JSX. Keep explicit typed extension imports and use `import type` for contracts with no runtime value. Tiled `.tsx` files under `public/` are XML tile sources, not TypeScript inputs.
- Treat parsed saves, imported map JSON, and caught errors as `unknown`. Narrow at the owning boundary, model legacy fields separately, and retain existing normalization and serialized formats. Document narrowly scoped compatibility assertions; do not use blanket `any`, `@ts-nocheck`, or disabled strict checking.
- Run root `npm run typecheck`, `npm test`, and `npm run build`. The strict no-emit configs separate browser source (`tsconfig.app.json`) from Node tests and tooling (`tsconfig.node.json`); neither emits files into source or checks public assets. The build checks both before Vite bundles the application.
