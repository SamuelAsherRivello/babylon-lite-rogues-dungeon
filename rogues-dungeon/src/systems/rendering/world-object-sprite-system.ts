export const DUNGEON_STAIR_UP_FRAME = 42;
export const OBJECTS_OVERLAY_CHEST_CLOSED_FRAME = 0;
export const OBJECTS_OVERLAY_CHEST_OPEN_FRAME = 1;
export const OBJECTS_OVERLAY_BARREL_FRAME = 0;
export const OBJECTS_OVERLAY_TRIGGER_INACTIVE_FRAME = 1;
export const OBJECTS_OVERLAY_TRIGGER_ACTIVE_FRAME = 12;
export const OBJECTS_OVERLAY_DOOR_CLOSED_FRAME = 10;
export const OBJECTS_OVERLAY_DOOR_OPEN_FRAME = 11;

type ItemKind = "item" | "potion" | "key" | "gold" | "chest" | "discovery" | "enemy" | "stairs" | undefined;

/** Returns the items-static atlas frame for ordinary world objects. */
export function itemSpriteFrame(kind: ItemKind, resource?: "health" | "mana" | null) {
  if (kind === "item") return 2;
  if (kind === "key") return 5;
  if (kind === "gold") return 3;
  if (kind === "potion") return resource === "health" ? 6 : 7;
  return 8;
}

/** Returns the top-row Objects Overlay frame for a chest's persistent state. */
export function chestSpriteFrame(opened: boolean | undefined) {
  return opened ? OBJECTS_OVERLAY_CHEST_OPEN_FRAME : OBJECTS_OVERLAY_CHEST_CLOSED_FRAME;
}
export function puzzleObjectSpriteFrame(kind: "barrel" | "trigger" | "door", active: boolean) {
  if (kind === "barrel") return OBJECTS_OVERLAY_BARREL_FRAME;
  if (kind === "trigger") return active ? OBJECTS_OVERLAY_TRIGGER_ACTIVE_FRAME : OBJECTS_OVERLAY_TRIGGER_INACTIVE_FRAME;
  return active ? OBJECTS_OVERLAY_DOOR_OPEN_FRAME : OBJECTS_OVERLAY_DOOR_CLOSED_FRAME;
}
