export const TERRAIN_ROLES = Object.freeze({
  GROUND: "ground",
  WALL: "wall",
  MOUNTAIN: "mountain",
  WATER: "water",
});

export function createTerrainCell(walkable = false, role = walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL, extra = {}) {
  return { walkable: Boolean(walkable), role, ...extra };
}

export function createSemanticCells(width, height, walkable = false, role = walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => createTerrainCell(walkable, role)));
}

export function semanticCellsFromMap(map) {
  return (map ?? []).map((row) => row.map((value) => {
    const walkable = Number(value) === 0;
    return createTerrainCell(walkable, walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL);
  }));
}

export function mapFromSemanticCells(cells) {
  return (cells ?? []).map((row) => row.map((cell) => cell?.walkable ? 0 : 1));
}

export function attachLegacyMapAdapter(floor) {
  if (!floor || !Array.isArray(floor.cells)) return floor;
  Object.defineProperty(floor, "map", { configurable: true, enumerable: true, writable: true, value: mapFromSemanticCells(floor.cells) });
  Object.defineProperty(floor, "toJSON", {
    configurable: true,
    enumerable: false,
    value() { const { map, toJSON, ...serializable } = this; return serializable; },
  });
  return floor;
}

export function ensureSemanticCells(floor) {
  if (!floor) return floor;
  if (!Array.isArray(floor.cells)) floor.cells = semanticCellsFromMap(floor.map ?? []);
  else if (Array.isArray(floor.map) && JSON.stringify(mapFromSemanticCells(floor.cells)) !== JSON.stringify(floor.map)) floor.cells = semanticCellsFromMap(floor.map);
  floor.width ??= floor.cells[0]?.length ?? 0;
  floor.height ??= floor.cells.length;
  return attachLegacyMapAdapter(floor);
}

export function cellAt(floor, x, y) { return floor?.cells?.[y]?.[x] ?? null; }
export function isWalkable(floor, x, y) { return Boolean(cellAt(floor, x, y)?.walkable); }

export function setCell(floor, x, y, { walkable, role, ...extra } = {}) {
  const cell = cellAt(floor, x, y); if (!cell) return false;
  if (walkable != null) cell.walkable = Boolean(walkable);
  if (role != null) cell.role = role;
  Object.assign(cell, extra);
  if (Array.isArray(floor.map)) floor.map[y][x] = cell.walkable ? 0 : 1;
  return true;
}

export function createLevelContext({ worldId = "One", realmId = "Unknown", levelId = 1, seed = 0, width, height, cells = null, entities = [], start = null, exit = null } = {}) {
  const semanticCells = cells ?? createSemanticCells(width, height);
  const context = {
    worldId, realmId, levelId, seed, width: width ?? semanticCells[0]?.length ?? 0, height: height ?? semanticCells.length,
    cells: semanticCells, entities, start, exit, protectedCells: [], diagnostics: [], passes: [], generation: { seed, generator: null },
  };
  context.reserveCell = (x, y) => {
    if (!cellAt(context, x, y)) return false;
    if (!context.protectedCells.some((cell) => cell.x === x && cell.y === y)) context.protectedCells.push({ x, y });
    return true;
  };
  context.writeCell = (x, y, patch = {}, scope = context.activeScope) => {
    const inBounds = Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < context.width && y < context.height;
    const inScope = !scope || (x >= scope.x && y >= scope.y && x < scope.x + scope.width && y < scope.y + scope.height);
    const protectedCell = context.protectedCells.some((cell) => cell.x === x && cell.y === y);
    if (!inBounds || !inScope || protectedCell) {
      context.diagnostics.push({ type: "write.rejected", x, y, reason: !inBounds ? "out-of-bounds" : protectedCell ? "protected-cell" : "outside-pass-scope" });
      return false;
    }
    return setCell(context, x, y, patch);
  };
  return context;
}

export function runLevelPasses(context, passes = []) {
  for (const pass of passes) {
    const before = context.diagnostics.length;
    context.activeScope = pass.scope ?? null;
    const result = pass.run(context) ?? {};
    Object.assign(context, result);
    context.passes.push({ id: pass.id, diagnostics: context.diagnostics.length - before });
    context.generation.generator ??= pass.id;
  }
  delete context.activeScope;
  return context;
}
