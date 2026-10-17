import { expect, test } from "@playwright/test";

test("@smoke renders a closed test chest left of the level-one entrance", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?seed=1&level=1&level-1-test-mode=true&slot=3&mute=1");
  await page.getByRole("button", { name: /Saved Game 3/ }).click();
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3") ?? "null");
    return campaign?.floor.entities.find((entity: { id: string }) => entity.id === "test-chest");
  })).toEqual({ id: "test-chest", kind: "chest", opened: false, x: 49, y: 50 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.3") ?? "null")?.floor.entities.filter((entity: { kind: string }) => entity.kind === "chest").length)).toBe(1);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => page.evaluate(() => {
    const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.3") ?? "null");
    const chest = campaign?.floor.entities.find((entity: { id: string }) => entity.id === "test-chest");
    const coins = campaign?.floor.entities.filter((entity: { id: string; kind: string }) => entity.kind === "gold" && entity.id.startsWith("chest-gold-"));
    return { player: { x: campaign?.player.x, y: campaign?.player.y }, opened: chest?.opened, coins: coins?.length };
  })).toEqual({ player: { x: 50, y: 50 }, opened: true, coins: 3 });
  await page.locator(".world-view").screenshot({ path: "output/playwright/test-chest.png" });
});
