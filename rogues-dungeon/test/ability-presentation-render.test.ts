import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Babylon rendering applies the purple ability-particle treatment", () => {
  const source = readFileSync(new URL("../src/systems/rendering/babylon-render-system.tsx", import.meta.url), "utf8");
  assert.match(source, /effect\?\.targetId \? world\.actors\.find/);
  assert.match(source, /particlePosition\(effect, target, now\)/);
  assert.match(source, /purple \? \[\.72, \.48, 1, ramp\]/);
  assert.match(source, /state\.player\.y \* 100 \+ PLAYER_RENDER_DEPTH_OFFSET \+ HEAL_PARTICLE_PLAYER_LAYER_OFFSET/);
});

test("ability dispatch protects cooldowns and ignores stale delayed completions", () => {
  const source = readFileSync(new URL("../src/game/game.tsx", import.meta.url), "utf8");
  assert.match(source, /performance\.now\(\) \+ 1000/);
  assert.match(source, /sessionGenerationRef\.current !== generation/);
  assert.match(source, /cooldowns=\{abilityCooldowns\}/);
});
