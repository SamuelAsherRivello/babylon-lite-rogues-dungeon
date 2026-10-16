import assert from "node:assert/strict";
import test from "node:test";
import {
  createSmokePuff,
  HEAL_PARTICLE_DURATION_MS,
  HEAL_PARTICLE_END_SCALE,
  HEAL_PARTICLE_START_SCALE,
  createAbilityParticle,
  particleBoundsAt,
  particleBoundsAtTile,
  particleDurationMs,
  particleExpired,
  particleFrame,
  particlePosition,
  particleScale,
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

test("ability particles make Heal faster and larger while carrying Wand to its locked target", () => {
  const heal = createAbilityParticle("heal", { x: 3, y: 4 }, undefined, 100);
  assert.equal(particleDurationMs(heal), HEAL_PARTICLE_DURATION_MS);
  assert.ok(HEAL_PARTICLE_DURATION_MS < smokePuffDurationMs);
  assert.equal(particleScale(heal, 100), HEAL_PARTICLE_START_SCALE);
  assert.equal(particleScale(heal, 100 + HEAL_PARTICLE_DURATION_MS), HEAL_PARTICLE_END_SCALE);
  assert.equal(particleExpired(heal, 100 + HEAL_PARTICLE_DURATION_MS), true);
  const wand = createAbilityParticle("wand", { x: 2, y: 3 }, "rat-1", 100);
  assert.equal(particleScale(wand, 200), .5);
  assert.deepEqual(particlePosition(wand, { x: 6, y: 7 }, 100 + smokePuffDurationMs / 2), { x: 4, y: 5 });
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
