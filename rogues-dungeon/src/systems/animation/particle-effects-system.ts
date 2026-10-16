import type { Position } from "../../game/types.ts";

export interface ParticleEffect extends Position { id: string; name: "smoke-poff"; startedAt: number; kind?: "movement" | "heal" | "wand"; targetId?: string }
export interface ParticleRenderBounds { x: number; y: number; width: number; height: number }
export interface TileParticleRenderRequest { row: number; column: number; worldZoom: number; relativeScale?: number; tileSize?: number; tileCenter: Position }
export const SMOKE_POFF = Object.freeze({ frameCount: 9, frameDurationMs: 80, sizePx: 20 });
export const smokePuffDurationMs = SMOKE_POFF.frameCount * SMOKE_POFF.frameDurationMs;
export const HEAL_PARTICLE_DURATION_MS = 554;
export const HEAL_PARTICLE_START_SCALE = 1.2;
export const HEAL_PARTICLE_END_SCALE = 3.6;
export const HEAL_PARTICLE_PLAYER_LAYER_OFFSET = 1;
export function createSmokePuff(position: Position, startedAt = performance.now()): ParticleEffect { return { id: `smoke-poff-${startedAt}-${position.x}-${position.y}`, name: "smoke-poff", x: position.x, y: position.y, startedAt }; }
export function createAbilityParticle(kind: "heal" | "wand", position: Position, targetId?: string, startedAt = performance.now()): ParticleEffect { return { id: `${kind}-${startedAt}-${position.x}-${position.y}`, name: "smoke-poff", kind, targetId, x: position.x, y: position.y, startedAt }; }
export function particleDurationMs(effect: ParticleEffect) { return effect.kind === "heal" ? HEAL_PARTICLE_DURATION_MS : smokePuffDurationMs; }
export function particleProgress(effect: ParticleEffect, now = performance.now()) { return Math.max(0, Math.min(1, (now - effect.startedAt) / particleDurationMs(effect))); }
export function particleScale(effect: ParticleEffect, now = performance.now()) { const progress = particleProgress(effect, now); if (effect.kind === "heal") return progress === 1 ? HEAL_PARTICLE_END_SCALE : HEAL_PARTICLE_START_SCALE + progress * (HEAL_PARTICLE_END_SCALE - HEAL_PARTICLE_START_SCALE); if (effect.kind === "wand") return .5; return 1; }
export function particlePosition(effect: ParticleEffect, target: Position | null, now = performance.now()): Position { const progress = particleProgress(effect, now); return effect.kind === "wand" && target ? { x: effect.x + (target.x - effect.x) * progress, y: effect.y + (target.y - effect.y) * progress } : { x: effect.x, y: effect.y }; }
export function particleFrame(effect: ParticleEffect, now = performance.now()) { return Math.min(SMOKE_POFF.frameCount - 1, Math.max(0, Math.floor((now - effect.startedAt) / (particleDurationMs(effect) / SMOKE_POFF.frameCount)))); }
export function particleExpired(effect: ParticleEffect, now = performance.now()) { return now - effect.startedAt >= particleDurationMs(effect); }
export function particleFrameUrl(effect: ParticleEffect) { return `${import.meta.env.BASE_URL}assets/art/custom/particles/smoke-poff/smoke-poff-${particleFrame(effect) + 1}.png`; }

/** Return CSS-pixel bounds for a particle placed directly in the renderer. */
export function particleBoundsAt(x: number, y: number, width: number, height: number): ParticleRenderBounds {
  return { x, y, width, height };
}

/** Center a particle in a world tile. A scale of 1 fills that tile at the active zoom. */
export function particleBoundsAtTile({ row, column, worldZoom, relativeScale = 1, tileSize = 32, tileCenter }: TileParticleRenderRequest): ParticleRenderBounds {
  if (!Number.isFinite(row) || !Number.isFinite(column)) throw new Error("Particle tile coordinates must be finite.");
  const size = tileSize * worldZoom * relativeScale;
  return particleBoundsAt(tileCenter.x, tileCenter.y, size, size);
}
