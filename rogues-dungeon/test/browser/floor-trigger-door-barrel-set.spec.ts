import { expect, test } from "@playwright/test";
import { GENERATOR_VERSION } from "../../src/systems/procedural/world-procedural-system.ts";

test("@smoke pushes a barrel onto its floor trigger in a muted Edge session", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (const [x, y] of [[47, 50], [48, 50], [49, 50], [50, 50], [51, 50], [52, 50], [53, 50], [54, 50], [55, 50], [49, 51]] as const) map[y][x] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: {
        generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 47, y: 50 }, time: 0, level: 1,
        entities: [{ id: "depth-rat", kind: "enemy", name: "Rat", x: 49, y: 51, hp: 3, maxHp: 3, damage: 0, xp: 1, awareness: 0, actionCooldown: 9, nextActionAt: 9 }],
        objectSets: [{ id: "fixture", kind: "floor-trigger-door-barrel", barrel: { x: 48, y: 50 }, trigger: { x: 49, y: 50 }, door: { x: 54, y: 50 }, regionRole: "optional-reward" }],
      },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 47, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false }, counters: { keys: 0, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".world-view")).toBeVisible();
  await expect(page.locator(".world-view canvas")).toHaveCount(1);
  await expect(page.getByText(/requires WebGPU/i)).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player)).toMatchObject({ x: 47, y: 50 });
  await page.waitForTimeout(1000);
  await page.locator(".world-view canvas").click();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.objectSets[0].barrel)).toEqual({ x: 49, y: 50 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player)).toMatchObject({ x: 48, y: 50 });
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.entities.find((entity: { id: string }) => entity.id === "depth-rat"))).toMatchObject({ x: 49, y: 51 });
  await page.screenshot({ path: "output/playwright/render-depth-barrel.png" });
});
