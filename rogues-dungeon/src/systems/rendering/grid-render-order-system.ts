/** Sort world visuals by render layer, then by their vertical grid position. */
export interface GridRenderEntry {
  layer: number;
  y: number;
  id: string;
}

export function compareGridRenderEntries(left: GridRenderEntry, right: GridRenderEntry) {
  return left.layer - right.layer || left.y - right.y || left.id.localeCompare(right.id);
}

export function sortGridRenderEntries<T extends GridRenderEntry>(entries: readonly T[]) {
  return [...entries].sort(compareGridRenderEntries);
}
