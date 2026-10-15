export const DUNGEON_STAIR_UP_FRAME = 42;

type ItemKind = "item" | "potion" | "key" | "gold" | "chest" | "discovery" | "enemy" | "stairs" | undefined;

/** Returns the items-static atlas frame for ordinary world objects. */
export function itemSpriteFrame(kind: ItemKind, resource?: "health" | "mana" | null) {
  if (kind === "item") return 2;
  if (kind === "chest") return 0;
  if (kind === "key") return 5;
  if (kind === "gold") return 3;
  if (kind === "potion") return resource === "health" ? 6 : 7;
  return 8;
}
