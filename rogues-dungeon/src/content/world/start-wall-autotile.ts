import type { Position } from "../../game/types.ts";
export const START_WALL_TILE_LIMIT = 50;

const wallFrameGrid = Object.freeze({
  top: Object.freeze([6, 7, 8]),
  bottom: Object.freeze([30, 31, 32]),
});

function isFloor(map: number[][], x: number, y: number) { return map[y]?.[x] === 0; }
function edgeFrame(before: boolean, after: boolean, frames: readonly number[]) { return before ? after ? frames[1] : frames[2] : after ? frames[0] : frames[1]; }
function inwardWallFrame(x: number, y: number, start: Position) {
  const horizontal = Math.abs(x - start.x) >= Math.abs(y - start.y);
  if (horizontal) return x < start.x ? 18 : 20;
  return y < start.y ? 7 : 31;
}

/**
 * Use the 3-by-3 wall motif demonstrated by wall_combinations01.tmx for the
 * closest solid walls around a new floor's start room. The simulation map
 * remains binary; this function changes presentation frames only.
 */
export function startWallAutotileFrames({ map, start, limit = START_WALL_TILE_LIMIT }: { map?: number[][]; start?: Position; limit?: number }): Map<string, number> {
  if (!start || !Array.isArray(map)) return new Map();
  const walls = [];
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[y].length; x++) if (map[y][x] === 1) {
    walls.push({ x, y, distance: (x - start.x) ** 2 + (y - start.y) ** 2 });
  }
  walls.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
  const frames = new Map();
  for (const { x, y } of walls.slice(0, Math.max(0, limit))) {
    const north = isFloor(map, x, y - 1); const east = isFloor(map, x + 1, y);
    const south = isFloor(map, x, y + 1); const west = isFloor(map, x - 1, y);
    let frame = null;
    if (south) frame = edgeFrame(isFloor(map, x - 1, y + 1), isFloor(map, x + 1, y + 1), wallFrameGrid.top);
    else if (north) frame = edgeFrame(isFloor(map, x - 1, y - 1), isFloor(map, x + 1, y - 1), wallFrameGrid.bottom);
    else if (east) frame = edgeFrame(north, south, [6, 18, 30]);
    else if (west) frame = edgeFrame(north, south, [8, 20, 32]);
    else if (isFloor(map, x + 1, y + 1)) frame = 6;
    else if (isFloor(map, x - 1, y + 1)) frame = 8;
    else if (isFloor(map, x + 1, y - 1)) frame = 30;
    else if (isFloor(map, x - 1, y - 1)) frame = 32;
    // The reference motif reserves frame 19 for a black, enclosed void. The
    // nearby solid cells instead continue the wall face nearest the room.
    else frame = inwardWallFrame(x, y, start);
    if (frame !== null) frames.set(`${x},${y}`, frame);
  }
  return frames;
}
