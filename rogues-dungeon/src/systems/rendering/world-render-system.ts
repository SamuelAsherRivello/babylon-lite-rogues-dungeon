import type { Entity, Position, TerrainCell } from "../../game/types.ts";
type RenderGrid = number[][] | TerrainCell[][];
interface WangEntry extends Position { mask: number; worldX: number; worldY: number; frame: number | null; floorFrame?: number | null }
interface WangModel { tileSize: number; terrain: WangEntry[]; walls: WangEntry[]; diagnostics: Omit<WangEntry, "frame">[]; wallDiagnostics: Omit<WangEntry, "frame">[] }
interface WorldOptions { map?: number[][] | null; cells?: TerrainCell[][] | null; entities?: Entity[]; player: Position; start?: Position; tileSize?: number; view?: string; detail?: string; groundTiles?: number[] | null; wallTiles?: number[] | null }
interface Projection { center: Position; viewportWidth: number; viewportHeight: number; tileCssSize: number }
function isLegacyGrid(grid: RenderGrid): grid is number[][] { return Array.isArray(grid) && (grid.length === 0 || typeof grid[0]?.[0] === "number"); }
import { buildDungeonWangTerrain, buildDungeonWangWalls } from "./tile-map-system.ts";

const wangTerrainCache = new WeakMap<RenderGrid, WangModel>();

function getWangTerrain(grid: RenderGrid, tileSize: number): WangModel {
  const legacyGrid = isLegacyGrid(grid);
  let result = wangTerrainCache.get(grid);
  if (!result || result.tileSize !== tileSize) {
    result = { tileSize, ...buildDungeonWangTerrain(legacyGrid ? { map: grid, tileSize } : { cells: grid, tileSize }), ...buildDungeonWangWalls(legacyGrid ? { map: grid, tileSize } : { cells: grid, tileSize }) };
    wangTerrainCache.set(grid, result);
  }
  return result;
}

function applyTiledFrames(model: WangModel, grid: RenderGrid, groundTiles: number[] | null, wallTiles: number[] | null, tileSize: number) {
  const width = grid[0]?.length ?? 0;
  const height = grid.length;
  const legacyGrid = isLegacyGrid(grid);
  const withFrames = (entries: WangEntry[], tiles: number[] | null) => entries.map((entry) => {
    const gid = Number(tiles?.[entry.y * width + entry.x] ?? 0);
    return gid > 0 ? { ...entry, frame: gid - 1, floorFrame: gid - 1 } : { ...entry, frame: null, floorFrame: null };
  });
  const entriesFromLayer = (tiles: number[] | null, blocked: boolean) => {
    if (!Array.isArray(tiles)) return null;
    const metadata = new Map(model.walls.map((entry) => [`${entry.x},${entry.y}`, entry]));
    const entries = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const gid = Number(tiles[y * width + x] ?? 0);
      const walkable = legacyGrid ? grid[y]?.[x] === 0 : Boolean((grid as TerrainCell[][])[y]?.[x]?.walkable);
      if (gid <= 0 || (blocked && walkable) || (!blocked && !walkable)) continue;
      const prior = metadata.get(`${x},${y}`) ?? { x, y, mask: 0, worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2 };
      entries.push({ ...prior, frame: gid - 1, floorFrame: gid - 1 });
    }
    return entries;
  };
  const tiledGrounds = entriesFromLayer(groundTiles, false) ?? withFrames(model.terrain, groundTiles);
  const tiledWalls = entriesFromLayer(wallTiles, true) ?? withFrames(model.walls, wallTiles);
  return {
    ...model,
    terrain: tiledGrounds,
    grounds: tiledGrounds,
    walls: tiledWalls,
  };
}

/** Build renderer-neutral geometry/placement for either world view. */
export const WorldRender = Object.freeze({
  Render({ map = null, cells = null, entities = [], player, start = player, tileSize = 32, view = "game", detail = "full", groundTiles = null, wallTiles = null }: WorldOptions) {
    const grid = (cells ?? map)!;
    const computed = getWangTerrain(grid, tileSize);
    const { terrain, walls, diagnostics, wallDiagnostics } = groundTiles || wallTiles ? applyTiledFrames(computed, grid, groundTiles, wallTiles, tileSize) : computed;
    const actors = entities.filter((entry) => entry.kind === "enemy").map((entry) => ({ id: entry.id, kind: entry.name === "Skeleton" ? "skeleton" : "rat", heading: entry.heading ?? "e", x: entry.x, y: entry.y, worldX: entry.x * tileSize + tileSize / 2, worldY: entry.y * tileSize + tileSize / 2 }));
    const objects = entities.filter((entry) => ["item", "potion", "key", "gold", "chest", "stairs", "discovery"].includes(entry.kind)).map((entry) => ({ id: entry.id, kind: entry.kind, resource: entry.kind === "potion" ? entry.resource : null, x: entry.x, y: entry.y, worldX: entry.x * tileSize + tileSize / 2, worldY: entry.y * tileSize + tileSize / 2 }));
    return { view, detail, tileSize, width: grid[0]?.length ?? 0, height: grid.length, terrain, grounds: terrain, walls, diagnostics, wallDiagnostics, actors, objects, markers: { player: { x: player.x, y: player.y }, exit: objects.find((entry) => entry.kind === "stairs") ?? null } };
  },
});

function clampCameraAxis(value: number, visibleSpan: number, mapSpan: number | undefined) {
  if (!Number.isFinite(mapSpan) || mapSpan! < visibleSpan) return value;
  const min = visibleSpan / 2 - 0.5;
  const max = mapSpan! - visibleSpan / 2 - 0.5;
  return Math.min(max, Math.max(min, value));
}

/** Return the world coordinate centered by a camera policy, in tile units. */
export function getCameraCenter({ mode = "center", player, previousCenter = player, visibleWidth, visibleHeight, mapWidth, mapHeight }: { mode?: string; player: Position; previousCenter?: Position; visibleWidth: number; visibleHeight: number; mapWidth?: number; mapHeight?: number }) {
  let center;
  if (mode === "screen") {
    const pageWidth = Math.max(1, Math.floor(visibleWidth)); const pageHeight = Math.max(1, Math.floor(visibleHeight));
    center = { x: Math.floor(player.x / pageWidth) * pageWidth + pageWidth / 2, y: Math.floor(player.y / pageHeight) * pageHeight + pageHeight / 2 };
  } else if (mode === "deadzone") {
    const halfX = Math.max(0, visibleWidth * 0.15); const halfY = Math.max(0, visibleHeight * 0.15);
    center = { x: player.x < previousCenter.x - halfX ? player.x + halfX : player.x > previousCenter.x + halfX ? player.x - halfX : previousCenter.x, y: player.y < previousCenter.y - halfY ? player.y + halfY : player.y > previousCenter.y + halfY ? player.y - halfY : previousCenter.y };
  } else center = { x: player.x, y: player.y };
  return { x: clampCameraAxis(center.x, visibleWidth, mapWidth), y: clampCameraAxis(center.y, visibleHeight, mapHeight) };
}

/** Project a world-cell coordinate into viewport CSS pixels using the active camera and zoom. */
export function getWorldScreenPosition({ x, y, center, viewportWidth, viewportHeight, tileCssSize }: Projection & Position) {
  return {
    left: viewportWidth / 2 + (x - center.x) * tileCssSize,
    top: viewportHeight / 2 + (y - center.y) * tileCssSize - tileCssSize / 2,
  };
}

/** Invert a centered world view: each integer cell coordinate refers to its sprite center. */
export function getWorldCellAtScreenPosition({ screenX, screenY, center, viewportWidth, viewportHeight, tileCssSize }: Projection & { screenX: number; screenY: number }) {
  return {
    x: Math.floor(center.x + (screenX - viewportWidth / 2) / tileCssSize + 0.5),
    y: Math.floor(center.y + (screenY - viewportHeight / 2) / tileCssSize + 0.5),
  };
}

/** Project a cell center for overlays that occupy the entire tile, such as the targeting reticle. */
export function getWorldCellScreenCenter({ x, y, center, viewportWidth, viewportHeight, tileCssSize }: Projection & Position) {
  return {
    left: viewportWidth / 2 + (x - center.x) * tileCssSize,
    top: viewportHeight / 2 + (y - center.y) * tileCssSize,
  };
}
