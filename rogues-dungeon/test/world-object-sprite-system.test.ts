import assert from "node:assert/strict";
import test from "node:test";
import { DUNGEON_STAIR_UP_FRAME, itemSpriteFrame, OBJECTS_OVERLAY_BARREL_FRAME, OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, OBJECTS_OVERLAY_DOOR_OPEN_FRAME, puzzleObjectSpriteFrame } from "../src/systems/rendering/world-object-sprite-system.ts";

test("maps the exit stair to the verified dungeon tileset stair frame", () => {
  assert.equal(DUNGEON_STAIR_UP_FRAME, 42);
});

test("keeps non-chest objects on the item sprite sheet", () => {
  assert.equal(itemSpriteFrame("key"), 5);
  assert.equal(itemSpriteFrame("potion", "health"), 6);
  assert.equal(itemSpriteFrame("potion", "mana"), 7);
});

test("maps barrel and door puzzle states to their dedicated static frames", () => {
  assert.equal(puzzleObjectSpriteFrame("barrel", false), OBJECTS_OVERLAY_BARREL_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", true), OBJECTS_OVERLAY_DOOR_OPEN_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", false), OBJECTS_OVERLAY_DOOR_CLOSED_FRAME);
  assert.equal(OBJECTS_OVERLAY_DOOR_OPEN_FRAME, 0);
  assert.equal(OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, 1);
});
