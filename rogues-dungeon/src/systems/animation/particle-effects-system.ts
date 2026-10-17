import type { Position } from "../../game/types.ts";

export interface ParticleEffect extends Position { id: string; name: "smoke-poff"; startedAt: number; kind?: "movement" | "heal" | "wand" | "damage"; targetId?: string; direction?: Position; sizePx?: number; rotation?: number }
export interface ParticleRenderBounds { x: number; y: number; width: number; height: number }
export interface TileParticleRenderRequest { row: number; column: number; worldZoom: number; relativeScale?: number; tileSize?: number; tileCenter: Position }
export const SMOKE_POFF = Object.freeze({ frameCount: 9, frameDurationMs: 80, sizePx: 20 });
export const smokePuffDurationMs = SMOKE_POFF.frameCount * SMOKE_POFF.frameDurationMs;
export const HEAL_PARTICLE_DURATION_MS = 554;
export const HEAL_PARTICLE_START_SCALE = 1.2;
export const HEAL_PARTICLE_END_SCALE = 3.6;
export const HEAL_PARTICLE_PLAYER_LAYER_OFFSET = 1;
export const MOVEMENT_PARTICLE_SCALE = .5;
export const DAMAGE_PARTICLE_DURATION_MS = 250;
/** Floor marks remain for the active encounter instead of being cleared on landing. */
/** Each landed combat mark owns a short independent lifetime. */
export const DAMAGE_PARTICLE_PERSISTENCE_MS = 10 * 1000;
export const DAMAGE_PARTICLE_MIN_SIZE_PX = 7;
export const DAMAGE_PARTICLE_MAX_SIZE_PX = 13;
export const DAMAGE_PARTICLE_MAX_ROTATION_DEGREES = 3;
export const DAMAGE_PARTICLE_TRAVEL_TILES = .5;
export const DAMAGE_PARTICLE_VERTICAL_OFFSET_TILES = .12;
/** The player and enemy shadows are centered 5px above the tile center; this reaches their 32px bottom edge. */
export const DAMAGE_PARTICLE_SHADOW_BOTTOM_OFFSET_TILES = 11 / 32;
export function createSmokePuff(position: Position, startedAt = performance.now()): ParticleEffect { return { id: `smoke-poff-${startedAt}-${position.x}-${position.y}`, name: "smoke-poff", kind: "movement", x: position.x, y: position.y, startedAt }; }
export function createAbilityParticle(kind: "heal" | "wand", position: Position, targetId?: string, startedAt = performance.now()): ParticleEffect { return { id: `${kind}-${startedAt}-${position.x}-${position.y}`, name: "smoke-poff", kind, targetId, x: position.x, y: position.y, startedAt }; }
export function createDamageParticles(position: Position, random = Math.random, startedAt = performance.now()): ParticleEffect[] { return Array.from({ length: 4 }, (_, index) => { const angle = random() * Math.PI * 2; const sizePx = DAMAGE_PARTICLE_MIN_SIZE_PX + random() * (DAMAGE_PARTICLE_MAX_SIZE_PX - DAMAGE_PARTICLE_MIN_SIZE_PX); const rotation = (random() * 2 - 1) * DAMAGE_PARTICLE_MAX_ROTATION_DEGREES * Math.PI / 180; return { id: `damage-${startedAt}-${position.x}-${position.y}-${index}`, name: "smoke-poff", kind: "damage", x: position.x, y: position.y, direction: { x: Math.cos(angle), y: Math.sin(angle) }, sizePx, rotation, startedAt }; }); }
export function particleDurationMs(effect: ParticleEffect) { return effect.kind === "damage" ? DAMAGE_PARTICLE_PERSISTENCE_MS : effect.kind === "heal" ? HEAL_PARTICLE_DURATION_MS : smokePuffDurationMs; }
/** Movement finishes quickly; damage decal fade uses the longer effect duration. */
export function particleProgress(effect: ParticleEffect, now = performance.now()) { const duration = effect.kind === "damage" ? DAMAGE_PARTICLE_DURATION_MS : particleDurationMs(effect); return Math.max(0, Math.min(1, (now - effect.startedAt) / duration)); }
export function particleScale(effect: ParticleEffect, now = performance.now()) { const progress = particleProgress(effect, now); if (effect.kind === "movement") return MOVEMENT_PARTICLE_SCALE; if (effect.kind === "heal") return progress === 1 ? HEAL_PARTICLE_END_SCALE : HEAL_PARTICLE_START_SCALE + progress * (HEAL_PARTICLE_END_SCALE - HEAL_PARTICLE_START_SCALE); if (effect.kind === "wand") return .5; return 1; }
export function particleSizePx(effect: ParticleEffect, now = performance.now()) { return effect.kind === "damage" ? (effect.sizePx ?? DAMAGE_PARTICLE_MIN_SIZE_PX) * particleProgress(effect, now) : 32 * particleScale(effect, now); }
export function particlePosition(effect: ParticleEffect, target: Position | null, now = performance.now()): Position { const progress = particleProgress(effect, now); if (effect.kind === "damage" && effect.direction) { const eased = 1 - (1 - progress) ** 3; return { x: effect.x + effect.direction.x * DAMAGE_PARTICLE_TRAVEL_TILES * eased, y: effect.y + (DAMAGE_PARTICLE_SHADOW_BOTTOM_OFFSET_TILES + effect.direction.y * DAMAGE_PARTICLE_VERTICAL_OFFSET_TILES) * eased - .15 * 4 * progress * (1 - progress) }; } return effect.kind === "wand" && target ? { x: effect.x + (target.x - effect.x) * progress, y: effect.y + (target.y - effect.y) * progress } : { x: effect.x, y: effect.y }; }
export function particleOpacity(effect: ParticleEffect, now = performance.now()) {
  if (effect.kind !== "damage") return 1;
  const travel = particleProgress(effect, now);
  if (travel < 1) return travel * .8;
  return Math.max(0, 1 - (now - effect.startedAt - DAMAGE_PARTICLE_DURATION_MS) / (particleDurationMs(effect) - DAMAGE_PARTICLE_DURATION_MS)) * .8;
}
export function particleFrame(effect: ParticleEffect, now = performance.now()) { if (effect.kind === "damage" && particleProgress(effect, now) === 1) return 4; const duration = effect.kind === "damage" ? DAMAGE_PARTICLE_DURATION_MS : particleDurationMs(effect); return Math.min(SMOKE_POFF.frameCount - 1, Math.max(0, Math.floor((now - effect.startedAt) / (duration / SMOKE_POFF.frameCount)))); }
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
