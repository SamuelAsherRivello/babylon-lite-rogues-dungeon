import { expect, test } from "@playwright/test";
import path from "node:path";

test("@smoke opens the muted saved-game entry screen", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");

  await expect(page).toHaveURL(/\/babylon-lite-rogues-dungeon\/\?mute=1$/);
  await expect(page.getByRole("heading", { name: "Rogue's Dungeon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Saved Game [1-3]/ })).toHaveCount(3);
});

test("@smoke expands the keyboard tray and logs temporary controls", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current, currentMax) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  const temporaryPresses = [];
  page.on("console", (message) => { if (message.text().includes("[keyboard-controls] Q pressed")) temporaryPresses.push(message.text()); });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".keyboard_tray")).toBeVisible();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  await expect(page.locator(".keyboard_collapsed_summary")).toContainText("Move");
  await page.getByRole("button", { name: "Expand keyboard controls" }).click();
  await expect(page.getByRole("heading", { name: "KEYBOARD CONTROLS" })).toBeVisible();
  await expect(page.locator(".input-key")).toHaveCount(24);
  await expect(page.locator(".keyboard_tray_key")).toHaveCount(12);
  await expect(page.locator(".keyboard_tray_row").nth(0)).toContainText("Abilities:");
  await expect(page.locator(".keyboard_tray_row").nth(1)).toContainText("Quick:");
  await expect(page.locator(".keyboard_tray_row").nth(2)).toContainText("Move:");
  await expect(page.locator(".keyboard_tray_row").nth(3)).toContainText("More:");
  await expect(page.locator(".keyboard_tray_surface")).toHaveCSS("transition-duration", "0.25s");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("transition-duration", "0.25s");
  await page.locator(".keyboard_tray_key", { hasText: "Q" }).click({ force: true });
  expect(temporaryPresses).toHaveLength(0);
  await page.keyboard.press("q");
  expect(temporaryPresses).toHaveLength(1);
  await page.getByRole("button", { name: "Collapse keyboard controls" }).click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
});

test("@smoke exposes only ability positions 1–3 and ignores key 4", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current, currentMax) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null, "heal"], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  const abilityRows = page.locator(".desktop_info .primary .slot_item--ability");
  await expect(abilityRows).toHaveCount(3);
  await expect(abilityRows).toHaveText([/\[01\]/, /\[02\]/, /\[03\]/]);
  await expect(page.locator(".desktop_info .primary")).not.toContainText("[04]");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time);
  await page.keyboard.press("4");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time)).toBe(before);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).player.abilities)).toEqual(["heal", "wand", null]);
});

test("@smoke resolves a visible level-up choice without another turn", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current, currentMax) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [{ id: "rat", kind: "enemy", name: "Cave Rat", x: 51, y: 50, hp: 1, maxHp: 1, damage: 0, xp: 8, awareness: 6, actionCooldown: 2, nextActionAt: 2 }] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 99, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(6, 6), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(99, 100), level: 1 } }, equipment: { weapons: [{ id: "stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 6 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Level 2: Choose a Stat" })).toBeVisible();
  await page.locator(".level_up_chooser").getByRole("button", { name: /Vitality/ }).click();
  await expect(page.getByRole("heading", { name: "Level 2: Choose a Stat" })).toBeHidden();
});

test("@smoke keeps moving when Shift is added to a held direction", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (let x = 50; x <= 60; x++) map[50][x] = 0;
    const resource = (current, currentMax) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(40);
  await page.keyboard.down("Shift");
  await page.waitForTimeout(170);
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time)).toBeGreaterThanOrEqual(3);
  const beforeSprintFirst = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time);
  await page.keyboard.down("Shift");
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")).floor.time)).toBeGreaterThan(beforeSprintFirst);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Shift");
});

test("@smoke opens a valid slot deep link and exposes map-fix controls only with its flag", async ({ page }) => {
  await page.addInitScript(() => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current, currentMax) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 17, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(0, 0), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  });
  await page.goto("/babylon-lite-rogues-dungeon/?world=1&level=1&slot=1&seed=17&mute=1&debug-fix-map-autotiled=1");
  await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  await expect(page.getByText("Map Fix")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(path.resolve("rogues-dungeon/public/debug/fixtures/floor-17.tmj"));
  await expect(page.getByRole("alert")).toHaveCount(0);
});
