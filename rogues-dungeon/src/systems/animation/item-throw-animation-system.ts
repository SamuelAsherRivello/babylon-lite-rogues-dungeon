import type { Position } from "../../game/types.ts";

export interface ThrownItem {
  id: string;
  kind: string;
  destination: Position;
}

export interface ItemThrow extends ThrownItem {
  origin: Position;
  startedAt: number;
}

export const ITEM_THROW_DURATION_MS = 460;

/** Starts item flights from one world position to each item's settled position. */
export function throwItems(origin: Position, items: readonly ThrownItem[], startedAt = performance.now()): ItemThrow[] {
  return items.map((item) => ({ ...item, origin: { ...origin }, destination: { ...item.destination }, startedAt }));
}

export function itemThrowPosition(throwItem: ItemThrow, now: number): Position {
  const progress = Math.max(0, Math.min(1, (now - throwItem.startedAt) / ITEM_THROW_DURATION_MS));
  const eased = 1 - (1 - progress) ** 3;
  return {
    x: throwItem.origin.x + (throwItem.destination.x - throwItem.origin.x) * eased,
    y: throwItem.origin.y + (throwItem.destination.y - throwItem.origin.y) * eased - 0.8 * 4 * progress * (1 - progress),
  };
}

export function itemThrowExpired(throwItem: ItemThrow, now: number) {
  return now - throwItem.startedAt >= ITEM_THROW_DURATION_MS;
}
