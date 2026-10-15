import assert from "node:assert/strict";
import test from "node:test";
import {
  createSmokePuff,
  particleBoundsAt,
  particleBoundsAtTile,
  particleExpired,
  particleFrame,
  smokePuffDurationMs,
  SMOKE_POFF,
} from "../src/systems/animation/particle-effects-system.ts";

test("smoke puff plays at the vacated cell then expires", () => {
  const puff = createSmokePuff({ x: 3, y: 3 }, 100);

  assert.equal(puff.x, 3);
  assert.equal(puff.y, 3);
  assert.equal(particleFrame(puff, 100), 0);
  assert.equal(particleFrame(puff, 100 + SMOKE_POFF.frameDurationMs * 4), 4);
  assert.equal(particleExpired(puff, 100 + smokePuffDurationMs - 1), false);
  assert.equal(particleExpired(puff, 100 + smokePuffDurationMs), true);
});

test("particle bounds support direct pixels and a centered tile at zoom", () => {
  assert.deepEqual(particleBoundsAt(12, 18, 24, 36), { x: 12, y: 18, width: 24, height: 36 });
  assert.deepEqual(
    particleBoundsAtTile({ row: 3, column: 5, worldZoom: 1.5, relativeScale: 1, tileCenter: { x: 180, y: 92 } }),
    { x: 180, y: 92, width: 48, height: 48 },
  );
  assert.deepEqual(
    particleBoundsAtTile({ row: 3, column: 5, worldZoom: 1.5, relativeScale: 0.5, tileCenter: { x: 180, y: 92 } }),
    { x: 180, y: 92, width: 24, height: 24 },
  );
});
