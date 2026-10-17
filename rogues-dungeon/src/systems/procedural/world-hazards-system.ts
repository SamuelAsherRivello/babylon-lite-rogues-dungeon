import type { Position } from "../../game/types.ts";

export const TRAP_FRAME_DURATION_MS = 150;
export const TRAP_FRAME_COUNT = 7;
export const TRAP_PAUSE_MS = 3_000;
export const TRAP_CYCLE_MS = TRAP_FRAME_DURATION_MS * TRAP_FRAME_COUNT + TRAP_PAUSE_MS;
export const TRAP_BASE_DAMAGE = 3;

/** The trap plays its seven frames once, holds its final safe frame, then repeats. */
export function trapFrameAt(elapsedMs: number) {
  const cycleOffset = Math.max(0, elapsedMs) % TRAP_CYCLE_MS;
  return cycleOffset >= TRAP_FRAME_DURATION_MS * TRAP_FRAME_COUNT
    ? TRAP_FRAME_COUNT - 1
    : Math.floor(cycleOffset / TRAP_FRAME_DURATION_MS);
}

/**
 * The raised spikes occupy frames 1 through 4. Frame 5 is the retracted
 * transition, so stepping on it is safe even though the trap is still moving.
 */
export function trapIsDangerous(frame: number) {
  return Number.isInteger(frame) && frame >= 1 && frame <= 4;
}

/** Match an enemy strike by applying the same minimum-damage and defense rule. */
export function trapStrikeDamage(defense: number, offense = TRAP_BASE_DAMAGE) {
  return Math.max(1, Math.round(offense - defense));
}

export function isWallDecorationCell(map: readonly number[][], { x, y }: Position) {
  return map[y]?.[x] === 1 && (map[y]?.[x - 1] === 0 || map[y]?.[x + 1] === 0 || map[y + 1]?.[x] === 0);
}
