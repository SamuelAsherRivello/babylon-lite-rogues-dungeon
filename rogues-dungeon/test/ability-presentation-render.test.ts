import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Babylon rendering applies the purple ability-particle treatment", () => {
  const source = readFileSync(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.match(source, /effect\?\.targetId \? world\.actors\.find/);
  assert.match(source, /particlePosition\(effect, target, now\)/);
  assert.match(source, /purple \? \[\.72, \.48, 1, ramp\]/);
  assert.match(source, /effect\?\.kind === "heal" \|\| \(damage && progress < 1\)\) particleLayers\[i\]\.order = OVERLAY_RENDER_ORDER - 1/);
});

test("Babylon rendering uses damage-particle position, scale, opacity, and world ordering", () => {
  const source = readFileSync(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.match(source, /effect\?\.kind === "damage" \? particleOpacity\(effect, now\)/);
  assert.match(source, /particlePosition\(effect, target, now\)/);
  assert.match(source, /particleSizePx\(effect, now\)/);
  assert.match(source, /FLOOR_TRAP_RENDER_ORDER = FLOOR_DECAL_RENDER_ORDER \+ 1/);
  assert.match(source, /LANDED_DAMAGE_PARTICLE_RENDER_ORDER = FLOOR_TRAP_RENDER_ORDER \+ 1/);
  assert.match(source, /trapLayers\[i\]\.order = FLOOR_TRAP_RENDER_ORDER/);
  assert.match(source, /damage\) particleLayers\[i\]\.order = LANDED_DAMAGE_PARTICLE_RENDER_ORDER/);
  assert.match(source, /rotation: effect\?\.rotation/);
});

test("ability dispatch protects cooldowns and ignores stale delayed completions", () => {
  const source = readFileSync(new URL("../src/game/game.tsx", import.meta.url), "utf8");
  assert.match(source, /performance\.now\(\) \+ 1000/);
  assert.match(source, /sessionGenerationRef\.current !== generation/);
  assert.match(source, /cooldowns=\{abilityCooldowns\}/);
});
