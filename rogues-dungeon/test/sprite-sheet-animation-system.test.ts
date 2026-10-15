import assert from "node:assert/strict";
import test from "node:test";
import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition } from "../src/systems/animation/sprite-animation-system.ts";

const frame = (path: string, widthPx = 32, heightPx = 48) => ({ path, widthPx, heightPx });
const definitions: SpriteAnimationDefinition[] = [
  { name: "Idle", source: { kind: "frames", frames: [frame("idle-0"), frame("idle-1")] }, frameDurationMs: 100, loopCount: -1 },
  { name: "Burst", source: { kind: "sheet", path: "burst.png", cellWidthPx: 16, cellHeightPx: 16, columns: 2, rows: 2, frameCount: 3 }, frameDurationMs: 50, loopCount: 1 },
];

test("lists individual-frame and sprite-sheet animations", () => {
  const entity = createSpriteSheetAnimationEntity(definitions);
  assert.deepEqual(entity.listAnimations().map(({ name, frameCount }) => ({ name, frameCount })), [{ name: "Idle", frameCount: 2 }, { name: "Burst", frameCount: 3 }]);
  assert.equal(entity.listAnimations()[1].frames[2].sheetFrame, 2);
});

test("starts, stops, and advances an infinite animation", () => {
  const entity = createSpriteSheetAnimationEntity(definitions);
  assert.equal(entity.getState().playing, false);
  entity.start(); entity.update(100);
  assert.deepEqual(entity.getState(), { animation: "Idle", speed: 1, frameIndex: 1, frame: frame("idle-1"), playing: true, completed: false, loopsCompleted: 0 });
  entity.stop(); entity.update(100);
  assert.equal(entity.getState().frameIndex, 1);
  entity.dispose();
  assert.throws(() => entity.getState(), /disposed/);
});

test("applies entity animation speed to frame timing and exposes speed controls", () => {
  const entity = createSpriteSheetAnimationEntity([{ name: "slow", source: { kind: "frames", frames: [frame("slow-0"), frame("slow-1")] }, frameDurationMs: 100, loopCount: -1 }], "slow", { speed: 0.5 });
  entity.start(); entity.update(100);
  assert.equal(entity.getState().frameIndex, 0);
  assert.equal(entity.getState().speed, 0.5);
  entity.setSpeed(1); entity.update(100);
  assert.equal(entity.getState().frameIndex, 1);
});

test("plays loopCount zero once and positive counts as additional repeats", () => {
  const entity = createSpriteSheetAnimationEntity([{ name: "OneShot", source: { kind: "frames", frames: [frame("a", 8, 8), frame("b", 8, 8)] }, frameDurationMs: 10, loopCount: 0 }]);
  entity.start(); entity.update(20);
  assert.equal(entity.getState().completed, true); assert.equal(entity.getState().playing, false); assert.equal(entity.getState().loopsCompleted, 1);
  const repeated = createSpriteSheetAnimationEntity([{ name: "Twice", source: { kind: "frames", frames: [frame("a", 8, 8), frame("b", 8, 8)] }, frameDurationMs: 10, loopCount: 1 }]);
  repeated.start(); repeated.update(40);
  assert.equal(repeated.getState().completed, true); assert.equal(repeated.getState().loopsCompleted, 2);
});

test("rejects malformed definitions and unknown selections", () => {
  assert.throws(() => createSpriteSheetAnimationEntity([{ name: "Bad", source: { kind: "frames", frames: [] }, frameDurationMs: 10, loopCount: 0 }]), /at least one frame/);
  assert.throws(() => createSpriteSheetAnimationEntity([{ name: "Bad", source: { kind: "sheet", path: "x", cellWidthPx: 8, cellHeightPx: 8, columns: 1, rows: 1 }, frameDurationMs: 10, loopCount: -2 }]), /loopCount/);
  const entity = createSpriteSheetAnimationEntity(definitions);
  assert.throws(() => entity.selectAnimation("Missing"), /unknown animation/);
});
