import type { CharacterHeading } from "../../../game/types.ts";
import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition, type SpriteAnimationSummary, type SpriteSheetAnimationEntity } from "../../../systems/animation/sprite-animation-system.ts";

export const HERO_WARRIOR_ANIMATION_NAMES = ["Idle/Down", "Idle/Side", "Idle/Up", "Run/Down", "Run/Side", "Run/Up", "Attack/Down", "Attack/Side", "Attack/Up", "Death"] as const;
export type HeroWarriorAnimationName = typeof HERO_WARRIOR_ANIMATION_NAMES[number];

export function heroWarriorIdleAnimationForHeading(heading: CharacterHeading = "e"): HeroWarriorAnimationName {
  if (heading === "n") return "Idle/Up";
  if (heading === "s") return "Idle/Down";
  return "Idle/Side";
}

const directions = ["Down", "Side", "Up"] as const;
type Direction = typeof directions[number];

function framePath(baseUrl: string, animation: string, direction: Direction | null, index: number) {
  const folder = direction ? `${animation}/${direction}` : animation;
  return `${baseUrl}assets/Characters/Hero_Warrior/Frames/${folder}/${String(index).padStart(2, "0")}.png`;
}

function frameList(baseUrl: string, animation: string, direction: Direction | null, count: number, widthPx: number, heightPx: number) {
  return Array.from({ length: count }, (_, index) => ({ path: framePath(baseUrl, animation, direction, index), widthPx, heightPx }));
}

function directionalDefinitions(baseUrl: string, animation: "Idle" | "Run" | "Attack", count: number, frameDurationMs: number, loopCount: number): SpriteAnimationDefinition[] {
  return directions.map((direction) => ({ name: `${animation}/${direction}`, source: { kind: "frames", frames: frameList(baseUrl, animation, direction, count, 32, 48) }, frameDurationMs, loopCount }));
}

export function createHeroWarriorAnimationDefinitions(baseUrl = "/") {
  return [
    ...directionalDefinitions(baseUrl, "Idle", 4, 140, -1),
    ...directionalDefinitions(baseUrl, "Run", 6, 100, -1),
    ...directionalDefinitions(baseUrl, "Attack", 4, 90, 0),
    { name: "Death", source: { kind: "frames" as const, frames: frameList(baseUrl, "Death", null, 6, 48, 48) }, frameDurationMs: 120, loopCount: 0 },
  ] satisfies SpriteAnimationDefinition[];
}

export function createHeroWarriorAnimationEntity(baseUrl = "/", speed = 0.5): SpriteSheetAnimationEntity {
  return createSpriteSheetAnimationEntity(createHeroWarriorAnimationDefinitions(baseUrl), "Idle/Side", { speed });
}

export function heroWarriorAnimationCatalog(baseUrl = "/"): readonly SpriteAnimationSummary[] {
  return createHeroWarriorAnimationEntity(baseUrl).listAnimations();
}
