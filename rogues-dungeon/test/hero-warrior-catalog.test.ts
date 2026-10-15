import assert from "node:assert/strict";
import test from "node:test";
import { HERO_WARRIOR_ANIMATION_NAMES, createHeroWarriorAnimationEntity, heroWarriorAnimationCatalog, heroWarriorIdleAnimationForHeading } from "../src/content/characters/hero-warrior/hero-warrior-animation.ts";

test("preserves all Hero Warrior animation groups and directional sequences", () => {
  const catalog = heroWarriorAnimationCatalog("/game/");
  assert.deepEqual(catalog.map(({ name }) => name), HERO_WARRIOR_ANIMATION_NAMES);
  assert.deepEqual(catalog.map(({ frameCount }) => frameCount), [4, 4, 4, 6, 6, 6, 4, 4, 4, 6]);
  assert.equal(catalog[0].frames[0].widthPx, 32); assert.equal(catalog[0].frames[0].heightPx, 48);
  assert.equal(catalog.at(-1)?.frames[0].widthPx, 48); assert.equal(catalog.at(-1)?.frames[0].heightPx, 48);
  assert.equal(catalog[0].frames[0].path, "/game/assets/art/vendors/dungeons-and-pixels-v1.4/Characters/Hero_Warrior/Frames/Idle/Down/00.png");
});

test("starts the player on right-facing Idle/Side and exposes deferred action animations", () => {
  const entity = createHeroWarriorAnimationEntity("/game/");
  assert.equal(entity.getState().animation, "Idle/Side");
  assert.equal(entity.getSpeed(), 0.5);
  entity.selectAnimation("Attack/Side"); assert.equal(entity.getState().animation, "Attack/Side");
  entity.selectAnimation("Death"); assert.equal(entity.getState().animation, "Death");
});

test("maps character headings to directional idle art", () => {
  assert.equal(heroWarriorIdleAnimationForHeading("e"), "Idle/Side");
  assert.equal(heroWarriorIdleAnimationForHeading("w"), "Idle/Side");
  assert.equal(heroWarriorIdleAnimationForHeading("n"), "Idle/Up");
  assert.equal(heroWarriorIdleAnimationForHeading("s"), "Idle/Down");
});
