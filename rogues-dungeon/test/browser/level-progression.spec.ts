import { expect, test } from "@playwright/test";

const slotKey = "rogues-dungeon.slot.1";

async function openRolledCampaign(page: import("@playwright/test").Page) {
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  const dialog = page.getByRole("dialog", { name: "Create Character" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Roll" }).click();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator(".game-screen")).toBeVisible();
}

test("creates only confirmed characters and resumes the saved campaign", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  const dialog = page.getByRole("dialog", { name: "Create Character" });
  await expect(dialog).toHaveClass(/create-character-window--menu/);
  await expect(dialog.locator(".create-character-window__attributes .attribute_item b")).toHaveText(Array.from({ length: 10 }, () => "0"));
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), slotKey)).toBeNull();
  await openRolledCampaign(page);
  await expect.poll(() => page.locator(".information-panels .info-panel--secondary .attribute_item b").evaluateAll((values) => values.reduce((total, value) => total + Number(value.textContent), 0))).toBe(30);
  await expect.poll(() => page.evaluate((key) => {
    const campaign = JSON.parse(localStorage.getItem(key)!);
    return (["health", "stamina", "mana"] as const).every((name) => campaign.player.resources[name].currentMax === campaign.progression.attributes[name] * 10);
  }, slotKey)).toBe(true);
  await expect(page.locator(".world-view canvas")).toBeVisible();
  await expect(page.getByText(/requires WebGPU/i)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
  await expect.poll(() => page.evaluate((key) => Object.values(JSON.parse(localStorage.getItem(key)!).progression.attributes as Record<string, number>).reduce((total, value) => total + value, 0) === 30, slotKey)).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  await expect(page.locator(".game-screen")).toBeVisible();
});

test("keeps Attribute Point drafts local and retains the Attributes callout until all points are spent", async ({ page }) => {
  await openRolledCampaign(page);
  await page.evaluate((key) => {
    const campaign = JSON.parse(localStorage.getItem(key)!);
    campaign.progression.attributePoints = 3;
    localStorage.setItem(key, JSON.stringify(campaign));
  }, slotKey);
  await page.reload();
  await page.getByRole("button", { name: /Saved Game 1/ }).click();
  const callout = page.getByRole("heading", { name: "LEVEL UP", exact: true }).first();
  await expect(callout).toBeVisible();
  await page.getByRole("button", { name: "Open Progression" }).click();
  const progression = page.getByRole("dialog", { name: "Progression" });
  await progression.getByRole("button", { name: "Increase Health" }).click();
  await progression.getByRole("button", { name: "Close dialog" }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).progression.attributePoints, slotKey)).toBe(3);
  await expect(callout).toBeVisible();
  await page.getByRole("button", { name: "Open Progression" }).click();
  await progression.getByRole("button", { name: "Increase Health" }).click();
  await progression.getByRole("button", { name: "Confirm 1 Attribute Point" }).click();
  await expect(callout).toBeVisible();
  await page.getByRole("button", { name: "Open Progression" }).click();
  await progression.getByRole("button", { name: "Increase Health" }).click();
  await progression.getByRole("button", { name: "Increase Stamina" }).click();
  await progression.getByRole("button", { name: "Confirm 2 Attribute Points" }).click();
  await expect(callout).toHaveCount(0);
});

test("renders Status values and an accessible centered XP level", async ({ page }) => {
  await openRolledCampaign(page);
  const status = page.getByRole("button", { name: "Status", exact: true }).first();
  await expect(status).toBeVisible();
  await page.getByRole("button", { name: /health:/i }).hover();
  await expect(page.getByRole("tooltip")).toContainText(/\d+ \/ \d+\. Health remaining/);
  await expect(page.locator(".resource_level--empty").first()).toHaveText("LVL 01");
  await expect(page.locator(".resource_level--filled").first()).toHaveText("LVL 01");
});
