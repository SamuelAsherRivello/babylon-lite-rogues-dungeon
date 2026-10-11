# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presentation.spec.ts >> PC aspect preview and portrait/mobile layouts keep controls and information reachable
- Location: rogues-dungeon\test\browser\presentation.spec.ts:12:1

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Info' }) resolved to 3 elements:
    1) <button tabindex="-1" type="button" class="tab-control" aria-expanded="true" aria-label="Collapse PrimaryInfoPanel tab">…</button> aka getByRole('button', { name: 'Collapse PrimaryInfoPanel tab' })
    2) <button tabindex="-1" type="button" class="tab-control" aria-expanded="true" aria-label="Collapse SecondaryInfoPanel tab">…</button> aka getByRole('button', { name: 'Collapse SecondaryInfoPanel' })
    3) <button tabindex="-1" type="button" aria-pressed="false">Info</button> aka getByRole('button', { name: 'Info', exact: true })

Call log:
  - waiting for getByRole('button', { name: 'Info' })

```

# Page snapshot

```yaml
- main [ref=e8]:
  - generic [ref=e9]:
    - generic [ref=e10]: Rogue's Dungeon
    - generic [ref=e12]:
      - generic "Zoom" [ref=e13] [cursor=pointer]:
        - generic [aria-hidden] [ref=e14]: ⌕
        - combobox "Zoom" [ref=e15]:
          - option "0.25x"
          - option "0.5x"
          - option "1x" [selected]
          - option "2x"
          - option "4x"
      - generic "Camera" [ref=e16] [cursor=pointer]:
        - generic [aria-hidden] [ref=e17]: ▣
        - combobox "Camera" [ref=e18]:
          - option "Center" [selected]
          - option "Deadzone"
          - option "Screen"
      - button "Fullscreen" [ref=e19] [cursor=pointer]:
        - generic [aria-hidden] [ref=e20]: ⛶
      - button "Settings" [ref=e21] [cursor=pointer]:
        - generic [aria-hidden] [ref=e22]: ⚙
  - generic [ref=e23]:
    - generic [ref=e25]:
      - generic "Pixel-perfect dungeon map" [ref=e26]
      - status [ref=e27]: Babylon Lite requires WebGPU. Enable WebGPU or use a compatible browser and device.
    - button "Collapse PrimaryInfoPanel tab" [expanded] [ref=e28] [cursor=pointer]:
      - generic [aria-hidden] [ref=e32]: ⌃
    - button "Collapse SecondaryInfoPanel tab" [expanded] [ref=e33] [cursor=pointer]:
      - generic [aria-hidden] [ref=e37]: ⌃
  - group "Bottom panel" [ref=e39]:
    - button "Control" [pressed] [ref=e40]
    - button "Info" [ref=e41]
  - generic [ref=e43]:
    - generic [ref=e44]:
      - button "↑" [ref=e45]
      - button "←" [ref=e46]
      - button "↓" [ref=e47]
      - button "→" [ref=e48]
    - generic [ref=e49]:
      - button "1" [ref=e50]
      - button "2" [ref=e51]
      - button "3" [disabled] [ref=e52]
    - button "Sneak" [ref=e53]
```

# Test source

```ts
  1  | import type { Page } from '@playwright/test';
  2  | import { expect, test } from "@playwright/test";
  3  | 
  4  | const mobileAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
  5  | 
  6  | async function startCampaign(page: Page) {
  7  |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  8  |   await page.getByRole("button", { name: /Saved Game 1/ }).click();
  9  |   await expect(page.locator(".command_desk")).toBeVisible();
  10 | }
  11 | 
  12 | test("PC aspect preview and portrait/mobile layouts keep controls and information reachable", async ({ page, browser }) => {
  13 |   await page.setViewportSize({ width: 1280, height: 720 });
  14 |   await startCampaign(page);
  15 |   await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
  16 |   await expect(page.getByRole("button", { name: /Dev Settings/ })).toBeVisible();
  17 |   expect(await page.locator(".titlebar").evaluate((element) => element.getBoundingClientRect().height / element.parentElement!.getBoundingClientRect().height)).toBeCloseTo(0.04, 2);
  18 |   expect(await page.locator(".statusbar").evaluate((element) => element.getBoundingClientRect().height / element.parentElement!.getBoundingClientRect().height)).toBeCloseTo(0.04, 2);
  19 |   expect(await page.locator(".app_corner, .corner").count()).toBe(0);
  20 | 
  21 |   await page.getByRole("button", { name: "Fullscreen" }).click();
  22 |   await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  23 |   await page.getByRole("button", { name: "Fullscreen" }).click();
  24 |   await page.getByRole("button", { name: /Dev Settings/ }).click();
  25 |   await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "portrait");
  26 |   await expect(page.getByRole("button", { name: "Control" })).toHaveAttribute("aria-pressed", "true");
  27 |   await expect(page.locator(".mobile_controls")).toBeVisible();
> 28 |   await page.getByRole("button", { name: "Info" }).click();
     |                                                    ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Info' }) resolved to 3 elements:
  29 |   await expect(page.locator(".mobile_info")).toBeVisible();
  30 |   await page.locator(".mobile_bottom").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  31 |   await expect(page.getByRole("heading", { name: /Inventory/ })).toBeVisible();
  32 |   await expect.poll(() => page.locator(".mobile_bottom").evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  33 | 
  34 |   for (const [width, height, deviceScaleFactor] of [[360, 640, 1], [390, 693, 2]]) {
  35 |     const context = await browser.newContext({
  36 |       viewport: { width, height },
  37 |       deviceScaleFactor,
  38 |       isMobile: true,
  39 |       hasTouch: true,
  40 |       userAgent: mobileAgent,
  41 |     });
  42 |     const mobilePage = await context.newPage();
  43 |     await startCampaign(mobilePage);
  44 |     await expect(mobilePage.locator("#viewport")).toHaveAttribute("data-orientation", "portrait");
  45 |     await expect(mobilePage.getByRole("button", { name: "Control" })).toHaveAttribute("aria-pressed", "true");
  46 |     await expect(mobilePage.locator(".mobile_controls")).toBeVisible();
  47 |     await mobilePage.getByRole("button", { name: "Info" }).click();
  48 |     await mobilePage.locator(".mobile_bottom").evaluate((element) => { element.scrollTop = element.scrollHeight; });
  49 |     await expect(mobilePage.getByRole("heading", { name: /Inventory/ })).toBeVisible();
  50 |     expect(await mobilePage.locator(".mobile_info .log_scroll, .mobile_info .slot_scroll, .mobile_info .inventory_scroll").evaluateAll((elements) => elements.map((element) => getComputedStyle(element).overflowY))).toEqual(["scroll", "scroll", "scroll"]);
  51 |     await test.info().attach(`portrait-${width}x${height}-dpr-${deviceScaleFactor}`, {
  52 |       body: await mobilePage.screenshot(),
  53 |       contentType: "image/png",
  54 |     });
  55 |     await context.close();
  56 |   }
  57 | 
  58 |   // A 1280×720 display at 125% browser zoom exposes a 1024×576 CSS viewport.
  59 |   const zoomContext = await browser.newContext({
  60 |     viewport: { width: 1024, height: 576 },
  61 |     deviceScaleFactor: 1.25,
  62 |   });
  63 |   const zoomPage = await zoomContext.newPage();
  64 |   await startCampaign(zoomPage);
  65 |   await expect(zoomPage.locator("#viewport")).toHaveAttribute("data-orientation", "landscape");
  66 |   expect(await zoomPage.evaluate(() => devicePixelRatio)).toBe(1.25);
  67 |   await expect(zoomPage.getByLabel("Zoom")).toHaveValue("1");
  68 |   // The collapsed, transparent keyboard tray sits below the shell for its
  69 |   // slide animation and contributes to scrollHeight. Check the visible layout
  70 |   // and its clipping boundary rather than that hidden animation geometry.
  71 |   expect(await zoomPage.locator(".command_desk").evaluate((element) => {
  72 |     const frame = element.getBoundingClientRect();
  73 |     const clipped = getComputedStyle(element).overflow === "hidden";
  74 |     const contained = [".titlebar", ".desk_middle", ".statusbar"].every((selector) => {
  75 |       const rect = element.querySelector(selector)!.getBoundingClientRect();
  76 |       return rect.left >= frame.left - 1 && rect.right <= frame.right + 1
  77 |         && rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1;
  78 |     });
  79 |     return clipped && contained && frame.right <= innerWidth && frame.bottom <= innerHeight;
  80 |   })).toBe(true);
  81 |   await test.info().attach("pc-effective-125-percent-browser-zoom", {
  82 |     body: await zoomPage.screenshot(),
  83 |     contentType: "image/png",
  84 |   });
  85 |   await zoomContext.close();
  86 | 
  87 |   await test.info().attach("pc-aspect-preview", { body: await page.screenshot(), contentType: "image/png" });
  88 | });
  89 | 
```