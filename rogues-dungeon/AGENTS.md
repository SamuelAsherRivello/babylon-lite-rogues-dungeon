# Rogue's Dungeon project guidance

This is an existing game project with an explicit two-aspect requirement. Support 16:9 landscape on PC and 9:16 portrait on mobile, with a session-only developer aspect override on PC. This project-specific requirement supersedes the generic template rule that new projects choose one aspect.

Keep primary game UI within the fitted viewport. In portrait, preserve the order Title, Game, Status (with Control/Info toggle), and Bottom Content. The bottom shows either mobile controls or the information panels, starting on Control. Keep only the Log, equipment Slots, and Inventory content internally scrollable. Preserve the Babylon Lite WebGPU-only renderer and the `/babylon-lite-rogues-dungeon/` Vite deployment base.

Name every new file with lowercase kebab case in the form `blah-foo.extension`.
For compound extensions, retain each extension, such as `turn-rules.test.ts`.
Rename files that you modify when they do not follow this convention, unless a
framework, tool, or platform requires an exact filename.

Any automated browser session that launches or navigates to Rogue's Dungeon must include `?mute=1` so audio stays silent during testing. Keep the public player demo and normal human sessions unmuted.
