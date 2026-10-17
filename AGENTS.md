# AI Repository Guidance

## Repository purpose and scope

This repository is a reusable browser app/game template. When a user asks to
use it, first identify the requested mode:

1. **New GitHub repository:** Use GitHub's **Use this template** flow when
   authorized. The destination repository is a new project; do not push
   project-specific work to this template.
2. **Local project copy:** Copy the tracked template files into the explicitly
   named destination, excluding `.git` and its history. Do not create a
   destination the user did not identify.
3. **Reference only:** Inspect this repository as inspiration. Copy no files
   unless the user separately asks for a copy.

For either new-project mode, follow
[the template usage checklist](AGENTS_TEMPLATE_USAGE_CHECKLIST.md). Resolve
any mismatch between the requested mode and repository configuration before
copying or creating a destination. Do not treat reference-only use as permission
to copy.

When establishing a new project, determine whether the user wants a game or an
app. For a game, keep the Babylon content and dependencies as the starting
point and adapt them to the requested game. For an app, remove Babylon content
and dependencies, along with associated imports, tests, assets, and docs used
only by that content; update the lockfile after dependency changes.

For every new app or game concept, choose either portrait or landscape before
implementation. Use the template's corresponding viewport display for the
chosen orientation and remove the template's orientation toggle, shortcut,
and persisted override. Do not add a second orientation or a layout that
attempts to serve both orientations. Do not select square for a new app or
game concept.

When adapting the starter into a game, treat the Babylon showcase as a renderer
example and replace it with the requested game. Babylon Lite is WebGPU-only;
games using it must show a clear unsupported-browser message and must not add a
fallback renderer. Implement the scene and renderer setup required by the game,
including for 3D. Every 2D game uses the Pixel Perfect rendering policy, while
each game chooses its own logical resolution and render scale.

The viewport is the priority location for primary game content and must remain
usable in windowed and fullscreen modes. The template gutter layout is
required, but adding secondary material there (such as design elements,
instructions, or backstory) is optional. Games have full freedom to choose
whether and how their content scrolls.

Game audio is optional; music is not recommended. If a game includes sound,
recommend 4 to 10 event-based sound effects and provide both an in-game mute
toggle and a documented URL argument that mutes all sound for silent AI
testing. Human players may enable sound in the normal experience.

## File naming

Name every new file with lowercase kebab case in the form
`blah-foo.extension`. Use one or more lowercase words separated by single
hyphens, followed by the file's normal extension. For compound extensions,
keep every extension, such as `game-state.test.ts`. Rename files that you
modify when they do not follow this convention, unless a framework, tool, or
platform requires an exact filename such as `package.json`, `vite.config.ts`,
or `AGENTS.md`.

## Repository and application layout

- The repository root is the npm project root and contains `.git`, package
  configuration, and repository metadata. Run Git, dependency, build, test,
  and run commands from this root unless the resulting project's inspected
  configuration says otherwise.
- `project-name/` is the Vite application root. Keep app source, tests, and
  assets there unless the chosen stack deliberately changes the layout.
- Project documentation assets belong in `project-name/documentation/`.
- Keep `project-name/` as the Vite root and synchronize the GitHub repository
  URL with the resulting project repository when this template baseline is
  retained.

## React code and styles

### Browser access for AI agents

AI agents can access and test the local browser experience through Microsoft
Edge. Use the Playwright CLI with the Edge browser explicitly for browser
verification.

For Rogue's Dungeon, use the project-specific three-context verification flow
in `rogues-dungeon/AGENTS.md`.

- Do not leave dead code or dead styles. Remove unused React components,
  imports, variables, CSS selectors, and custom properties when they are no
  longer used.
- When changing React UI, check that its JSX class names and IDs match the
  styles, and remove obsolete selectors left behind by the change.
- When editing CSS, prefer explicit new values for the requested layout over
  calculations derived from previous values. Use `calc()` only when a real
  relationship between live dimensions is required.
- The page structure supports keeping the full HUD visible inside the viewport
  during fullscreen. Gutters are not visible in fullscreen, so custom gutter UI
  may be added only as secondary UI. Keep all primary UI in React and within
  the viewport.

### Tab control attachment alignment

Use the shared tab control attachment geometry as a visual reference for future
UI work:

- The vertical tab attached to the status bar uses the tab's centered bottom
  edge as its pivot. That edge meets the status bar's top border.
- Tabs attached horizontally to the Abilities or Minimap cards rotate `-90deg`
  and place the pivot on the card's visible left border. Account for the
  `.35rem` inset from the information panel padding when aligning the pivot.
- Preserve the one-color status-bar treatment: `var(--border-color)` for the
  visible top/side outline and `var(--surface-color)` for the tab fill.

Treat the status-bar tab and the Abilities tab as the canonical vertical and
horizontal alignment examples when adding or repositioning tab controls.

## HTML template corner roles

The default HTML template uses four reusable `corner` instances inside
`ui_layer`. Preserve these roles when adapting the template:

- Upper left: project title.
- Upper right: project links.
- Lower right: project version.
- Lower left: project settings.

Format content in each corner using either the menu title style or the menu
body style. Represent boolean settings with checkboxes.

## OpenSpec setup

The template preserves `.agents/skills/.openspec-target` but does not bundle
generated OpenSpec skills. When the resulting project requires OpenSpec, follow
the authoritative setup and verification procedure in
[the template usage checklist](AGENTS_TEMPLATE_USAGE_CHECKLIST.md#openspec-setup-when-required).
Do not hand-edit generated OpenSpec skills.

## Pull request workflow

Do not create a pull request unless the user explicitly asks for one in the
current request. A push, commit, or completed template/OpenSpec workflow does
not imply approval to create a pull request.
