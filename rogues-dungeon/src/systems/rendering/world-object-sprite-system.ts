export const DUNGEON_STAIR_UP_FRAME = 42;
export const OBJECTS_OVERLAY_BARREL_FRAME = 0;
// The authored door images are visually opposite their source-file names.
export const OBJECTS_OVERLAY_DOOR_OPEN_FRAME = 0;
export const OBJECTS_OVERLAY_DOOR_CLOSED_FRAME = 1;
// objects-overlay is a 7 × 6 sheet; the crate is bottom row, second tile.
export const OBJECTS_OVERLAY_CRATE_CLOSED_FRAME = 36;
export const PROPS_STATIC_CRATE_OPEN_FRAMES = Object.freeze([1, 5] as const);

// Chests and linked puzzle doors use distinct art assets and anchor rules.
export const CHEST_MAIN_ART_ANCHOR_OFFSET_PX = 16;
export const DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX = 32;
export const DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX = 16;

export function doorMainArtAnchorOffset(open: boolean) {
  return open ? DOOR_OPEN_MAIN_ART_ANCHOR_OFFSET_PX : DOOR_CLOSED_MAIN_ART_ANCHOR_OFFSET_PX;
}

type ItemKind = "item" | "potion" | "key" | "gold" | "chest" | "crate" | "discovery" | "enemy" | "stairs" | undefined;

export interface PickupMainArtPresentation {
  mainOffsetPx: number;
  oscillationAmplitudePx: number;
  shadowWidthScale: number;
  shadowHeightScale: number;
}

/** Returns main-art-only presentation settings; shadows stay at ground contact. */
export function pickupMainArtPresentation(kind: ItemKind, resource?: "health" | "mana" | null): PickupMainArtPresentation {
  if (kind === "key") return { mainOffsetPx: -8, oscillationAmplitudePx: 0, shadowWidthScale: 0.5, shadowHeightScale: 0.5 };
  if (kind !== "potion") return { mainOffsetPx: 0, oscillationAmplitudePx: 0, shadowWidthScale: 1, shadowHeightScale: 1 };
  return { mainOffsetPx: -8, oscillationAmplitudePx: resource === "health" || resource === "mana" ? 1.5 : 0, shadowWidthScale: 1, shadowHeightScale: 1 };
}

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
