import type { CharacterHeading } from "../../../game/types.ts";
import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition, type SpriteAnimationSummary, type SpriteSheetAnimationEntity } from "../../../systems/animation/sprite-animation-system.ts";

export const HERO_WARRIOR_ANIMATION_NAMES = ["idle/down", "idle/side", "idle/up", "run/down", "run/side", "run/up", "attack/down", "attack/side", "attack/up", "death"] as const;
export type HeroWarriorAnimationName = typeof HERO_WARRIOR_ANIMATION_NAMES[number];

export function heroWarriorIdleAnimationForHeading(heading: CharacterHeading = "e"): HeroWarriorAnimationName {
  if (heading === "n") return "idle/up";
  if (heading === "s") return "idle/down";
  return "idle/side";
}

const directions = ["down", "side", "up"] as const;
type Direction = typeof directions[number];

function framePath(baseUrl: string, animation: string, direction: Direction | null, index: number) {
  const folder = direction ? `${animation.toLowerCase()}/${direction.toLowerCase()}` : animation.toLowerCase();
  return `${baseUrl}assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/frames/${folder}/${String(index).padStart(2, "0")}.png`;
}

function frameList(baseUrl: string, animation: string, direction: Direction | null, count: number, widthPx: number, heightPx: number) {
  return Array.from({ length: count }, (_, index) => ({ path: framePath(baseUrl, animation, direction, index), widthPx, heightPx }));
}

function directionalDefinitions(baseUrl: string, animation: "idle" | "run" | "attack", count: number, frameDurationMs: number, loopCount: number): SpriteAnimationDefinition[] {
  return directions.map((direction) => ({ name: `${animation}/${direction}`, source: { kind: "frames", frames: frameList(baseUrl, animation, direction, count, 32, 48) }, frameDurationMs, loopCount }));
}

export function createHeroWarriorAnimationDefinitions(baseUrl = "/") {
  return [
    ...directionalDefinitions(baseUrl, "idle", 4, 140, -1),
    ...directionalDefinitions(baseUrl, "run", 6, 100, -1),
    ...directionalDefinitions(baseUrl, "attack", 4, 90, 0),
    { name: "death", source: { kind: "frames" as const, frames: frameList(baseUrl, "death", null, 6, 48, 48) }, frameDurationMs: 120, loopCount: 0 },
  ] satisfies SpriteAnimationDefinition[];
}

export function createHeroWarriorAnimationEntity(baseUrl = "/", speed = 0.5): SpriteSheetAnimationEntity {
  return createSpriteSheetAnimationEntity(createHeroWarriorAnimationDefinitions(baseUrl), "idle/side", { speed });
}

export function heroWarriorAnimationCatalog(baseUrl = "/"): readonly SpriteAnimationSummary[] {
  return createHeroWarriorAnimationEntity(baseUrl).listAnimations();
}
