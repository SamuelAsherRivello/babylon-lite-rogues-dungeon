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

const HOP_HEIGHT_PX = 6.4;
const SHADOW_MINIMUM_WIDTH = 0.65;
const SHADOW_MINIMUM_OPACITY = 0.8;

/** Updates a composite character and its renderer-only hop/shadow movement pulse. */
export function updateCharacterSprite(character: CharacterSprite, positionPx: Point, order: number, mainPatch: Partial<Sprite2DProps> = {}, movementPulse = 0) {
  const [x, y] = positionPx;
  const pulse = Math.max(0, Math.min(1, movementPulse));
  const shadowWidthScale = 1 - (1 - SHADOW_MINIMUM_WIDTH) * pulse;
  const shadowOpacity = 1 - (1 - SHADOW_MINIMUM_OPACITY) * pulse;
  character.shadow.handle.layer.order = order;
  character.main.handle.layer.order = order + 1;
  updateSprite2D(character.shadow.handle, { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]], sizePx: [32 * shadowWidthScale, 32], color: [1, 1, 1, shadowOpacity] });
  updateSprite2D(character.main.handle, { ...mainPatch, positionPx: [x + character.main.offsetPx[0], y + character.main.offsetPx[1] - HOP_HEIGHT_PX * pulse] });
}

export function hideCharacterSprite(character: CharacterSprite) {
  updateCharacterSprite(character, [-10000, -10000], -10000);
}
