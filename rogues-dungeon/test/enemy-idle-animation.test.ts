import assert from "node:assert/strict";
import test from "node:test";
import { createEnemyIdleAnimationDefinitions, createEnemyIdleAnimationEntities } from "../src/content/enemies/enemy-idle-animation.ts";

test("enemy idle definitions enumerate the source frames at their native dimensions", () => {
  const definitions = createEnemyIdleAnimationDefinitions("/game/");
  assert.deepEqual(definitions.map(({ name, source }) => [name, source.frames.length, source.frames[0]]), [
    ["rat", 5, { path: "/game/assets/art/vendors/dungeons-and-pixels-v1.4/enemies/rat/frames/idle/00.png", widthPx: 32, heightPx: 32 }],
    ["skeleton", 4, { path: "/game/assets/art/vendors/dungeons-and-pixels-v1.4/enemies/skeleton-warrior/frames/idle/down/00.png", widthPx: 32, heightPx: 48 }],
  ]);
});

test("enemy idle animations loop", () => {
  const animations = createEnemyIdleAnimationEntities("/game/", 1);
  animations.rat.start(); animations.skeleton.start();
  animations.rat.update(700); animations.skeleton.update(560);
  assert.equal(animations.rat.getState().completed, false);
  assert.equal(animations.skeleton.getState().completed, false);
  assert.equal(animations.rat.getState().loopsCompleted, 1);
  assert.equal(animations.skeleton.getState().loopsCompleted, 1);
});
