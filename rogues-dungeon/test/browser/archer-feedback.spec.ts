import { expect, test } from "@playwright/test";

test("renders a muted Skeleton Archer shot and its east-side received-damage feedback", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (let x = 49; x <= 55; x++) map[50][x] = 0;
    const cells = map.map((row) => row.map((cell) => ({ walkable: cell === 0, role: cell === 0 ? "floor" : "wall" })));
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 5, world: "One", realm: "Underground 3", floor: { generatorVersion: "fixture", seed: 1, width: 100, height: 100, map, cells, start: { x: 50, y: 50 }, time: 0, level: 3, entities: [{ id: "archer", kind: "enemy", name: "Skeleton Archer", x: 55, y: 50, hp: 20, maxHp: 20, damage: 4, xp: 1, awareness: 6, actionCooldown: 1, nextActionAt: 0, attackKind: "ranged", attackRange: 5, heading: "w", ai: { state: "idle", targetId: null } }] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 3, attributePoints: 0 },
      player: { x: 50, y: 50, heading: "w", resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false }, counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".dev_settings output")).not.toHaveText("FPS: --");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player.resources.health.current)).toBeLessThan(30);
  await expect(page.locator(".world-view__unsupported")).toHaveCount(0);
  expect(await page.locator("canvas").count()).toBeGreaterThan(0);
});
