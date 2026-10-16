import assert from "node:assert/strict";
import test from "node:test";
import { CameraAnimationSystem, PLAYER_TAKE_DAMAGE_ANIMATION } from "../src/systems/animation/camera-animation-system.ts";
import { TweenAnimationSystem, type TweenScheduler } from "../src/systems/animation/tween-animation-system.ts";

test("player-take-damage grows the shared camera parent to 101% then restores it in 100ms", () => {
  let time = 0;
  const pending: { frame: FrameRequestCallback | null } = { frame: null };
  const scheduler: TweenScheduler = { now: () => time, requestFrame: (callback) => { pending.frame = callback; return 1; }, cancelFrame: () => { pending.frame = null; } };
  const scales: number[] = [];
  const target = { transform: { positionPx: [128, 96] as [number, number], scale: 1 }, render: () => { scales.push(target.transform.scale); } };
  new CameraAnimationSystem(new TweenAnimationSystem(scheduler)).play(PLAYER_TAKE_DAMAGE_ANIMATION, target);

  time = 50; pending.frame?.(time);
  assert.equal(target.transform.scale, 1.01);
  time = 100; pending.frame?.(time);
  assert.equal(target.transform.scale, 1);
  assert.ok(scales.includes(1.01));
  assert.equal(scales.at(-1), 1);
});
