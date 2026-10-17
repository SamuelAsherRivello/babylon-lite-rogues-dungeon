import { expect, test } from "@playwright/test";
import { GENERATOR_VERSION } from "../../src/systems/procedural/world-procedural-system.ts";

test("@smoke retargets muted movement without delaying the next turn", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    map[50][50] = 0; map[50][51] = 0; map[50][52] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, attributePoints: 0 },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".world-view")).toBeVisible();
  const moveRight = page.locator(".mobile-controls__arrows button").filter({ hasText: "→" });
  await moveRight.evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(80);
  await moveRight.evaluate((button: HTMLButtonElement) => button.click());
  await expect.poll(() => page.evaluate(() => {
    const campaign = JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!);
    return { x: campaign.player.x, time: campaign.floor.time };
  })).toEqual({ x: 52, time: 2 });
  await test.info().attach("retargeted-sub-grid-movement", { body: await page.locator(".world-view").screenshot(), contentType: "image/png" });
});
