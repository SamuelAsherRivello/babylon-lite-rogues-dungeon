import { createSpriteSheetAnimationEntity, type SpriteAnimationDefinition, type SpriteSheetAnimationEntity } from "../../systems/animation/sprite-animation-system.ts";

export const ENEMY_IDLE_ANIMATION_NAMES = ["rat", "skeleton"] as const;
export type EnemyIdleAnimationName = typeof ENEMY_IDLE_ANIMATION_NAMES[number];

const enemySpriteMetrics = {
  rat: { widthPx: 32, heightPx: 32, frameCount: 5 },
  skeleton: { widthPx: 32, heightPx: 48, frameCount: 4 },
} as const;

function enemyIdleFramePath(baseUrl: string, enemy: EnemyIdleAnimationName, index: number) {
  const folder = enemy === "skeleton" ? "skeleton-warrior/frames/idle/down" : "rat/frames/idle";
  return `${baseUrl}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/${folder}/${String(index).padStart(2, "0")}.png`;
}

export function createEnemyIdleAnimationDefinitions(baseUrl = "/") {
  return ENEMY_IDLE_ANIMATION_NAMES.map((enemy) => {
    const metrics = enemySpriteMetrics[enemy];
    return {
      name: enemy,
      source: { kind: "frames" as const, frames: Array.from({ length: metrics.frameCount }, (_, index) => ({ path: enemyIdleFramePath(baseUrl, enemy, index), widthPx: metrics.widthPx, heightPx: metrics.heightPx })) },
      frameDurationMs: 140,
      loopCount: -1,
    };
  }) satisfies SpriteAnimationDefinition[];
}

export function createEnemyIdleAnimationEntities(baseUrl = "/", speed = 0.5): Record<EnemyIdleAnimationName, SpriteSheetAnimationEntity> {
  const definitions = createEnemyIdleAnimationDefinitions(baseUrl);
  return Object.fromEntries(definitions.map((definition) => [definition.name, createSpriteSheetAnimationEntity([definition], definition.name, { speed })])) as Record<EnemyIdleAnimationName, SpriteSheetAnimationEntity>;
}
