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

test("campfire rest menu confirms on a second bump and uses a protected rest-time turn", async () => {
  const [game, renderer, world, css] = await Promise.all([
    readFile(new URL("../src/game/game.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/systems/procedural/world-procedural-system.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/ui/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(game, /if \(campfireMenu\?\.x === target\.x && campfireMenu\.y === target\.y\) \{ setCampfireRestConfirming\(true\)/);
  assert.match(game, /\}, 200\);/);
  assert.match(game, /const restAtCampfire = useCallback\(\(\) => \{ setCampfireMenu\(null\); setCampfireRestTransition\(true\); \}/);
  assert.match(game, /sessionRef\.current\?\.dispatch\(\{ type: "rest" \}\)/);
  assert.match(game, /if \(campfireMenu\) setCampfireMenu\(null\)/);
  assert.match(renderer, /campfireRestTransition\) \{ setWorldAlive\(false\); setIrisRequested\(true\);/);
  assert.match(renderer, /if \(campfireRestTransition\) onCampfireRestClosed\?\.\(\)/);
  assert.match(renderer, /world-view__campfire-menu-rest--confirming/);
  assert.match(renderer, /<h2>Campfire<\/h2><p>You may rest one turn<\/p><button[\s\S]*<span>Rest<\/span><i>Or walk to choose<\/i>/);
  assert.match(game, /campfireMenu=\{campfireMenu\}/);
  assert.match(renderer, /findWorldTooltipPosition\(rect, \{ width: panel\.offsetWidth, height: panel\.offsetHeight \}, \[cellRect\(campfireMenu\.x, campfireMenu\.y\), cellRect\(campaign\.player\.x, campaign\.player\.y\)\]/);
  assert.match(world, /if \(action\.type === "rest"\) \{ tick\(state, events, true\); return \{ state, events, accepted: true, ticks: 1 \}; \}/);
  assert.match(world, /if \(!restTime\) enemyPhase\(state, events\)/);
  assert.match(css, /\.world-view__campfire-menu \{[^}]*z-index:9/);
  assert.match(css, /\.world-view__campfire-menu-rest--confirming/);
});
