import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { CAMPFIRE_IDLE_FRAME_DURATION_MS, campfireIdleFramePaths } from "../src/content/world/campfire-idle-animation.ts";

test("campfire idle animation uses three generated frames at hero idle cadence", async () => {
  assert.equal(CAMPFIRE_IDLE_FRAME_DURATION_MS, 140);
  const frames = campfireIdleFramePaths();
  assert.equal(frames.length, 3);
  await Promise.all(frames.map((_, index) => access(new URL(`../public/assets/art/custom/campfire-idle-${index + 1}.png`, import.meta.url))));
});

test("campfire rest menu is a transient bump prompt that waits only after confirmation", async () => {
  const [game, renderer, css] = await Promise.all([
    readFile(new URL("../src/game/game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(game, /if \(target\?\.kind === "campfire"\) \{ setCampfireMenu\(\{ x: target\.x, y: target\.y \}\); return \{ accepted: false/);
  assert.match(game, /const restAtCampfire = useCallback\(\(\) => \{ setCampfireMenu\(null\); return dispatch\(\{ type: "wait" \}\); \}/);
  assert.match(game, /if \(campfireMenu\) setCampfireMenu\(null\)/);
  assert.match(renderer, /<h2>Campfire<\/h2><p>You may rest one turn<\/p><button/);
  assert.match(game, /campfireMenu=\{campfireMenu\}/);
  assert.match(renderer, /findWorldTooltipPosition\(rect, \{ width: panel\.offsetWidth, height: panel\.offsetHeight \}, \[cellRect\(campfireMenu\.x, campfireMenu\.y\), cellRect\(campaign\.player\.x, campaign\.player\.y\)\]/);
  assert.match(css, /\.world-view__campfire-menu \{[^}]*z-index:9/);
});
