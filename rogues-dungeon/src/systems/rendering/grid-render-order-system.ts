/** Render passes that intentionally do not compete in the shared world-depth sort. */
export const GRID_RENDER_PASS = Object.freeze({ terrain: 0, floorDecal: 1, world: 2, overlay: 3 } as const);
export type GridRenderPass = typeof GRID_RENDER_PASS[keyof typeof GRID_RENDER_PASS];

/** Sort visuals by pass, their ground-contact pixel Y coordinate, then stable ties. */
export interface GridRenderEntry {
  pass: GridRenderPass;
  y: number;
  tieBreak?: number;
  id: string;
}

export function compareGridRenderEntries(left: GridRenderEntry, right: GridRenderEntry) {
  return left.pass - right.pass || left.y - right.y || (left.tieBreak ?? 0) - (right.tieBreak ?? 0) || left.id.localeCompare(right.id);
}

export function sortGridRenderEntries<T extends GridRenderEntry>(entries: readonly T[]) {
  return [...entries].sort(compareGridRenderEntries);
}

/** Assign sparse, consecutive layer orders to one frame's shared world-depth entries. */
export function orderWorldRenderEntries<T extends GridRenderEntry>(entries: readonly T[], firstOrder = 100, orderStep = 2) {
  return sortGridRenderEntries(entries.filter((entry) => entry.pass === GRID_RENDER_PASS.world)).map((entry, index) => ({ entry, order: firstOrder + index * orderStep }));
}
