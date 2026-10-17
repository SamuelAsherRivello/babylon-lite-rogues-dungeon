import type { Sprite2DHandle, Sprite2DProps } from "@babylonjs/lite";
import { updateSprite2D } from "@babylonjs/lite";

type Point = readonly [number, number];

export interface CharacterSpriteChild {
  readonly handle: Sprite2DHandle;
  readonly offsetPx: Point;
}

/** A character is positioned as one unit; its art stays independently offset from its grid centre. */
export interface CharacterSprite {
  readonly main: CharacterSpriteChild;
  readonly shadow: CharacterSpriteChild;
}

export function createCharacterSprite(main: CharacterSpriteChild, shadow: CharacterSpriteChild): CharacterSprite {
  return { main, shadow };
}

export function updateCharacterSprite(character: CharacterSprite, positionPx: Point, order: number, mainPatch: Partial<Sprite2DProps> = {}) {
  const [x, y] = positionPx;
  character.shadow.handle.layer.order = order;
  character.main.handle.layer.order = order + 1;
  updateSprite2D(character.shadow.handle, { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]] });
  updateSprite2D(character.main.handle, { ...mainPatch, positionPx: [x + character.main.offsetPx[0], y + character.main.offsetPx[1]] });
}

export function hideCharacterSprite(character: CharacterSprite) {
  updateCharacterSprite(character, [-10000, -10000], -10000);
}
