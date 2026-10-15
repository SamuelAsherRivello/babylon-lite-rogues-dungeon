import assert from "node:assert/strict";
import test from "node:test";
import { TweenAnimationSystem, type TweenScheduler } from "../src/systems/animation/tween-animation-system.ts";

test("tweens a number over scheduled frames and completes at the exact target", () => {
  let time = 0;
  const pending: { frame: FrameRequestCallback | null } = { frame: null };
  const scheduler: TweenScheduler = { now: () => time, requestFrame: (callback) => { pending.frame = callback; return 1; }, cancelFrame: () => { pending.frame = null; } };
  const values: number[] = [];
  let completed = false;
  new TweenAnimationSystem(scheduler).tween({ from: 2, to: 10, duration: 100, onUpdate: (value) => values.push(value), onComplete: () => { completed = true; } });
  time = 50; pending.frame?.(time);
  assert.equal(values.at(-1), 9);
  time = 100; pending.frame?.(time);
  assert.equal(values.at(-1), 10);
  assert.equal(completed, true);
});

test("cancelling a tween prevents later scheduled updates", () => {
  let time = 0;
  const pending: { frame: FrameRequestCallback | null } = { frame: null };
  const scheduler: TweenScheduler = { now: () => time, requestFrame: (callback) => { pending.frame = callback; return 1; }, cancelFrame: () => { pending.frame = null; } };
  const values: number[] = [];
  const cancel = new TweenAnimationSystem(scheduler).tween({ from: 0, to: 1, duration: 100, onUpdate: (value) => values.push(value) });
  cancel();
  time = 100; pending.frame?.(time);
  assert.deepEqual(values, [0]);
});
