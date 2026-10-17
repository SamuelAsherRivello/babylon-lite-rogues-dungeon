import type { Position } from "../../game/types.ts";

/** Renderer-neutral cell presentation inputs; neither field changes terrain geometry. */
export interface WorldVisibilityCell extends Position {
  discovered: boolean;
  light: number;
}

export function normalizeWorldLight(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function createWorldVisibilityCell(position: Position, discovered = false, light = 0): WorldVisibilityCell {
  return { ...position, discovered, light: normalizeWorldLight(light) };
}

export function worldVisibilityKey(position: Position) {
  return `${position.x},${position.y}`;
}
