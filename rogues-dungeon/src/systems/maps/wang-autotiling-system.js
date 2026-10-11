const DIRECTIONS = Object.freeze([
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1],
]);
import { isWalkable } from "../procedural-generation/level-grid.js";

// Source: rogues-dungeon/documentation/dungeon-wang-mapping.md. The key is the
// eight-bit mask in Tiled's N, NE, E, SE, S, SW, W, NW order.
export const DUNGEON_WANG_TILE_BY_MASK = Object.freeze({
  7: 48,
  28: 0,
  31: 12,
  112: 5,
  124: 1,
  127: 32,
  193: 53,
  199: 49,
  223: 8,
  241: 17,
  247: 6,
  253: 30,
  255: 13,
});

export const DUNGEON_WANG_INTERIOR_TILE = 13;

// Wall sprites are placed on blocked boundary cells. These roles reuse the
// verified directional faces from the same Wang family; compound masks use
// the nearest authored face rather than inventing a new tile assignment.
const DUNGEON_WANG_WALL_BY_MASK = Object.freeze({
  1: 49, 4: 12, 16: 1, 64: 17,
  5: 12, 17: 1, 20: 1, 65: 17,
  68: 17, 80: 1,
  // Corrections learned from the seed-17 Tiled repair pass. These masks are
  // exposed at corridor bends and room joins where the broad fallback face
  // picked the wrong side of the wall.
  2: 48, 8: 0, 15: 8, 128: 53, 135: 8, 143: 8, 195: 6, 227: 6,
  // Seed-914 repair: the long corridor joins use the authored corner and
  // inset wall faces rather than the cardinal fallback faces.
  225: 6, 226: 59, 230: 21, 232: 34, 236: 21, 238: 21,
});

function wallFrameForMask(mask) {
  if (DUNGEON_WANG_WALL_BY_MASK[mask] != null) return DUNGEON_WANG_WALL_BY_MASK[mask];
  if (mask & 16) return 1;
  if (mask & 1) return 49;
  if (mask & 4) return 12;
  return 17;
}

function walkableAt(grid, x, y) { return Array.isArray(grid) ? grid[y]?.[x] === 0 : isWalkable(grid, x, y); }

export function walkableMask(grid, x, y) {
  return DIRECTIONS.reduce((mask, [dx, dy], index) => mask | (walkableAt(grid, x + dx, y + dy) ? 1 << index : 0), 0);
}

export function isWalkableBoundary(mask) { return mask !== 255; }

export function buildDungeonWangTerrain({ map, cells, tileSize = 32 }) {
  const grid = cells ? { cells } : map;
  const height = cells?.length ?? map?.length ?? 0; const width = cells?.[0]?.length ?? map?.[0]?.length ?? 0;
  const terrain = [];
  const diagnostics = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!walkableAt(grid, x, y)) continue;
    const mask = walkableMask(grid, x, y);
    const authoredFrame = DUNGEON_WANG_TILE_BY_MASK[mask];
    // A walkable cell is still floor even when its edge mask has no authored
    // Wang sprite. Use the verified plain floor tile instead of exposing a red
    // diagnostic square in the playable view.
    const frame = authoredFrame ?? DUNGEON_WANG_INTERIOR_TILE;
    const entry = { x, y, mask, worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2, frame, floorFrame: frame, wallFrame: null, wall: false };
    terrain.push(entry);
  }
  return { terrain, diagnostics };
}

export function buildDungeonWangWalls({ map, cells, tileSize = 32 }) {
  const grid = cells ? { cells } : map;
  const height = cells?.length ?? map?.length ?? 0; const width = cells?.[0]?.length ?? map?.[0]?.length ?? 0;
  const walls = []; const diagnostics = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (walkableAt(grid, x, y)) continue;
    const mask = walkableMask(grid, x, y); if (!mask) continue;
    const frame = wallFrameForMask(mask);
    const entry = { x, y, mask, worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2, frame };
    if (frame == null) diagnostics.push({ ...entry });
    walls.push(entry);
  }
  return { walls, wallDiagnostics: diagnostics };
}
