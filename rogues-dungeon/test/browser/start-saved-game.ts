import type { Page } from "@playwright/test";

export async function openSavedGame(page: Page, slot: 1 | 2 | 3 = 1) {
  await page.getByRole("button", { name: new RegExp(`Saved Game ${slot}`) }).click();
  const roll = page.getByRole("button", { name: "Roll", exact: true });
  if (await roll.isVisible()) {
    await roll.click();
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
  }
}
