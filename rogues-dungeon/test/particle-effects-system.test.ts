import assert from "node:assert/strict";
import test from "node:test";
import {
  createSmokePuff,
  HEAL_PARTICLE_DURATION_MS,
  HEAL_PARTICLE_END_SCALE,
  HEAL_PARTICLE_START_SCALE,
  createAbilityParticle,
  createDamageParticles,
  DAMAGE_PARTICLE_DURATION_MS,
  DAMAGE_PARTICLE_PERSISTENCE_MS,
  DAMAGE_PARTICLE_MAX_SIZE_PX,
  DAMAGE_PARTICLE_MIN_SIZE_PX,
  DAMAGE_PARTICLE_SHADOW_BOTTOM_OFFSET_TILES,
  DAMAGE_PARTICLE_VERTICAL_OFFSET_TILES,
  particleBoundsAt,
  particleBoundsAtTile,
  particleDurationMs,
  particleExpired,
  particleFrame,
  particleOpacity,
  particlePosition,
  particleScale,
  particleSizePx,
  smokePuffDurationMs,
  SMOKE_POFF,
} from "../src/systems/animation/particle-effects-system.ts";
import { projectDamageParticles } from "../src/game/damage-particle-projection.ts";

test("smoke puff plays at the vacated cell then expires", () => {
  const puff = createSmokePuff({ x: 3, y: 3 }, 100);

  assert.equal(puff.x, 3);
  assert.equal(puff.y, 3);
  assert.equal(particleScale(puff, 100), .5);
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

test("damage particles arc to the shadow baseline, then fade and expire independently", () => {
  const particles = createDamageParticles({ x: 3, y: 4 }, () => 0, 100);
  assert.equal(particles.length, 4);
  assert.equal(particleDurationMs(particles[0]!), DAMAGE_PARTICLE_PERSISTENCE_MS);
  assert.equal(particles[0]!.sizePx, DAMAGE_PARTICLE_MIN_SIZE_PX);
  assert.equal(particleSizePx(particles[0]!, 100), 0);
  assert.equal(particleSizePx(particles[0]!, 350), DAMAGE_PARTICLE_MIN_SIZE_PX);
  assert.ok(particles.every((particle) => particle.sizePx! >= DAMAGE_PARTICLE_MIN_SIZE_PX && particle.sizePx! <= DAMAGE_PARTICLE_MAX_SIZE_PX));
  assert.deepEqual(particlePosition(particles[0]!, null, 225), { x: 3.4375, y: 4.15078125 });
  assert.deepEqual(particlePosition(particles[0]!, null, 350), { x: 3.5, y: 4 + DAMAGE_PARTICLE_SHADOW_BOTTOM_OFFSET_TILES });
  const downward = createDamageParticles({ x: 3, y: 4 }, () => .25, 100)[0]!;
  assert.deepEqual(particlePosition(downward, null, 350), { x: 3, y: 4 + DAMAGE_PARTICLE_SHADOW_BOTTOM_OFFSET_TILES + DAMAGE_PARTICLE_VERTICAL_OFFSET_TILES });
  assert.equal(particleOpacity(particles[0]!, 100), 0);
  assert.equal(particleOpacity(particles[0]!, 225), .4);
  assert.equal(particleOpacity(particles[0]!, 350), .8);
  assert.equal(particleExpired(particles[0]!, 350), false);
  assert.ok(particleOpacity(particles[0]!, 100 + DAMAGE_PARTICLE_PERSISTENCE_MS / 2) < .5);
  assert.equal(particleExpired(particles[0]!, 100 + DAMAGE_PARTICLE_PERSISTENCE_MS - 1), false);
  assert.equal(particleExpired(particles[0]!, 100 + DAMAGE_PARTICLE_PERSISTENCE_MS), true);
  assert.equal(particleFrame(particles[0]!, 350), 4);
});

test("damage projection covers every player Health loss once, plus enemies and destructibles", () => {
  const effects = projectDamageParticles([
    { type: "resource.changed", facts: { resource: "health", cause: "enemy-attack", previous: 10, current: 8, position: { x: 1, y: 2 } } },
    { type: "resource.changed", facts: { resource: "health", cause: "trap", previous: 8, current: 6, position: { x: 1, y: 2 } } },
    { type: "combat.hit", facts: { damage: 4, targetId: "player", targetPosition: { x: 1, y: 2 } } },
    { type: "combat.hit", facts: { damage: 4, targetPosition: { x: 3, y: 4 } } },
    { type: "combat.hit", facts: { damage: 7, targetPosition: { x: 5, y: 6 }, source: "wand" } },
    { type: "crate.opened", facts: { position: { x: 7, y: 8 } } },
  ]);
  assert.equal(effects.length, 20);
  assert.deepEqual(effects.filter((effect) => effect.x === 1 && effect.y === 2).length, 8);
  assert.ok(effects.filter((effect) => effect.x === 1 && effect.y === 2).every((effect) => effect.targetId === "player"));
  assert.deepEqual(effects.filter((effect) => effect.x === 3 && effect.y === 4).length, 4);
  assert.deepEqual(effects.filter((effect) => effect.x === 5 && effect.y === 6).length, 4);
  assert.deepEqual(effects.filter((effect) => effect.x === 7 && effect.y === 8).length, 4);
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
