import { expect, test } from "@playwright/test";

test("auto scroll starts at the bottom, pauses, resumes, and supports opt-out", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.evaluate(async () => {
    const { createElement, createRoot, ScrollArea } = await import("/babylon-lite-rogues-dungeon/test/browser/fixtures/scroll-area.jsx");
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let count = 50;
    window.renderScrollAreas = () => {
      const entries = Array.from({ length: count++ }, (_, i) => createElement("p", { key: i }, `Entry ${i}`));
      root.render(createElement("div", null, ...[true, false].map((autoScroll) => createElement(ScrollArea, {
        key: String(autoScroll), autoScroll, "data-testid": autoScroll ? "following" : "normal",
        style: { height: "100px", width: "200px", overflowY: "scroll" },
      }, entries))));
    };
    window.renderScrollAreas();
  });
  const following = page.getByTestId("following");
  const normal = page.getByTestId("normal");
  const bottomGap = () => following.evaluate((element) => element.scrollHeight - element.clientHeight - element.scrollTop);
  await expect.poll(bottomGap).toBeLessThanOrEqual(1);
  await expect.poll(() => normal.evaluate((element) => element.scrollTop)).toBe(0);
  await page.evaluate(() => window.renderScrollAreas());
  await expect(following.locator("p")).toHaveCount(51);
  await expect.poll(bottomGap).toBeLessThanOrEqual(1);

  await following.evaluate((element) => { element.scrollTop = 100; });
  // Wait for the browser's scroll event before introducing another update.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.renderScrollAreas());
  await expect(following.locator("p")).toHaveCount(52);
  await expect.poll(() => following.evaluate((element) => element.scrollTop)).toBe(100);

  await following.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.evaluate(() => window.renderScrollAreas());
  await expect(following.locator("p")).toHaveCount(53);
  await expect.poll(bottomGap).toBeLessThanOrEqual(1);
  await following.evaluate((element) => { element.style.height = "60px"; });
  await expect.poll(bottomGap).toBeLessThanOrEqual(1);
  await expect.poll(() => normal.evaluate((element) => element.scrollTop)).toBe(0);
});
