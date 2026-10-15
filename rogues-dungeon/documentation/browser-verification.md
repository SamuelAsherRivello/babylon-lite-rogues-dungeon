# Browser verification

Rogue's Dungeon uses Playwright only for browser-owned behavior. Pure dungeon,
rendering-policy, and data-model rules stay in the fast Node test suite.

## Setup

Use Node.js 24 and run commands from the repository root. Install project
dependencies, then download the supported local Chromium build:

```powershell
npm ci
npx playwright install chromium
```

The browser runner starts Vite locally at the repository's GitHub Pages base
path. It targets Chromium only. It captures traces, screenshots, and video
only when a browser check fails; generated diagnostics are intentionally
ignored by Git.

`playwright.config.ts` discovers the `.spec.ts` files in
`rogues-dungeon/test/browser/`. The auto-scroll check dynamically loads
`/babylon-lite-rogues-dungeon/test/browser/fixtures/scroll-area.tsx` through Vite.
This React test fixture is executable TypeScript; public Tiled `.tsx` XML assets
are excluded from compilation. Run `npm run typecheck` to check both the browser
application and the tests/configuration; `npm test` runs the five Node suites
using `node --import tsx --test --test-isolation=none`.

## Commands

Run the focused smoke suite during apply after the related browser-visible
implementation group is complete:

```powershell
npm run test:browser
```

Run the complete browser suite during finalization when the completed change
selected browser coverage:

```powershell
npm run test:browser:full
```

Every automated Rogue's Dungeon URL includes `?mute=1`; the entry smoke check uses:

```text
http://127.0.0.1:4173/babylon-lite-rogues-dungeon/?mute=1
```

## OpenSpec policy

Playwright supports the purpose of the active OpenSpec skill rather than
becoming a universal gate:

- **Explore and proposal:** decide and record whether the change needs browser
  evidence. Do not install a browser, start Vite, or execute tests.
- **Apply:** a browser-visible interaction, persistence, fullscreen, layout,
  or browser-integration change gets one focused check after its related task
  group is complete. Do not run it after every edit or unrelated task.
- **Finalize:** run the full applicable browser suite. Add viewport, input,
  persistence, fullscreen, or interaction coverage only when the completed
  change requires it.

Changes limited to pure logic, documentation, or non-browser configuration
record Playwright as not applicable. If a required browser capability (such as
WebGPU or fullscreen) is unavailable, report that limitation; do not add a
fallback renderer or claim the coverage passed.

## Command Desk visual review

On 2026-10-03, the smoke suite passed (2 tests) and the full browser suite
passed (5 tests). A WebGPU-capable Microsoft Edge session was also used for
visual review and screenshots; the Playwright bundled Chromium remains the
automated runner.

| Mode | CSS viewport | DPR | Result |
|---|---:|---:|---|
| PC landscape, windowed | 1280×720 | 1 | Dungeon tiles, HUD, controls, and panels visible; title bar and status bar each measure 4% of shell height. |
| PC landscape at zoom-equivalent viewport | 1024×576 | 1.25 | Layout remains contained and native game Zoom stays selected. This represents a 1280×720 display at 125% browser zoom. |
| PC developer portrait preview | 405×720 fitted within 1280×720 | 1 | Portrait controls and panels appear; return-to-landscape control is available. |
| Mobile portrait | 360×640 | 1 | Controls visible initially; Info scrolls through the panels to Inventory. |
| Mobile portrait | 390×693 | 2 | Controls visible initially; Info scrolls through the panels to Inventory. |

All reviewed states had zero template corner elements. The Log, equipment, and
Inventory regions use `overflow-y: scroll`; no other information region uses a
vertical scroll track. The mobile Info area measured 920 CSS pixels of content
against 294 pixels of visible height at 360×640 and 319 pixels at 390×693, and
the Inventory card was reachable at the end of the scroll.

The WebGPU-backed game-view reticle measured 32 CSS pixels at native Zoom with
DPR 1, DPR 2, and the 125%-zoom-equivalent viewport. At DPR 2, its measured
widths were 16, 32, and 64 CSS pixels at game Zoom 0.5×, 1×, and 2×. The
rendered tiles remained aligned to those cell centers. Screenshots from the
manual Edge review are saved in the local temp directory
`rogues-dungeon-visual-review`; the Playwright layout review also attaches its
landscape, portrait, fullscreen, and DPR screenshots to its test results.
