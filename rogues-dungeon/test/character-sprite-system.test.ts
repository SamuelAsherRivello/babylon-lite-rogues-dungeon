import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Sprite2DHandle } from "@babylonjs/lite";
import { createCharacterSprite, setCharacterSpriteOrder } from "../src/systems/rendering/character-sprite-system.ts";

function handleWithOrder(layer: { order: number }) {
  return { layer } as unknown as Sprite2DHandle;
}

test("keeps a composite sprite shadow directly before its main art", () => {
  const shadowLayer = { order: 0 };
  const mainLayer = { order: 0 };
  const character = createCharacterSprite(
    { handle: handleWithOrder(mainLayer), offsetPx: [0, 0] },
    { handle: handleWithOrder(shadowLayer), offsetPx: [0, 0] },
  );

  setCharacterSpriteOrder(character, 420);

  assert.equal(shadowLayer.order, 420);
  assert.equal(mainLayer.order, 421);
});

test("uses the same composite updater to hide the paired sprites", () => {
  const source = readFileSync(new URL("../src/systems/rendering/character-sprite-system.ts", import.meta.url), "utf8");
  assert.match(source, /export function hideCharacterSprite\(character: CharacterSprite\) \{\s*updateCharacterSprite\(character, \[-10000, -10000\], -10000\);/);
});
