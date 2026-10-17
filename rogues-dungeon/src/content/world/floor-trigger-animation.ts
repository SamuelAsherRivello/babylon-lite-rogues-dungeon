import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition } from "../../systems/animation/sprite-animation-system.ts";

export const FLOOR_TRIGGER_OFF_FRAME = 14;
export const FLOOR_TRIGGER_ON_FRAME = 16;

function frame(baseUrl: string, sheetFrame: number) {
  return { path: `${baseUrl}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/props-animated.png`, widthPx: 32, heightPx: 32, sheetFrame };
}

/** The third props-animated row: three pressure-plate states, held at either end. */
export function createFloorTriggerAnimationDefinitions(baseUrl = "/"): readonly SpriteAnimationDefinition[] {
  return [
    { name: "off", source: { kind: "frames", frames: [frame(baseUrl, FLOOR_TRIGGER_OFF_FRAME)] }, frameDurationMs: 400, loopCount: 0 },
    { name: "activate", source: { kind: "frames", frames: [14, 15, FLOOR_TRIGGER_ON_FRAME].map((sheetFrame) => frame(baseUrl, sheetFrame)) }, frameDurationMs: 200, loopCount: 0 },
  ];
}

export function createFloorTriggerAnimationEntity(baseUrl = "/") {
  return createSpriteSheetAnimationEntity(createFloorTriggerAnimationDefinitions(baseUrl), "off");
}
