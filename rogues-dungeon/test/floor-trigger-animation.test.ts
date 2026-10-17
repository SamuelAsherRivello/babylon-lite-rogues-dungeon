import assert from "node:assert/strict";
import test from "node:test";
import { createFloorTriggerAnimationEntity, FLOOR_TRIGGER_OFF_FRAME, FLOOR_TRIGGER_ON_FRAME } from "../src/content/world/floor-trigger-animation.ts";

test("plays the third props-animated row once and holds its final trigger frame", () => {
  const trigger = createFloorTriggerAnimationEntity("/");
  assert.equal(trigger.getState().frame.sheetFrame, FLOOR_TRIGGER_OFF_FRAME);
  trigger.selectAnimation("activate");
  trigger.start();
  trigger.update(200);
  assert.equal(trigger.getState().frame.sheetFrame, 15);
  trigger.update(400);
  assert.equal(trigger.getState().frame.sheetFrame, FLOOR_TRIGGER_ON_FRAME);
  assert.equal(trigger.getState().completed, true);
  trigger.selectAnimation("off");
  trigger.stop();
  assert.equal(trigger.getState().frame.sheetFrame, FLOOR_TRIGGER_OFF_FRAME);
});
