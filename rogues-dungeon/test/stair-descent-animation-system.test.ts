import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STAIR_DESCENT_DURATION_MS, STAIR_DESCENT_MASK_CROSSING_OFFSET_PX, STAIR_DESCENT_NET_STEP_PX, STAIR_DESCENT_STEP_DELAY_MS, STAIR_DESCENT_STEP_DURATION_MS, STAIR_DESCENT_UPWARD_PX, stairDescentHeading, stairDescentIsMasked, stairDescentOffset } from "../src/systems/animation/stair-descent-animation-system.ts";

test("stair descent rises five pixels then settles twenty pixels lower on every step", () => {
  assert.equal(stairDescentOffset(0), 0);
  assert.equal(stairDescentOffset(STAIR_DESCENT_STEP_DURATION_MS / 2), -5);
  assert.equal(stairDescentOffset(STAIR_DESCENT_STEP_DURATION_MS), STAIR_DESCENT_NET_STEP_PX);
  assert.equal(stairDescentOffset(STAIR_DESCENT_STEP_DURATION_MS + STAIR_DESCENT_STEP_DELAY_MS), STAIR_DESCENT_NET_STEP_PX);
  assert.equal(stairDescentOffset(STAIR_DESCENT_STEP_DURATION_MS + STAIR_DESCENT_STEP_DELAY_MS + STAIR_DESCENT_STEP_DURATION_MS / 2), STAIR_DESCENT_NET_STEP_PX - STAIR_DESCENT_UPWARD_PX);
  assert.equal(stairDescentOffset(STAIR_DESCENT_DURATION_MS), STAIR_DESCENT_NET_STEP_PX * 10);
});

test("stair descent completes when the hero passes under the mask lip", () => {
  assert.equal(stairDescentIsMasked(0), false);
  assert.equal(stairDescentIsMasked(STAIR_DESCENT_STEP_DURATION_MS * 2), false);
  assert.equal(stairDescentOffset(STAIR_DESCENT_DURATION_MS), STAIR_DESCENT_NET_STEP_PX * 10);
  assert.equal(stairDescentOffset(STAIR_DESCENT_DURATION_MS) >= STAIR_DESCENT_MASK_CROSSING_OFFSET_PX, true);
  assert.equal(stairDescentIsMasked(STAIR_DESCENT_DURATION_MS), true);
});

test("stair descent turns a north-facing hero south without changing other headings", () => {
  assert.equal(stairDescentHeading("n"), "s");
  assert.equal(stairDescentHeading("s"), "s");
  assert.equal(stairDescentHeading("e"), "e");
  assert.equal(stairDescentHeading("w"), "w");
});

test("the stair clip hides the player without drawing a foreground floor and clears after iris closure", () => {
  const source = readFileSync(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.match(source, /beginStairClip\(\)/);
  assert.match(source, /color: \[1, 1, 1, playerIsUnderStairs \? 0 : 1\]/);
  assert.match(source, /playerIsUnderStairs \? 0 : 1/);
  assert.doesNotMatch(source, /stairOcclusionLayer|stairOcclusions|stairLip/);
  assert.match(source, /sceneRef\.current\?\.clearStairClip\(\);[\s\S]*onStairDepartureComplete\?\.\(\);/);
});
