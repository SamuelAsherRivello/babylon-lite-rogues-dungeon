import type { Position } from "../../game/types.ts";

export interface ParticleEffect extends Position { id: string; name: "smoke-poff"; startedAt: number }
export interface ParticleRenderBounds { x: number; y: number; width: number; height: number }
export interface TileParticleRenderRequest { row: number; column: number; worldZoom: number; relativeScale?: number; tileSize?: number; tileCenter: Position }
export const SMOKE_POFF = Object.freeze({ frameCount: 9, frameDurationMs: 80, sizePx: 20 });
export const smokePuffDurationMs = SMOKE_POFF.frameCount * SMOKE_POFF.frameDurationMs;
export function createSmokePuff(position: Position, startedAt = performance.now()): ParticleEffect { return { id: `smoke-poff-${startedAt}-${position.x}-${position.y}`, name: "smoke-poff", x: position.x, y: position.y, startedAt }; }
export function particleFrame(effect: ParticleEffect, now = performance.now()) { return Math.min(SMOKE_POFF.frameCount - 1, Math.max(0, Math.floor((now - effect.startedAt) / SMOKE_POFF.frameDurationMs))); }
export function particleExpired(effect: ParticleEffect, now = performance.now()) { return now - effect.startedAt >= smokePuffDurationMs; }
export function particleFrameUrl(effect: ParticleEffect) { return `${import.meta.env.BASE_URL}assets/art/custom/particles/smoke-poff/Smoke_Poff_${particleFrame(effect) + 1}.png`; }

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
