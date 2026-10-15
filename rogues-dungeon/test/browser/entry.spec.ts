import { GENERATOR_VERSION } from '../../src/systems/procedural/world-procedural-system.ts';
import { expect, test } from "@playwright/test";
import path from "node:path";

test("@smoke opens the muted saved-game entry screen", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");

  await expect(page).toHaveURL(/\/babylon-lite-rogues-dungeon\/\?mute=1$/);
  await expect(page.getByRole("heading", { name: "Rogue's Dungeon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose Your Descent" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Saved Game [1-3]/ })).toHaveCount(3);
});

test("@smoke shows My First Quest in a new muted Saved Game", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.getByText("My First Quest", { exact: true })).toBeVisible();
  await expect(page.getByText("Walk through the stairs", { exact: true })).toBeVisible();
  await expect(page.getByText("Collect a Health Potion", { exact: true })).toBeVisible();
  await expect(page.getByText("Collect a coin", { exact: true })).toBeVisible();
});

test("@smoke clears local storage from the main menu", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.evaluate(() => {
    localStorage.setItem("rogues-dungeon.slot.1", "saved-game");
    localStorage.setItem("rogues-dungeon.preferences.v1", "preferences");
  });
  await page.reload();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear Local Storage" }).click();
  await expect(page.getByRole("heading", { name: "Choose Your Descent" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({ slot: localStorage.getItem("rogues-dungeon.slot.1"), preferences: localStorage.getItem("rogues-dungeon.preferences.v1") }))).toEqual({ slot: null, preferences: null });
});

test("@smoke anchors settings to its menu panel or live game view", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const menuPlacement = await page.evaluate(() => {
    const panel = document.querySelector(".main-menu-window")!.getBoundingClientRect();
    const dialog = document.querySelector(".settings-window")!.getBoundingClientRect();
    return { panel, dialog, background: getComputedStyle(document.querySelector(".settings-window")!).backgroundColor };
  });
  expect(Math.abs(menuPlacement.dialog.x - menuPlacement.panel.x)).toBeLessThan(1);
  expect(Math.abs(menuPlacement.dialog.y - menuPlacement.panel.y)).toBeLessThan(1);
  expect(Math.abs(menuPlacement.dialog.width - menuPlacement.panel.width)).toBeLessThan(1);
  expect(menuPlacement.dialog.bottom).toBeGreaterThan(menuPlacement.panel.bottom);
  expect(menuPlacement.background).not.toBe("rgb(16, 14, 23)");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".game-screen")).toBeVisible();
  await expect(page.locator(".world-view")).toBeVisible();
  await expect(page.locator(".minimap-view")).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const gamePlacement = await page.evaluate(() => {
    const view = document.querySelector(".world-view-region")!.getBoundingClientRect();
    const dialog = document.querySelector(".settings-window")!.getBoundingClientRect();
    return { view, dialog };
  });
  expect(Math.abs(gamePlacement.dialog.width - menuPlacement.dialog.width)).toBeLessThan(1);
  expect(Math.abs(gamePlacement.dialog.height - menuPlacement.dialog.height)).toBeLessThan(1);
  expect(Math.abs((gamePlacement.dialog.x + gamePlacement.dialog.width / 2) - (gamePlacement.view.x + gamePlacement.view.width / 2))).toBeLessThan(1);
  expect(Math.abs((gamePlacement.dialog.y + gamePlacement.dialog.height / 2) - (gamePlacement.view.y + gamePlacement.view.height / 2))).toBeLessThan(1);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".settings-window")).toHaveCount(0);
});

test("@smoke opens the named manual tile scenario and exports its editable map", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?world=1&level=1&slot=1&seed=13579&mute=1&debug-fix-map-autotiled=1&scenario=corridor-joins");
  await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.scenario)).toBe("corridor-joins");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Open Editable Copy" }).click();
  expect((await download).suggestedFilename()).toMatch(/rogues-dungeon-world-One-level-1-seed-13579\.zip/);
});

test("@smoke Tab never changes focus in the menu, game, or settings", async ({ page }) => {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  const assertTabDoesNothing = async () => {
    const before = await page.evaluateHandle(() => document.activeElement);
    for (const key of ["Tab", "Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(await page.evaluate((element) => document.activeElement === element, before)).toBe(true);
    }
    expect(await page.locator("button, input, select, a[href], canvas").evaluateAll((elements) => elements.every((element) => (element as HTMLElement).tabIndex === -1))).toBe(true);
    await before.dispose();
  };
  await assertTabDoesNothing();
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await assertTabDoesNothing();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await assertTabDoesNothing();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
});

test("@smoke expands the keyboard tray and logs temporary controls", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  const temporaryPresses: string[] = [];
  page.on("console", (message) => { if (message.text().includes("[keyboard-controls] Q pressed")) temporaryPresses.push(message.text()); });
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".controls-area")).toBeVisible();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  await expect(page.locator(".keyboard_collapsed_summary")).toContainText("Move");
  const regionBox = (await page.locator(".keyboard_controls_region").boundingBox())!;
  const collapsedTab = page.locator(".tab-control");
  const collapsedTabBox = (await collapsedTab.boundingBox())!;
  expect(Math.abs((collapsedTabBox.x + collapsedTabBox.width / 2) - (regionBox.x + regionBox.width / 2))).toBeLessThan(2);
  expect(Math.abs((collapsedTabBox.y + collapsedTabBox.height) - regionBox.y)).toBeLessThan(2);
  expect(collapsedTabBox.width).toBeLessThan(70);
  const collapsedKeyBox = (await page.locator(".keyboard_collapsed_controls .input-key").first().boundingBox())!;
  await collapsedTab.click();
  await page.waitForTimeout(300);
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  const expandedTab = page.locator(".tab-control");
  const expandedTabBox = (await expandedTab.boundingBox())!;
  const expandedPanelBox = (await page.locator(".keyboard_tray_panel").boundingBox())!;
  expect(Math.abs(expandedTabBox.height - collapsedTabBox.height)).toBeLessThan(1);
  expect(Math.abs((expandedTabBox.y + expandedTabBox.height) - expandedPanelBox.y)).toBeLessThan(2);
  await expect(page.locator(".input-key")).toHaveCount(24);
  await expect(page.locator(".keyboard_tray_key")).toHaveCount(12);
  await expect(page.locator(".keyboard_collapsed_controls .input-key").first()).toHaveAttribute("data-input-mode", "display");
  await expect(page.locator(".keyboard_tray_key").first()).toHaveAttribute("data-input-mode", "feedback");
  await page.keyboard.down("1");
  await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).toHaveClass(/input-key--pressed/);
  await page.keyboard.up("1");
  await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).not.toHaveClass(/input-key--pressed/);
  const expandedKeyBox = (await page.locator(".keyboard_tray_key").first().boundingBox())!;
  expect(Math.abs(expandedKeyBox.width - collapsedKeyBox.width)).toBeLessThan(1);
  expect(Math.abs(expandedKeyBox.height - collapsedKeyBox.height)).toBeLessThan(1);
  await page.mouse.move(0, 0);
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  await expect(page.locator(".keyboard_tray_title")).toBeVisible();
  const titleBox = (await page.locator(".keyboard_tray_title").boundingBox())!;
  expect(Math.abs((titleBox.y + titleBox.height / 2) - (regionBox.y + regionBox.height / 2))).toBeLessThan(2);
  await expandedTab.hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  await expect(page.locator(".keyboard_tray_label")).toHaveCount(0);
  await page.locator(".keyboard_tray_key", { hasText: "1" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Use ability 1");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.locator(".keyboard_tray_key", { hasText: "Q" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Use Quickslot 1");
  await page.locator(".keyboard_tray_key", { hasText: "W" }).hover({ force: true });
  await expect(page.locator(".keyboard_tray_title")).toHaveText("Move Up");
  await expect(page.locator(".controls-area_surface")).toHaveCSS("transition-duration", "0.25s");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("transition-duration", "0.25s");
  await page.locator(".keyboard_tray_key", { hasText: "Q" }).click({ force: true });
  expect(temporaryPresses).toHaveLength(0);
  await page.keyboard.press("q");
  expect(temporaryPresses).toHaveLength(1);
  await expandedTab.click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  await collapsedTab.click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await page.locator(".keyboard_tray_title").click();
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await page.locator(".keyboard_collapsed_controls .input-key").filter({ hasText: "Z" }).click({ force: true });
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await page.locator(".keyboard_tray_key").filter({ hasText: "Z" }).click({ force: true });
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  await page.keyboard.press("z");
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  await page.keyboard.press("z");
  await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
});

test("@smoke exposes only ability positions 1–3 and ignores key 4", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null, "heal"], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  const abilityRows = page.locator(".information-panels .info-panel--primary .slot_item--ability");
  await expect(abilityRows).toHaveCount(3);
  await expect(abilityRows).toHaveText([/\[1\]/, /\[2\]/, /\[3\]/]);
  await expect(page.locator(".information-panels .info-panel--primary")).not.toContainText("[04]");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.press("4");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(before);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player.abilities)).toEqual(["heal", "wand", null]);
});

test("@smoke resolves a visible level-up choice without another turn", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [{ id: "rat", kind: "enemy", name: "Cave Rat", x: 51, y: 50, hp: 1, maxHp: 1, damage: 0, xp: 8, awareness: 6, actionCooldown: 2, nextActionAt: 2 }] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 99, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(6, 6), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(99, 100), level: 1 } }, equipment: { weapons: [{ id: "stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 6 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Level 2: Choose a Stat" })).toBeVisible();
  await page.locator(".level-up-window").getByRole("button", { name: /Vitality/ }).click();
  await expect(page.getByRole("heading", { name: "Level 2: Choose a Stat" })).toBeHidden();
});

test("@smoke keeps moving when Shift is added to a held direction", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1));
    for (let x = 50; x <= 60; x++) map[50][x] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(40);
  await page.keyboard.down("Shift");
  await page.waitForTimeout(170);
  await page.keyboard.up("Shift");
  await page.keyboard.up("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBeGreaterThanOrEqual(3);
  const beforeSprintFirst = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  await page.keyboard.down("Shift");
  await page.keyboard.down("ArrowRight");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBeGreaterThan(beforeSprintFirst);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Shift");
});

test("@smoke opens a valid slot deep link and exposes map-fix controls only with its flag", async ({ page }) => {
  await page.addInitScript((generatorVersion: string) => {
    const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
    const resource = (current: number, currentMax: number) => ({ current, currentMax });
    localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
      version: 3, world: "One", realm: "Underground 1",
      floor: { seed: 17, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
      progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
      player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(0, 0), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
      counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
    }));
  }, GENERATOR_VERSION);
  await page.goto("/babylon-lite-rogues-dungeon/?world=1&level=1&slot=1&seed=17&mute=1&debug-fix-map-autotiled=1");
  await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  await expect(page.getByText("Map Fix")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles(path.resolve("rogues-dungeon/public/debug/fixtures/floor-17.tmj"));
  await expect(page.getByRole("alert")).toHaveCount(0);
});
