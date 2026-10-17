# Rogue's Dungeon project guidance

This is an existing game project with an explicit two-aspect requirement. Support 16:9 landscape on PC and 9:16 portrait on mobile, with a session-only developer aspect override on PC. This project-specific requirement supersedes the generic template rule that new projects choose one aspect.

Keep primary game UI within the fitted viewport. In portrait, preserve the order Title, Game, Status (with Control/Info toggle), and Bottom Content. The bottom shows either mobile controls or the information panels, starting on Control. Keep only the Log, equipment Slots, and Inventory content internally scrollable. Preserve the Babylon Lite WebGPU-only renderer and the `/babylon-lite-rogues-dungeon/` Vite deployment base.

Name every new file with lowercase kebab case in the form `blah-foo.extension`.
For compound extensions, retain each extension, such as `turn-rules.test.ts`.
Rename files that you modify when they do not follow this convention, unless a
framework, tool, or platform requires an exact filename.

Any automated browser session that launches or navigates to Rogue's Dungeon must include `?mute=1` so audio stays silent during testing. Keep the public player demo and normal human sessions unmuted.

## Browser verification

Test the live game in all three available browser contexts when a change affects
rendering, input, fullscreen, layout, or browser behavior:

1. Start exactly one project-owned server through `ai-skills-project-run-start`.
   Use a browser-safe AI port such as `6080` and verify
   `/babylon-lite-rogues-dungeon/`. Do not use port `6000`: Chromium blocks it
   as an unsafe port. Keep the server running while checking all three contexts.
2. Use Playwright CLI with Microsoft Edge and navigate to
   `http://127.0.0.1:<port>/babylon-lite-rogues-dungeon/?mute=1`. Select a save
   slot, then verify that `.game-screen` is visible, at least one canvas exists,
   the WebGPU-unavailable message is absent, and the console has no errors.
3. Use the desktop Edge browser through `cua_repl` on the same muted URL. Select
   a save slot and confirm the playable game UI and its dungeon map are visible.
   Check the canvas count and console errors through its page tools.
4. Repeat the desktop check in the built-in `iab` browser through `cua_repl`.
   Wait for `Preparing the crypt...` to disappear before treating the renderer
   as ready.

Run `npm test` and `npm run typecheck` for the focused repository checks. The
configured Playwright suite starts its own Vite server on port 4173, so stop the
project-owned verification server before running `npm run test:browser` or
`npm run test:browser:full`; never leave both servers running together.
