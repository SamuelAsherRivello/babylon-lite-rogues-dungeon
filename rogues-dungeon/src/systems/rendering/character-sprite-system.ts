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

/** Keep a composite entity's two visual children adjacent in the shared world-depth pass. */
export function setCharacterSpriteOrder(character: CharacterSprite, order: number) {
  character.shadow.handle.layer.order = order;
  character.main.handle.layer.order = order + 1;
}

export const CHARACTER_HOP_HEIGHT_PX = 6.4;
export const PLAYER_HOP_HEIGHT_PX = CHARACTER_HOP_HEIGHT_PX - 2;
const SHADOW_MINIMUM_WIDTH = 0.65;
const SHADOW_MINIMUM_OPACITY = 0.8;

/** Updates a composite character and its renderer-only hop/shadow movement pulse. */
export function updateCharacterSprite(character: CharacterSprite, positionPx: Point, order: number, mainPatch: Partial<Sprite2DProps> = {}, movementPulse = 0, hopHeightPx = CHARACTER_HOP_HEIGHT_PX, opacity = 1) {
  const [x, y] = positionPx;
  const pulse = Math.max(0, Math.min(1, movementPulse));
  const shadowWidthScale = 1 - (1 - SHADOW_MINIMUM_WIDTH) * pulse;
  const shadowOpacity = 1 - (1 - SHADOW_MINIMUM_OPACITY) * pulse;
  setCharacterSpriteOrder(character, order);
  updateSprite2D(character.shadow.handle, { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]], sizePx: [32 * shadowWidthScale, 32], color: [1, 1, 1, shadowOpacity * opacity] });
  updateSprite2D(character.main.handle, { ...mainPatch, positionPx: [x + character.main.offsetPx[0], y + character.main.offsetPx[1] - hopHeightPx * pulse] });
}

export function hideCharacterSprite(character: CharacterSprite) {
  updateCharacterSprite(character, [-10000, -10000], -10000);
}
