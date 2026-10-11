import type { Entity, Position, TerrainCell } from "../../game/types.ts";
export interface Grid { cells?: TerrainCell[][]; map?: number[][]; width?: number; height?: number }
interface Scope extends Position { width: number; height: number }
interface LevelOptions { worldId?: string; realmId?: string; levelId?: number; seed?: number; width?: number; height?: number; cells?: TerrainCell[][] | null; entities?: Entity[]; start?: Position | null; exit?: Position | null }
export interface LevelContext extends Grid { worldId: string; realmId: string; levelId: number; seed: number; width: number; height: number; cells: TerrainCell[][]; entities: Entity[]; start: Position | null; exit: Position | null; protectedCells: Position[]; diagnostics: (Position & { type: string; reason: string })[]; passes: { id: string; diagnostics: number }[]; generation: { seed: number; generator: string | null }; activeScope?: Scope | null; reserveCell(x: number, y: number): boolean; writeCell(x: number, y: number, patch?: Partial<TerrainCell>, scope?: Scope | null): boolean }
interface LevelPass { id: string; scope?: Scope; run(context: LevelContext): Partial<LevelContext> | void }
export const TERRAIN_ROLES = Object.freeze({
  GROUND: "ground",
  WALL: "wall",
  MOUNTAIN: "mountain",
  WATER: "water",
});

export function createTerrainCell(walkable = false, role = walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL, extra: Partial<TerrainCell> = {}) {
  return { walkable: Boolean(walkable), role, ...extra };
}

export function createSemanticCells(width: number, height: number, walkable = false, role = walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => createTerrainCell(walkable, role)));
}

export function semanticCellsFromMap(map: number[][]) {
  return (map ?? []).map((row) => row.map((value) => {
    const walkable = Number(value) === 0;
    return createTerrainCell(walkable, walkable ? TERRAIN_ROLES.GROUND : TERRAIN_ROLES.WALL);
  }));
}

export function mapFromSemanticCells(cells: TerrainCell[][]) {
  return (cells ?? []).map((row) => row.map((cell) => cell?.walkable ? 0 : 1));
}

export function attachLegacyMapAdapter<T extends Grid>(floor: T): T {
  if (!floor || !Array.isArray(floor.cells)) return floor;
  Object.defineProperty(floor, "map", { configurable: true, enumerable: true, writable: true, value: mapFromSemanticCells(floor.cells) });
  Object.defineProperty(floor, "toJSON", {
    configurable: true,
    enumerable: false,
    value() { const { map, toJSON, ...serializable } = this; return serializable; },
  });
  return floor;
}

export function ensureSemanticCells<T extends Grid>(floor: T): T & { cells: TerrainCell[][] } {
  if (!floor) return floor as T & { cells: TerrainCell[][] };
  if (!Array.isArray(floor.cells)) floor.cells = semanticCellsFromMap(floor.map ?? []);
  else if (Array.isArray(floor.map) && JSON.stringify(mapFromSemanticCells(floor.cells)) !== JSON.stringify(floor.map)) floor.cells = semanticCellsFromMap(floor.map);
  floor.width ??= floor.cells[0]?.length ?? 0;
  floor.height ??= floor.cells.length;
  return attachLegacyMapAdapter(floor) as T & { cells: TerrainCell[][] };
}

export function cellAt(floor: Grid | null | undefined, x: number, y: number) { return floor?.cells?.[y]?.[x] ?? null; }
export function isWalkable(floor: Grid | null | undefined, x: number, y: number) { return Boolean(cellAt(floor, x, y)?.walkable); }

export function setCell(floor: Grid, x: number, y: number, { walkable, role, ...extra }: Partial<TerrainCell> = {}) {
  const cell = cellAt(floor, x, y); if (!cell) return false;
  if (walkable != null) cell.walkable = Boolean(walkable);
  if (role != null) cell.role = role;
  Object.assign(cell, extra);
  if (Array.isArray(floor.map)) floor.map[y][x] = cell.walkable ? 0 : 1;
  return true;
}

export function createLevelContext({ worldId = "One", realmId = "Unknown", levelId = 1, seed = 0, width, height, cells = null, entities = [], start = null, exit = null }: LevelOptions = {}) {
  const semanticCells = cells ?? createSemanticCells(width ?? 0, height ?? 0);
  const context: LevelContext = {
    worldId, realmId, levelId, seed, width: width ?? semanticCells[0]?.length ?? 0, height: height ?? semanticCells.length,
    cells: semanticCells, entities, start, exit, protectedCells: [], diagnostics: [], passes: [], generation: { seed, generator: null }, reserveCell: () => false, writeCell: () => false,
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

export function runLevelPasses(context: LevelContext, passes: LevelPass[] = []) {
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
