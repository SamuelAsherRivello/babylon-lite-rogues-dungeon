import type { Page } from '@playwright/test';
import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSavedGame } from "./start-saved-game.ts";

const appPath = "/babylon-lite-rogues-dungeon/?mute=1";
const evidenceDirectory = join(tmpdir(), "rogues-dungeon-visual-review");
mkdirSync(evidenceDirectory, { recursive: true });

async function startGame(page: Page) {
  await page.goto(appPath);
  await openSavedGame(page);
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.locator(".title-bar__identity")).toHaveText("Rogue's Dungeon");
}

async function capture(page: Page, name: string) {
  await page.screenshot({ path: join(evidenceDirectory, `visual-review-${name}.png`), fullPage: true });
}

test("@layout landscape and PC portrait preview retain the full game UI", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await startGame(page);

  const shell = page.locator(".game-screen");
  const viewport = page.locator("#viewport");
  await expect(viewport).toHaveAttribute("data-orientation", "landscape");
  await expect(page.locator(".information-panels")).toBeVisible();
  await expect(page.getByRole("heading", { name: "MINIMAP" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "STATUS" })).toBeVisible();
  await expect(page.locator(".mobile_bottom")).toBeHidden();
  await expect(page.locator("[data-corner], .app_corner")).toHaveCount(0);
  const landscape = await shell.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const world = element.querySelector(".world-view")!.getBoundingClientRect();
    return { width: rect.width, height: rect.height, worldWidth: world.width, worldHeight: world.height, dpr: window.devicePixelRatio };
  });
  expect(landscape.worldWidth).toBeGreaterThan(landscape.worldHeight);
  await capture(page, "landscape-100-dpr1-windowed");

  await page.getByRole("button", { name: /Dev Settings.*Aspect/ }).click();
  await expect(viewport).toHaveAttribute("data-orientation", "portrait");
  await expect(page.getByRole("button", { name: "Control", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Info", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".mobile-controls")).toBeVisible();
  await expect(page.locator(".mobile-information-panels")).toBeHidden();
  const portrait = await shell.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const world = element.querySelector(".world-view")!.getBoundingClientRect();
    const title = element.querySelector(".title-bar")!.getBoundingClientRect();
    const status = element.querySelector(".status-bar")!.getBoundingClientRect();
    const bottom = element.querySelector(".mobile_bottom")!.getBoundingClientRect();
    return { width: rect.width, height: rect.height, world: { x: world.x, y: world.y, width: world.width, height: world.height }, title, status, bottom };
  });
  expect(portrait.world.y).toBeGreaterThanOrEqual(portrait.title.bottom - 1);
  expect(portrait.status.y).toBeGreaterThanOrEqual(portrait.world.y + portrait.world.height - 1);
  expect(portrait.bottom.y).toBeGreaterThanOrEqual(portrait.status.y + portrait.status.height - 1);
  await capture(page, "portrait-controls-dpr1-windowed");

  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(page.locator(".mobile-controls")).toBeHidden();
  await expect(page.locator(".mobile-information-panels")).toBeVisible();
  await expect(page.getByRole("heading", { name: "MINIMAP" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "STATUS" })).toBeVisible();
  await capture(page, "portrait-info-dpr1-windowed");
  await page.getByRole("button", { name: "Control", exact: true }).click();
  await expect(page.locator(".mobile-controls")).toBeVisible();
  await expect(page.locator(".world-view-region canvas")).toBeVisible();

  await page.keyboard.press("Control++");
  await page.waitForTimeout(150);
  await capture(page, "portrait-controls-increased-browser-zoom");
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect(page.locator("#browser_surface")).toHaveAttribute("data-fullscreen", "true");
  await capture(page, "portrait-controls-fullscreen");
  await page.keyboard.press("Escape");

  expect(consoleErrors).toEqual([]);
});

test("@layout mobile defaults to portrait and preserves the requested DPR", async ({ browser }) => {
  for (const deviceScaleFactor of [1, 2]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    });
    const page = await context.newPage();
    await startGame(page);
    await expect(page.locator("#viewport")).toHaveAttribute("data-orientation", "portrait");
    await expect(page.locator(".mobile-controls")).toBeVisible();
    await expect(page.locator(".mobile_status")).toBeVisible();
    await expect(page.locator(".dev_settings")).toHaveCount(0);
    await expect(page.locator(".world-view-region canvas")).toBeVisible();
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(deviceScaleFactor);
    await capture(page, `mobile-portrait-controls-dpr${deviceScaleFactor}`);
    await page.getByRole("button", { name: "Info", exact: true }).click();
    await expect(page.locator(".mobile-information-panels")).toBeVisible();
    await expect(page.getByRole("heading", { name: "STATUS" })).toBeVisible();
    await capture(page, `mobile-portrait-info-dpr${deviceScaleFactor}`);
    await context.close();
  }
});
