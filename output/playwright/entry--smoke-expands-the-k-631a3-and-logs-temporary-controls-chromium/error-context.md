# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: entry.spec.ts >> @smoke expands the keyboard tray and logs temporary controls
- Location: rogues-dungeon\test\browser\entry.spec.ts:59:1

# Error details

```
Error: locator.boundingBox: Error: strict mode violation: locator('.tab-control') resolved to 3 elements:
    1) <button tabindex="-1" type="button" class="tab-control" aria-expanded="true" aria-label="Collapse PrimaryInfoPanel tab">…</button> aka getByRole('button', { name: 'Collapse PrimaryInfoPanel tab' })
    2) <button tabindex="-1" type="button" class="tab-control" aria-expanded="true" aria-label="Collapse SecondaryInfoPanel tab">…</button> aka getByRole('button', { name: 'Collapse SecondaryInfoPanel' })
    3) <button tabindex="-1" type="button" class="tab-control" aria-expanded="false" aria-label="Expand keyboard controls">…</button> aka getByRole('button', { name: 'Expand keyboard controls' })

Call log:
  - waiting for locator('.tab-control')

```

# Page snapshot

```yaml
- main [ref=e6]:
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]: Rogue's Dungeon
      - generic [ref=e10]:
        - generic [ref=e11]: "World: 1"
        - generic [ref=e12]: "Level: 1"
      - generic [ref=e13]:
        - generic [ref=e14]:
          - img "Time" [ref=e15]: ⏱️
          - generic [ref=e16]: "00"
        - generic [ref=e17]:
          - img "Gold" [ref=e18]: 🪙
          - generic [ref=e19]: "0"
        - generic [ref=e20]:
          - img "Keys" [ref=e21]: 🔑
          - generic [ref=e22]: "01"
    - generic [ref=e23]:
      - generic "Zoom" [ref=e24] [cursor=pointer]:
        - generic [aria-hidden] [ref=e25]: ⌕
        - combobox "Zoom" [ref=e26]:
          - option "0.25x"
          - option "0.5x"
          - option "1x" [selected]
          - option "2x"
          - option "4x"
      - generic "Camera" [ref=e27] [cursor=pointer]:
        - generic [aria-hidden] [ref=e28]: ▣
        - combobox "Camera" [ref=e29]:
          - option "Center" [selected]
          - option "Deadzone"
          - option "Screen"
      - button "Fullscreen" [ref=e30] [cursor=pointer]:
        - generic [aria-hidden] [ref=e31]: ⛶
      - button "Settings" [ref=e32] [cursor=pointer]:
        - generic [aria-hidden] [ref=e33]: ⚙
  - generic [ref=e34]:
    - generic [ref=e36]:
      - generic "Pixel-perfect dungeon map" [ref=e37]
      - status [ref=e38]: Babylon Lite requires WebGPU. Enable WebGPU or use a compatible browser and device.
    - button "Collapse PrimaryInfoPanel tab" [expanded] [ref=e39] [cursor=pointer]:
      - generic [aria-hidden] [ref=e43]: ⌃
    - button "Collapse SecondaryInfoPanel tab" [expanded] [ref=e44] [cursor=pointer]:
      - generic [aria-hidden] [ref=e48]: ⌃
    - generic [ref=e49]:
      - complementary [ref=e50]:
        - generic [ref=e51]:
          - heading [level=2] [ref=e52]:
            - button "Abilities" [ref=e53]
          - generic [ref=e54]:
            - button "Drag Heal" [ref=e55]:
              - strong [ref=e56]: "[1]"
              - generic [ref=e57]: Heal
              - generic [ref=e58]: ✦
              - emphasis [ref=e59]: "5"
              - generic [aria-hidden] [ref=e60]: ⠿
            - button "Drag Wand" [ref=e61]:
              - strong [ref=e62]: "[2]"
              - generic [ref=e63]: Wand
              - generic [ref=e64]: ✹
              - emphasis [ref=e65]: "4"
              - generic [aria-hidden] [ref=e66]: ⠿
            - button "[3] Empty ability slot" [disabled] [ref=e67]:
              - strong [ref=e68]: "[3]"
              - generic "Empty ability slot" [ref=e69]: +
        - generic [ref=e70]:
          - heading [level=2] [ref=e71]:
            - button "Quick Slots" [ref=e72]
          - generic [ref=e73]:
            - button "[Q] Empty quick slot" [disabled] [ref=e74]:
              - generic [ref=e75]: "[Q]"
              - generic "Empty quick slot" [ref=e76]: +
            - button "[E] Empty quick slot" [disabled] [ref=e77]:
              - generic [ref=e78]: "[E]"
              - generic "Empty quick slot" [ref=e79]: +
        - generic [ref=e80]:
          - heading [level=2] [ref=e81]:
            - button "Equipment" [ref=e82]
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "Weapons" [level=3] [ref=e85]
              - button "Drag Wooden Stick" [ref=e86]:
                - generic [ref=e87]: Wooden Stick
                - generic [ref=e88]: ⚔
                - emphasis [ref=e89]: "+8"
                - generic [aria-hidden] [ref=e90]: ⠿
              - button "Empty equipment slot" [ref=e91]:
                - generic "Empty equipment slot" [ref=e92]: +
            - generic [ref=e93]:
              - heading "Armor" [level=3] [ref=e94]
              - button "Empty equipment slot" [ref=e95]:
                - generic "Empty equipment slot" [ref=e96]: +
              - button "Empty equipment slot" [ref=e97]:
                - generic "Empty equipment slot" [ref=e98]: +
        - generic [ref=e99]:
          - heading [level=2] [ref=e100]:
            - button "Inventory 02/10" [ref=e101]
          - generic [ref=e102]:
            - button "Drag Health Potion x 1" [ref=e103]:
              - generic [ref=e104]: Health Potion x 1
              - generic [ref=e105]: ◆
              - emphasis
              - generic [aria-hidden] [ref=e106]: ⠿
            - button "Drag Mana Potion x 2" [ref=e107]:
              - generic [ref=e108]: Mana Potion x 2
              - generic [ref=e109]: ◆
              - emphasis
              - generic [aria-hidden] [ref=e110]: ⠿
            - button "Empty inventory slot" [disabled] [ref=e111]:
              - generic "Empty inventory slot" [ref=e112]: +
            - button "Empty inventory slot" [disabled] [ref=e113]:
              - generic "Empty inventory slot" [ref=e114]: +
            - button "Empty inventory slot" [disabled] [ref=e115]:
              - generic "Empty inventory slot" [ref=e116]: +
            - button "Empty inventory slot" [disabled] [ref=e117]:
              - generic "Empty inventory slot" [ref=e118]: +
            - button "Empty inventory slot" [disabled] [ref=e119]:
              - generic "Empty inventory slot" [ref=e120]: +
            - button "Empty inventory slot" [disabled] [ref=e121]:
              - generic "Empty inventory slot" [ref=e122]: +
            - button "Empty inventory slot" [disabled] [ref=e123]:
              - generic "Empty inventory slot" [ref=e124]: +
            - button "Empty inventory slot" [disabled] [ref=e125]:
              - generic "Empty inventory slot" [ref=e126]: +
      - complementary [ref=e127]:
        - generic [ref=e128]:
          - heading [level=2] [ref=e129]:
            - button "Minimap" [ref=e130]
          - generic "Dungeon minimap" [ref=e133]
        - generic [ref=e134]:
          - heading [level=2] [ref=e135]:
            - button "Quest" [ref=e136]
          - paragraph [ref=e137]: Find the exit
        - generic [ref=e138]:
          - heading [level=2] [ref=e139]:
            - button "Resources" [ref=e140]
          - generic [ref=e141]:
            - 'button "health: 30 of 30" [ref=e142]':
              - 'generic "health: 30 of 30" [ref=e143]': ♥
            - 'button "stamina: 16 of 16" [ref=e148]':
              - 'generic "stamina: 16 of 16" [ref=e149]': ◈
            - 'button "offense: 8 of 8" [ref=e154]':
              - 'generic "offense: 8 of 8" [ref=e155]': ⚔
            - 'button "defense: 1 of 1" [ref=e160]':
              - 'generic "defense: 1 of 1" [ref=e161]': ⛨
            - 'button "mana: 12 of 12" [ref=e166]':
              - 'generic "mana: 12 of 12" [ref=e167]': ✦
            - 'button "xp: 0 of 100" [ref=e172]':
              - 'generic "xp: 0 of 100" [ref=e173]':
                - generic [ref=e174]: ★
                - emphasis [ref=e177]: "01"
        - generic [ref=e178]:
          - heading [level=2] [ref=e179]:
            - button "Attributes" [ref=e180]
          - generic [ref=e181]:
            - generic [ref=e182]:
              - generic [ref=e183]:
                - button "Health" [ref=e184]
                - generic [ref=e185]: "30"
              - generic [ref=e187]:
                - button "Stamina" [ref=e188]
                - generic [ref=e189]: "16"
              - generic [ref=e191]:
                - button "Offense" [ref=e192]
                - generic [ref=e193]: "8"
              - generic [ref=e195]:
                - button "Defense" [ref=e196]
                - generic [ref=e197]: "1"
              - generic [ref=e199]:
                - button "Mana" [ref=e200]
                - generic [ref=e201]: "12"
            - generic [ref=e203]:
              - generic [ref=e204]:
                - button "Vitality" [ref=e205]
                - generic [ref=e206]: "0"
              - generic [ref=e208]:
                - button "Strength" [ref=e209]
                - generic [ref=e210]: "0"
              - generic [ref=e212]:
                - button "Luck" [ref=e213]
                - generic [ref=e214]: "0"
              - generic [ref=e216]:
                - button "Recovery" [ref=e217]
                - generic [ref=e218]: "0"
              - generic [ref=e220]:
                - button "Stealth" [ref=e221]
                - generic [ref=e222]: "0"
        - heading [level=2] [ref=e225]:
          - button "Log" [ref=e226]
  - generic [ref=e229]:
    - generic [ref=e230]:
      - 'generic "Move WASD | Abilities: 123 | Quick: Q E | More ZXC" [ref=e232]':
        - generic [ref=e234]:
          - generic [ref=e235]: "Move:"
          - generic "Keyboard key W" [ref=e236]: W
          - generic "Keyboard key A" [ref=e237]: A
          - generic "Keyboard key S" [ref=e238]: S
          - generic "Keyboard key D" [ref=e239]: D
        - generic [ref=e241]:
          - generic [ref=e242]: "Abilities:"
          - generic "Keyboard key 1" [ref=e243]: "1"
          - generic "Keyboard key 2" [ref=e244]: "2"
          - generic "Keyboard key 3" [ref=e245]: "3"
        - generic [ref=e247]:
          - generic [ref=e248]: "Quick:"
          - generic "Keyboard key Q" [ref=e249]: Q
          - generic "Keyboard key E" [ref=e250]: E
        - generic [ref=e252]:
          - generic [ref=e253]: "More:"
          - generic "Keyboard key Z" [ref=e254]: Z
          - generic "Keyboard key X" [ref=e255]: X
          - generic "Keyboard key C" [ref=e256]: C
      - generic:
        - generic:
          - button "Expand keyboard controls" [ref=e257] [cursor=pointer]:
            - generic [aria-hidden] [ref=e261]: ⌃
          - region [aria-hidden]:
            - generic:
              - generic:
                - generic:
                  - generic: "1"
                  - generic: "2"
                  - generic: "3"
              - generic:
                - generic:
                  - generic: Q
                  - generic: W
                  - generic: E
              - generic:
                - generic:
                  - generic: A
                  - generic: S
                  - generic: D
              - generic:
                - generic:
                  - generic: Z
                  - generic: X
                  - generic: C
        - button [aria-hidden]: Controls
    - generic [ref=e262] [cursor=pointer]:
      - 'button "Dev Settings Aspect: Landscape" [ref=e263]'
      - 'button "Pivot Points: Off" [ref=e264]'
```

# Test source

```ts
  1   | import { GENERATOR_VERSION } from '../../src/systems/procedural-generation/procedural-generation-system.ts';
  2   | import { expect, test } from "@playwright/test";
  3   | import path from "node:path";
  4   | 
  5   | test("@smoke opens the muted saved-game entry screen", async ({ page }) => {
  6   |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  7   | 
  8   |   await expect(page).toHaveURL(/\/babylon-lite-rogues-dungeon\/\?mute=1$/);
  9   |   await expect(page.getByRole("heading", { name: "Rogue's Dungeon" })).toBeVisible();
  10  |   await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeVisible();
  11  |   await expect(page.getByRole("button", { name: /Saved Game [1-3]/ })).toHaveCount(3);
  12  | });
  13  | 
  14  | test("@smoke clears local storage from the main menu", async ({ page }) => {
  15  |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  16  |   await page.evaluate(() => {
  17  |     localStorage.setItem("rogues-dungeon.slot.1", "saved-game");
  18  |     localStorage.setItem("rogues-dungeon.preferences.v1", "preferences");
  19  |   });
  20  |   await page.reload();
  21  |   page.once("dialog", (dialog) => dialog.accept());
  22  |   await page.getByRole("button", { name: "Clear Local Storage" }).click();
  23  |   await expect(page.getByRole("heading", { name: "3 Saved Games" })).toBeVisible();
  24  |   await expect.poll(() => page.evaluate(() => ({ slot: localStorage.getItem("rogues-dungeon.slot.1"), preferences: localStorage.getItem("rogues-dungeon.preferences.v1") }))).toEqual({ slot: null, preferences: null });
  25  | });
  26  | 
  27  | test("@smoke opens the named manual tile scenario and exports its editable map", async ({ page }) => {
  28  |   await page.goto("/babylon-lite-rogues-dungeon/?world=1&level=1&slot=1&seed=13579&mute=1&debug-fix-map-autotiled=1&scenario=corridor-joins");
  29  |   await expect(page.getByRole("button", { name: "Open Editable Copy" })).toBeVisible();
  30  |   await page.keyboard.press("ArrowRight");
  31  |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.scenario)).toBe("corridor-joins");
  32  |   const download = page.waitForEvent("download");
  33  |   await page.getByRole("button", { name: "Open Editable Copy" }).click();
  34  |   expect((await download).suggestedFilename()).toMatch(/rogues-dungeon-world-One-level-1-seed-13579\.zip/);
  35  | });
  36  | 
  37  | test("@smoke Tab never changes focus in the menu, game, or settings", async ({ page }) => {
  38  |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  39  |   const assertTabDoesNothing = async () => {
  40  |     const before = await page.evaluateHandle(() => document.activeElement);
  41  |     for (const key of ["Tab", "Tab", "Shift+Tab"]) {
  42  |       await page.keyboard.press(key);
  43  |       expect(await page.evaluate((element) => document.activeElement === element, before)).toBe(true);
  44  |     }
  45  |     expect(await page.locator("button, input, select, a[href], canvas").evaluateAll((elements) => elements.every((element) => (element as HTMLElement).tabIndex === -1))).toBe(true);
  46  |     await before.dispose();
  47  |   };
  48  |   await assertTabDoesNothing();
  49  |   await page.getByRole("button", { name: /Saved Game 1/ }).click();
  50  |   await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  51  |   await assertTabDoesNothing();
  52  |   await page.getByRole("button", { name: "Settings", exact: true }).click();
  53  |   await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  54  |   await assertTabDoesNothing();
  55  |   await page.keyboard.press("Escape");
  56  |   await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
  57  | });
  58  | 
  59  | test("@smoke expands the keyboard tray and logs temporary controls", async ({ page }) => {
  60  |   await page.addInitScript((generatorVersion: string) => {
  61  |     const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
  62  |     const resource = (current: number, currentMax: number) => ({ current, currentMax });
  63  |     localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
  64  |       version: 3, world: "One", realm: "Underground 1",
  65  |       floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
  66  |       progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
  67  |       player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [{ id: "starter-stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
  68  |       counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
  69  |     }));
  70  |   }, GENERATOR_VERSION);
  71  |   const temporaryPresses: string[] = [];
  72  |   page.on("console", (message) => { if (message.text().includes("[keyboard-controls] Q pressed")) temporaryPresses.push(message.text()); });
  73  |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  74  |   await page.getByRole("button", { name: /Saved Game 1/ }).click();
  75  |   await expect(page.locator(".controls-area")).toBeVisible();
  76  |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  77  |   await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  78  |   await expect(page.locator(".keyboard_collapsed_summary")).toContainText("Move");
  79  |   const regionBox = (await page.locator(".keyboard_controls_region").boundingBox())!;
  80  |   const collapsedTab = page.locator(".tab-control");
> 81  |   const collapsedTabBox = (await collapsedTab.boundingBox())!;
      |                                               ^ Error: locator.boundingBox: Error: strict mode violation: locator('.tab-control') resolved to 3 elements:
  82  |   expect(Math.abs((collapsedTabBox.x + collapsedTabBox.width / 2) - (regionBox.x + regionBox.width / 2))).toBeLessThan(2);
  83  |   expect(Math.abs((collapsedTabBox.y + collapsedTabBox.height) - regionBox.y)).toBeLessThan(2);
  84  |   expect(collapsedTabBox.width).toBeLessThan(70);
  85  |   const collapsedKeyBox = (await page.locator(".keyboard_collapsed_controls .input-key").first().boundingBox())!;
  86  |   await collapsedTab.click();
  87  |   await page.waitForTimeout(300);
  88  |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  89  |   const expandedTab = page.locator(".tab-control");
  90  |   const expandedTabBox = (await expandedTab.boundingBox())!;
  91  |   const expandedPanelBox = (await page.locator(".keyboard_tray_panel").boundingBox())!;
  92  |   expect(Math.abs(expandedTabBox.height - collapsedTabBox.height)).toBeLessThan(1);
  93  |   expect(Math.abs((expandedTabBox.y + expandedTabBox.height) - expandedPanelBox.y)).toBeLessThan(2);
  94  |   await expect(page.locator(".input-key")).toHaveCount(24);
  95  |   await expect(page.locator(".keyboard_tray_key")).toHaveCount(12);
  96  |   await expect(page.locator(".keyboard_collapsed_controls .input-key").first()).toHaveAttribute("data-input-mode", "display");
  97  |   await expect(page.locator(".keyboard_tray_key").first()).toHaveAttribute("data-input-mode", "feedback");
  98  |   await page.keyboard.down("1");
  99  |   await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).toHaveClass(/input-key--pressed/);
  100 |   await page.keyboard.up("1");
  101 |   await expect(page.locator(".keyboard_tray_key", { hasText: "1" })).not.toHaveClass(/input-key--pressed/);
  102 |   const expandedKeyBox = (await page.locator(".keyboard_tray_key").first().boundingBox())!;
  103 |   expect(Math.abs(expandedKeyBox.width - collapsedKeyBox.width)).toBeLessThan(1);
  104 |   expect(Math.abs(expandedKeyBox.height - collapsedKeyBox.height)).toBeLessThan(1);
  105 |   await page.mouse.move(0, 0);
  106 |   await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  107 |   await expect(page.locator(".keyboard_tray_title")).toBeVisible();
  108 |   const titleBox = (await page.locator(".keyboard_tray_title").boundingBox())!;
  109 |   expect(Math.abs((titleBox.y + titleBox.height / 2) - (regionBox.y + regionBox.height / 2))).toBeLessThan(2);
  110 |   await expandedTab.hover({ force: true });
  111 |   await expect(page.locator(".keyboard_tray_title")).toHaveText("Controls");
  112 |   await expect(page.locator(".keyboard_tray_label")).toHaveCount(0);
  113 |   await page.locator(".keyboard_tray_key", { hasText: "1" }).hover({ force: true });
  114 |   await expect(page.locator(".keyboard_tray_title")).toHaveText("Use ability 1");
  115 |   await expect(page.getByRole("tooltip")).toHaveCount(0);
  116 |   await page.locator(".keyboard_tray_key", { hasText: "Q" }).hover({ force: true });
  117 |   await expect(page.locator(".keyboard_tray_title")).toHaveText("Use Quickslot 1");
  118 |   await page.locator(".keyboard_tray_key", { hasText: "W" }).hover({ force: true });
  119 |   await expect(page.locator(".keyboard_tray_title")).toHaveText("Move Up");
  120 |   await expect(page.locator(".controls-area_surface")).toHaveCSS("transition-duration", "0.25s");
  121 |   await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("transition-duration", "0.25s");
  122 |   await page.locator(".keyboard_tray_key", { hasText: "Q" }).click({ force: true });
  123 |   expect(temporaryPresses).toHaveLength(0);
  124 |   await page.keyboard.press("q");
  125 |   expect(temporaryPresses).toHaveLength(1);
  126 |   await expandedTab.click();
  127 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  128 |   await expect(page.locator(".keyboard_tray_panel")).toHaveCSS("opacity", "0");
  129 |   await collapsedTab.click();
  130 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  131 |   await page.locator(".keyboard_tray_title").click();
  132 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  133 |   await page.locator(".keyboard_collapsed_controls .input-key").filter({ hasText: "Z" }).click({ force: true });
  134 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  135 |   await page.locator(".keyboard_tray_key").filter({ hasText: "Z" }).click({ force: true });
  136 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  137 |   await page.keyboard.press("z");
  138 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "false");
  139 |   await page.keyboard.press("z");
  140 |   await expect(page.locator(".keyboard_tray_panel")).toHaveAttribute("aria-hidden", "true");
  141 | });
  142 | 
  143 | test("@smoke exposes only ability positions 1–3 and ignores key 4", async ({ page }) => {
  144 |   await page.addInitScript((generatorVersion: string) => {
  145 |     const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0;
  146 |     const resource = (current: number, currentMax: number) => ({ current, currentMax });
  147 |     localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
  148 |       version: 3, world: "One", realm: "Underground 1",
  149 |       floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [] },
  150 |       progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 0, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
  151 |       player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(8, 8), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(0, 100), level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null, "heal"], sneaking: false },
  152 |       counters: { keys: 1, gold: 0 }, objective: "Find the exit", log: [],
  153 |     }));
  154 |   }, GENERATOR_VERSION);
  155 |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  156 |   await page.getByRole("button", { name: /Saved Game 1/ }).click();
  157 |   const abilityRows = page.locator(".desktop_info .primary .slot_item--ability");
  158 |   await expect(abilityRows).toHaveCount(3);
  159 |   await expect(abilityRows).toHaveText([/\[1\]/, /\[2\]/, /\[3\]/]);
  160 |   await expect(page.locator(".desktop_info .primary")).not.toContainText("[04]");
  161 |   const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time);
  162 |   await page.keyboard.press("4");
  163 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).floor.time)).toBe(before);
  164 |   await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("rogues-dungeon.slot.1")!).player.abilities)).toEqual(["heal", "wand", null]);
  165 | });
  166 | 
  167 | test("@smoke resolves a visible level-up choice without another turn", async ({ page }) => {
  168 |   await page.addInitScript((generatorVersion: string) => {
  169 |     const map = Array.from({ length: 100 }, () => Array(100).fill(1)); map[50][50] = 0; map[50][51] = 0;
  170 |     const resource = (current: number, currentMax: number) => ({ current, currentMax });
  171 |     localStorage.setItem("rogues-dungeon.slot.1", JSON.stringify({
  172 |       version: 3, world: "One", realm: "Underground 1",
  173 |       floor: { generatorVersion, seed: 1, width: 100, height: 100, map, start: { x: 50, y: 50 }, time: 0, level: 1, entities: [{ id: "rat", kind: "enemy", name: "Cave Rat", x: 51, y: 50, hp: 1, maxHp: 1, damage: 0, xp: 8, awareness: 6, actionCooldown: 2, nextActionAt: 2 }] },
  174 |       progression: { attributes: { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 }, level: 1, xp: 99, nextXp: 100, totalKills: 0, difficulty: 1, pendingUpgrades: [] },
  175 |       player: { x: 50, y: 50, resources: { health: resource(30, 30), stamina: resource(16, 16), offense: resource(6, 6), defense: resource(1, 1), mana: resource(12, 12), xp: { ...resource(99, 100), level: 1 } }, equipment: { weapons: [{ id: "stick", name: "Wooden Stick", group: "weapons", modifiers: { offense: 6 } }, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: ["heal", "wand", null], sneaking: false },
  176 |       counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [],
  177 |     }));
  178 |   }, GENERATOR_VERSION);
  179 |   await page.goto("/babylon-lite-rogues-dungeon/?mute=1");
  180 |   await page.getByRole("button", { name: /Saved Game 1/ }).click();
  181 |   await page.keyboard.press("ArrowRight");
```