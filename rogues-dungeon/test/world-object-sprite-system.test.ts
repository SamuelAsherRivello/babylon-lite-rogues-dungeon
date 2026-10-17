import assert from "node:assert/strict";
import test from "node:test";
import { chestSpriteFrame, DUNGEON_STAIR_UP_FRAME, itemSpriteFrame, OBJECTS_OVERLAY_BARREL_FRAME, OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, OBJECTS_OVERLAY_DOOR_OPEN_FRAME, OBJECTS_OVERLAY_CHEST_CLOSED_FRAME, OBJECTS_OVERLAY_CHEST_OPEN_FRAME, OBJECTS_OVERLAY_TRIGGER_ACTIVE_FRAME, OBJECTS_OVERLAY_TRIGGER_INACTIVE_FRAME, puzzleObjectSpriteFrame } from "../src/systems/rendering/world-object-sprite-system.ts";

test("maps the exit stair to the verified dungeon tileset stair frame", () => {
  assert.equal(DUNGEON_STAIR_UP_FRAME, 42);
});

test("keeps non-chest objects on the item sprite sheet", () => {
  assert.equal(itemSpriteFrame("key"), 5);
  assert.equal(itemSpriteFrame("potion", "health"), 6);
  assert.equal(itemSpriteFrame("potion", "mana"), 7);
});

test("uses the bronze Objects Overlay chest pair", () => {
  assert.equal(chestSpriteFrame(false), OBJECTS_OVERLAY_CHEST_CLOSED_FRAME);
  assert.equal(chestSpriteFrame(true), OBJECTS_OVERLAY_CHEST_OPEN_FRAME);
});

test("maps each floor-trigger puzzle state to a bounded Objects Overlay frame", () => {
  assert.equal(puzzleObjectSpriteFrame("barrel", false), OBJECTS_OVERLAY_BARREL_FRAME);
  assert.equal(puzzleObjectSpriteFrame("trigger", false), OBJECTS_OVERLAY_TRIGGER_INACTIVE_FRAME);
  assert.equal(puzzleObjectSpriteFrame("trigger", true), OBJECTS_OVERLAY_TRIGGER_ACTIVE_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", false), OBJECTS_OVERLAY_DOOR_CLOSED_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", true), OBJECTS_OVERLAY_DOOR_OPEN_FRAME);
});
