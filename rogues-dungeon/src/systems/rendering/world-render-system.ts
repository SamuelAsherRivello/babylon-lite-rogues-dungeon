import type { Direction, Entity, FloorTriggerDoorBarrelSet, MassBearingPosition, Position, TerrainCell, WorldDecoration } from "../../game/types.ts";
type RenderGrid = number[][] | TerrainCell[][];
interface WangEntry extends Position { mask: number; worldX: number; worldY: number; frame: number | null; floorFrame?: number | null }
interface WangModel { tileSize: number; terrain: WangEntry[]; walls: WangEntry[]; diagnostics: Omit<WangEntry, "frame">[]; wallDiagnostics: Omit<WangEntry, "frame">[] }
interface WorldOptions { map?: number[][] | null; cells?: TerrainCell[][] | null; entities?: Entity[]; decorations?: WorldDecoration[]; objectSets?: FloorTriggerDoorBarrelSet[]; player: MassBearingPosition; start?: Position; tileSize?: number; view?: string; detail?: string; groundTiles?: number[] | null; wallTiles?: number[] | null }
interface Projection { center: Position; viewportWidth: number; viewportHeight: number; tileCssSize: number }
export interface WorldCellBounds { minX: number; maxX: number; minY: number; maxY: number }
function isLegacyGrid(grid: RenderGrid): grid is number[][] { return Array.isArray(grid) && (grid.length === 0 || typeof grid[0]?.[0] === "number"); }
import { buildDungeonWangTerrain, buildDungeonWangWalls } from "./tile-map-system.ts";

const wangTerrainCache = new WeakMap<RenderGrid, WangModel>();
const tiledPresentationCache = new WeakMap<RenderGrid, WeakMap<readonly number[], WeakMap<readonly number[], WangModel>>>();

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

/** Compile immutable tile frames once per floor grid and Tiled layer identity. */
export function compileStaticWorldPresentation(grid: RenderGrid, tileSize: number, groundTiles: number[] | null, wallTiles: number[] | null): WangModel {
  const computed = getWangTerrain(grid, tileSize);
  if (!groundTiles && !wallTiles) return computed;
  // A partially supplied layer is uncommon and cannot use the two-layer
  // identity cache without inventing a sentinel that could hide later edits.
  if (!groundTiles || !wallTiles) return applyTiledFrames(computed, grid, groundTiles, wallTiles, tileSize);
  let groundCache = tiledPresentationCache.get(grid);
  if (!groundCache) { groundCache = new WeakMap(); tiledPresentationCache.set(grid, groundCache); }
  let wallCache = groundCache.get(groundTiles);
  if (!wallCache) { wallCache = new WeakMap(); groundCache.set(groundTiles, wallCache); }
  const cached = wallCache.get(wallTiles);
  if (cached?.tileSize === tileSize) return cached;
  const compiled = applyTiledFrames(computed, grid, groundTiles, wallTiles, tileSize);
  wallCache.set(wallTiles, compiled);
  return compiled;
}

/** Build renderer-neutral geometry/placement for either world view. */
export const WorldRender = Object.freeze({
  Render({ map = null, cells = null, entities = [], decorations = [], objectSets = [], player, start = player, tileSize = 32, view = "game", detail = "full", groundTiles = null, wallTiles = null }: WorldOptions) {
    const grid = (cells ?? map)!;
    const { terrain, walls, diagnostics, wallDiagnostics } = compileStaticWorldPresentation(grid, tileSize, groundTiles, wallTiles);
    const actors = entities.filter((entry) => entry.kind === "enemy").map((entry) => ({ id: entry.id, kind: entry.name === "Skeleton" || entry.name === "Skeleton Archer" ? "skeleton" : "rat", heading: entry.heading ?? "e", x: entry.x, y: entry.y, worldX: entry.x * tileSize + tileSize / 2, worldY: entry.y * tileSize + tileSize / 2 }));
    const objects = entities.filter((entry) => ["item", "potion", "key", "gold", "chest", "crate", "campfire", "stairs", "discovery"].includes(entry.kind)).map((entry) => ({ id: entry.id, kind: entry.kind, direction: entry.kind === "stairs" ? entry.direction : undefined, resource: entry.kind === "potion" ? entry.resource : null, opened: entry.kind === "chest" || entry.kind === "crate" ? Boolean(entry.opened) : false, openFrame: entry.kind === "crate" ? entry.openFrame : undefined, x: entry.x, y: entry.y, worldX: entry.x * tileSize + tileSize / 2, worldY: entry.y * tileSize + tileSize / 2 }));
    const puzzleObjects = objectSets.flatMap((set) => {
      const active = [player, set.barrel, ...entities].some((object) => "hasMass" in object && object.hasMass === true && set.trigger.x === object.x && set.trigger.y === object.y);
      return [
        { id: `${set.id}-trigger`, kind: "trigger" as const, active, x: set.trigger.x, y: set.trigger.y, worldX: set.trigger.x * tileSize + tileSize / 2, worldY: set.trigger.y * tileSize + tileSize / 2 },
        { id: `${set.id}-barrel`, kind: "barrel" as const, active: false, x: set.barrel.x, y: set.barrel.y, worldX: set.barrel.x * tileSize + tileSize / 2, worldY: set.barrel.y * tileSize + tileSize / 2 },
        { id: `${set.id}-door`, kind: "door" as const, active, x: set.door.x, y: set.door.y, worldX: set.door.x * tileSize + tileSize / 2, worldY: set.door.y * tileSize + tileSize / 2 },
      ];
    });
    const wallDecorations = decorations.map((decoration) => ({ ...decoration, worldX: decoration.x * tileSize + tileSize / 2, worldY: decoration.y * tileSize + tileSize / 2 }));
    return { view, detail, tileSize, width: grid[0]?.length ?? 0, height: grid.length, terrain, grounds: terrain, walls, diagnostics, wallDiagnostics, actors, objects, puzzleObjects, wallDecorations, markers: { player: { x: player.x, y: player.y }, exit: objects.find((entry) => entry.kind === "stairs") ?? null } };
  },
});

/** Inclusive camera bounds with a cell margin for sprites crossing tile edges. */
export function getVisibleWorldCellBounds(center: Position, visibleWidth: number, visibleHeight: number, margin = 1): WorldCellBounds {
  return { minX: Math.floor(center.x - visibleWidth / 2) - margin, maxX: Math.ceil(center.x + visibleWidth / 2) + margin, minY: Math.floor(center.y - visibleHeight / 2) - margin, maxY: Math.ceil(center.y + visibleHeight / 2) + margin };
}

export function isWorldCellVisible(position: Position, bounds: WorldCellBounds) {
  return position.x >= bounds.minX && position.x <= bounds.maxX && position.y >= bounds.minY && position.y <= bounds.maxY;
}

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
    // Start each Screen-mode page at the player's current position. The view
    // changes only after the player reaches one of that page's edges.
    center = { x: previousCenter.x + Math.floor((player.x - previousCenter.x + pageWidth / 2) / pageWidth) * pageWidth, y: previousCenter.y + Math.floor((player.y - previousCenter.y + pageHeight / 2) / pageHeight) * pageHeight };
  } else if (mode === "deadzone") {
    const halfX = Math.max(0, visibleWidth * 0.15); const halfY = Math.max(0, visibleHeight * 0.15);
    center = { x: player.x < previousCenter.x - halfX ? player.x + halfX : player.x > previousCenter.x + halfX ? player.x - halfX : previousCenter.x, y: player.y < previousCenter.y - halfY ? player.y + halfY : player.y > previousCenter.y + halfY ? player.y - halfY : previousCenter.y };
  } else center = { x: player.x, y: player.y };
  return { x: clampCameraAxis(center.x, visibleWidth, mapWidth), y: clampCameraAxis(center.y, visibleHeight, mapHeight) };
}

/** Return the mouse-only step that crosses a Screen-mode page boundary. */
export function getMouseScreenEdgeExit({ mode, player, target, direction, previousCenter, visibleWidth, visibleHeight, mapWidth, mapHeight }: { mode?: string; player: Position; target: Position | null; direction: Direction | null; previousCenter: Position; visibleWidth: number; visibleHeight: number; mapWidth?: number; mapHeight?: number }) {
  if (mode !== "screen" || !target || !direction || player.x !== target.x || player.y !== target.y) return null;
  const [dx, dy] = direction === "e" ? [1, 0] : direction === "w" ? [-1, 0] : direction === "s" ? [0, 1] : [0, -1];
  const nextCenter = getCameraCenter({ mode, player: { x: player.x + dx, y: player.y + dy }, previousCenter, visibleWidth, visibleHeight, mapWidth, mapHeight });
  return nextCenter.x !== previousCenter.x || nextCenter.y !== previousCenter.y ? direction : null;
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
