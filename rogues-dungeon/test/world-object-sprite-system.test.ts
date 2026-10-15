import assert from "node:assert/strict";
import test from "node:test";
import { DUNGEON_STAIR_UP_FRAME, itemSpriteFrame } from "../src/systems/rendering/world-object-sprite-system.ts";

test("maps the exit stair to the verified dungeon tileset stair frame", () => {
  assert.equal(DUNGEON_STAIR_UP_FRAME, 42);
});

test("keeps non-stair objects on the item sprite sheet", () => {
  assert.equal(itemSpriteFrame("chest"), 0);
  assert.equal(itemSpriteFrame("key"), 5);
  assert.equal(itemSpriteFrame("potion", "health"), 6);
  assert.equal(itemSpriteFrame("potion", "mana"), 7);
});
