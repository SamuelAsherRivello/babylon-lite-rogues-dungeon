import assert from "node:assert/strict";
import test from "node:test";
import { CHEST_MAIN_ART_ANCHOR_OFFSET_PX, DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX, DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX, DUNGEON_STAIR_UP_FRAME, doorMainArtAnchorOffset, itemSpriteFrame, OBJECTS_OVERLAY_BARREL_FRAME, OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, OBJECTS_OVERLAY_DOOR_OPEN_FRAME, pickupMainArtPresentation, puzzleObjectSpriteFrame } from "../src/systems/rendering/world-object-sprite-system.ts";

test("maps the exit stair to the verified dungeon tileset stair frame", () => {
  assert.equal(DUNGEON_STAIR_UP_FRAME, 42);
});

test("keeps non-chest objects on the item sprite sheet", () => {
  assert.equal(itemSpriteFrame("key"), 5);
  assert.equal(itemSpriteFrame("potion", "health"), 6);
  assert.equal(itemSpriteFrame("potion", "mana"), 7);
});

test("opts only restorative potions into main-art oscillation", () => {
  assert.deepEqual(pickupMainArtPresentation("potion", "health"), { mainOffsetPx: -8, oscillationAmplitudePx: 1.5, shadowWidthScale: 1, shadowHeightScale: 1 });
  assert.deepEqual(pickupMainArtPresentation("potion", "mana"), { mainOffsetPx: -8, oscillationAmplitudePx: 1.5, shadowWidthScale: 1, shadowHeightScale: 1 });
  assert.deepEqual(pickupMainArtPresentation("key"), { mainOffsetPx: -8, oscillationAmplitudePx: 0, shadowWidthScale: 0.5, shadowHeightScale: 0.5 });
  assert.deepEqual(pickupMainArtPresentation("gold"), { mainOffsetPx: 0, oscillationAmplitudePx: 0, shadowWidthScale: 1, shadowHeightScale: 1 });
  assert.deepEqual(pickupMainArtPresentation("item"), { mainOffsetPx: 0, oscillationAmplitudePx: 0, shadowWidthScale: 1, shadowHeightScale: 1 });
});

test("maps barrel and door puzzle states to their dedicated static frames", () => {
  assert.equal(puzzleObjectSpriteFrame("barrel", false), OBJECTS_OVERLAY_BARREL_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", true), OBJECTS_OVERLAY_DOOR_OPEN_FRAME);
  assert.equal(puzzleObjectSpriteFrame("door", false), OBJECTS_OVERLAY_DOOR_CLOSED_FRAME);
  assert.equal(OBJECTS_OVERLAY_DOOR_OPEN_FRAME, 0);
  assert.equal(OBJECTS_OVERLAY_DOOR_CLOSED_FRAME, 1);
});

test("keeps chest and door main-art anchors distinct", () => {
  assert.equal(CHEST_MAIN_ART_ANCHOR_OFFSET_PX, 16);
  assert.equal(doorMainArtAnchorOffset(false), DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX);
  assert.equal(doorMainArtAnchorOffset(true), DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX);
  assert.equal(DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX - DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX, 16);
});
