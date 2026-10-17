export const DUNGEON_STAIR_UP_FRAME = 42;
export const OBJECTS_OVERLAY_BARREL_FRAME = 0;
// The authored door images are visually opposite their source-file names.
export const OBJECTS_OVERLAY_DOOR_OPEN_FRAME = 0;
export const OBJECTS_OVERLAY_DOOR_CLOSED_FRAME = 1;
export const OBJECTS_OVERLAY_CRATE_CLOSED_FRAME = 57;
export const PROPS_STATIC_CRATE_OPEN_FRAMES = Object.freeze([1, 5] as const);

type ItemKind = "item" | "potion" | "key" | "gold" | "chest" | "crate" | "discovery" | "enemy" | "stairs" | undefined;

/** Returns the items-static atlas frame for ordinary world objects. */
export function itemSpriteFrame(kind: ItemKind, resource?: "health" | "mana" | null) {
  if (kind === "item") return 2;
  if (kind === "key") return 5;
  if (kind === "gold") return 3;
  if (kind === "potion") return resource === "health" ? 6 : 7;
  return 8;
}

export function puzzleObjectSpriteFrame(kind: "barrel" | "door", active: boolean) {
  if (kind === "barrel") return OBJECTS_OVERLAY_BARREL_FRAME;
  return active ? OBJECTS_OVERLAY_DOOR_OPEN_FRAME : OBJECTS_OVERLAY_DOOR_CLOSED_FRAME;
}
