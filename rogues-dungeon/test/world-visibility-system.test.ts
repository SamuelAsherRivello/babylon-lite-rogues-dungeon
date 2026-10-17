import assert from "node:assert/strict";
import test from "node:test";
import { createWorldVisibilityCell, normalizeWorldLight, worldVisibilityKey } from "../src/systems/rendering/world-visibility-system.ts";

test("visibility cells keep discovery separate from normalized continuous light", () => {
  assert.deepEqual(createWorldVisibilityCell({ x: 4, y: 7 }, true, 1.5), { x: 4, y: 7, discovered: true, light: 1 });
  assert.equal(normalizeWorldLight(-.1), 0);
  assert.equal(normalizeWorldLight(.4), .4);
  assert.equal(worldVisibilityKey({ x: 4, y: 7 }), "4,7");
});
