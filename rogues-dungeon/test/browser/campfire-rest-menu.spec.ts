import { expect, test } from "@playwright/test";

test("opens the campfire rest menu without a turn and rests for exactly one turn", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?seed=1&level=1&level-1-test-mode=true&slot=3&mute=1");
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  const timeBeforeBump = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Campfire" })).toBeVisible();
  await expect(page.getByText("You may rest one turn", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rest Or walk to choose" })).toBeVisible();
  await expect.poll(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time).toBe(timeBeforeBump);
  await page.getByRole("button", { name: "Rest Or walk to choose" }).click();
  await expect(page.getByRole("heading", { name: "Campfire" })).toHaveCount(0);
  await expect.poll(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3")!).floor.time).toBe(timeBeforeBump + 1);
});
