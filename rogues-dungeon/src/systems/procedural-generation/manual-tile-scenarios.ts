import type { Entity, Floor, Position, Room } from "../../game/types.ts";
import { createSemanticCells, ensureSemanticCells, mapFromSemanticCells } from "./level-grid.ts";
import { FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION } from "./procedural-generation-system.ts";

export interface ManualTileScenario {
  name: string;
  description: string;
  build(seed?: number, level?: number): Floor;
}

function carve(cells: ReturnType<typeof createSemanticCells>, room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (cells[y]?.[x]) cells[y][x].walkable = true;
}

function corridor(cells: ReturnType<typeof createSemanticCells>, from: Position, to: Position, width: number) {
  const half = Math.floor(width / 2); let x = from.x; let y = from.y;
  const carveHorizontal = () => { for (let offset = -half; offset < width - half; offset++) if (cells[y]?.[x + offset]) cells[y][x + offset].walkable = true; };
  const carveVertical = () => { for (let offset = -half; offset < width - half; offset++) if (cells[y + offset]?.[x]) cells[y + offset][x].walkable = true; };
  while (x !== to.x) { carveHorizontal(); x += Math.sign(to.x - x); }
  while (y !== to.y) { carveVertical(); y += Math.sign(to.y - y); }
  carveVertical();
}

function buildCorridorJoins(seed = 13579, level = 1): Floor {
  const cells = createSemanticCells(FLOOR_WIDTH, FLOOR_HEIGHT); const rooms: Room[] = [
    { x: 38, y: 38, w: 9, h: 9 }, { x: 58, y: 38, w: 11, h: 7 },
    { x: 58, y: 54, w: 7, h: 11 }, { x: 35, y: 62, w: 13, h: 7 },
  ]; rooms.forEach((room) => carve(cells, room));
  corridor(cells, { x: 46, y: 42 }, { x: 58, y: 42 }, 1);
  corridor(cells, { x: 61, y: 44 }, { x: 61, y: 54 }, 2);
  corridor(cells, { x: 58, y: 59 }, { x: 47, y: 65 }, 3);
  corridor(cells, { x: 41, y: 62 }, { x: 41, y: 46 }, 1);
  const start = { x: 42, y: 42 }; const exit = { x: 61, y: 59 };
  const entities: Entity[] = [{ id: "stairs", kind: "stairs", ...exit }, { id: "scenario-potion", kind: "potion", resource: "health", x: 62, y: 57 }];
  return ensureSemanticCells({ seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells, start, entities, time: 0, level, generatorVersion: GENERATOR_VERSION, scenario: "corridor-joins", generation: { seed, generator: "manual-tile-scenario", passes: [{ id: "corridor-joins", diagnostics: 0 }] } } as Floor & { scenario: string });
}

export const MANUAL_TILE_SCENARIOS: Readonly<Record<string, ManualTileScenario>> = Object.freeze({
  "corridor-joins": { name: "corridor-joins", description: "Room joins with one, two, and three tile corridors.", build: buildCorridorJoins },
});

export function getManualTileScenario(name: string | null | undefined) { return name ? MANUAL_TILE_SCENARIOS[name] ?? null : null; }
export function buildManualTileScenario(name: string, seed = 13579, level = 1) { const scenario = getManualTileScenario(name); if (!scenario) return null; return scenario.build(seed, level); }
export function scenarioMap(floor: Floor) { return mapFromSemanticCells(floor.cells); }
