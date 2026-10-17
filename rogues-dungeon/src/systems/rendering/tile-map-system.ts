import type { Campaign, Entity, Floor } from "../../game/types.ts";
import type { Grid } from "../procedural/level-grid-system.ts";
import type { TerrainCell } from "../../game/types.ts";
export interface TiledProperty { name: string; type?: string; value: unknown }
export interface TiledObject { id: number; name: string; type: string; x: number; y: number; width?: number; height?: number; properties?: TiledProperty[] }
export interface TileLayer { id: number; name: string; type: "tilelayer"; visible: boolean; opacity: number; width: number; height: number; data: number[] }
export interface ObjectLayer { id: number; name: string; type: "objectgroup"; visible: boolean; opacity: number; draworder: string; objects: TiledObject[] }
export interface TiledMap { type: string; version: string; tiledversion: string; orientation: string; renderorder: string; width: number; height: number; tilewidth: number; tileheight: number; infinite: boolean; properties: TiledProperty[]; tilesets: { firstgid: number; source: string }[]; layers: (TileLayer | ObjectLayer)[] }
import { FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION, generateFloor } from "../procedural/world-procedural-system.ts";
import { ensureSemanticCells, isWalkable, semanticCellsFromMap } from "../procedural/level-grid-system.ts";

export const TILED_TILE_SIZE = 32;
export const DUNGEON_TILESET_SOURCE = "../../assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx";
// The upper-left room's 4-by-3 interior is the shared walkable-floor family.
// These IDs are deliberately independent of a visual theme: every theme uses
// the same 12-by-9 atlas layout. The omitted variants contain bright green
// moss at a tile edge, which reads as a seam when adjacent floor cells use a
// cleaner variant.
export const DUNGEON_FLOOR_TILE_GIDS = Object.freeze([14, 26, 27, 29, 38, 39, 40]);

function dungeonFloorTileGid(x: number, y: number) {
  const hash = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  return DUNGEON_FLOOR_TILE_GIDS[((hash ^ (hash >>> 13)) >>> 0) % DUNGEON_FLOOR_TILE_GIDS.length];
}

const DIRECTIONS = Object.freeze([[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]);
export const DUNGEON_WANG_TILE_BY_MASK: Readonly<Record<number, number>> = Object.freeze({ 7: 48, 28: 0, 31: 12, 112: 5, 124: 1, 127: 32, 193: 53, 199: 49, 223: 8, 241: 17, 247: 6, 253: 30, 255: 13 });
export const DUNGEON_WANG_INTERIOR_TILE = 13;
const DUNGEON_WANG_WALL_BY_MASK: Readonly<Record<number, number>> = Object.freeze({ 1: 49, 4: 12, 16: 1, 64: 17, 5: 12, 17: 1, 20: 1, 65: 17, 68: 17, 80: 1, 2: 48, 8: 0, 15: 8, 128: 53, 135: 8, 143: 8, 195: 6, 227: 6, 225: 6, 226: 59, 230: 21, 232: 34, 236: 21, 238: 21 });
const CARDINAL_BITS = Object.freeze([1, 4, 16, 64]);
const DIAGONAL_BITS = Object.freeze([2, 8, 32, 128]);
function maskDistance(actual: number, candidate: number) { let score = 0; for (const bit of CARDINAL_BITS) if ((actual & bit) !== (candidate & bit)) score += 8; for (const bit of DIAGONAL_BITS) if ((actual & bit) !== (candidate & bit)) score += 1; return score; }
function nearestFrame(mask: number, table: Readonly<Record<number, number>>) { return Object.entries(table).map(([candidate, frame]) => ({ candidate: Number(candidate), frame, score: maskDistance(mask, Number(candidate)) })).sort((a, b) => a.score - b.score || a.candidate - b.candidate)[0]?.frame ?? null; }
function walkableAt(grid: number[][] | Grid | undefined, x: number, y: number) { return Array.isArray(grid) ? grid[y]?.[x] === 0 : isWalkable(grid, x, y); }
export function walkableMask(grid: number[][] | Grid | undefined, x: number, y: number) { return DIRECTIONS.reduce((mask, [dx, dy], index) => mask | (walkableAt(grid, x + dx, y + dy) ? 1 << index : 0), 0); }
export function isWalkableBoundary(mask: number) { return mask !== 255; }
export function buildDungeonWangTerrain({ map, cells, tileSize = 32 }: { map?: number[][]; cells?: TerrainCell[][]; tileSize?: number }) { const grid = cells ? { cells } : map; const height = cells?.length ?? map?.length ?? 0; const width = cells?.[0]?.length ?? map?.[0]?.length ?? 0; const terrain = []; const diagnostics: { x: number; y: number; mask: number; worldX: number; worldY: number }[] = []; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { if (!walkableAt(grid, x, y)) continue; const mask = walkableMask(grid, x, y); const frame = dungeonFloorTileGid(x, y) - 1; terrain.push({ x, y, mask, worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2, frame, floorFrame: frame, wallFrame: null, wall: false }); } return { terrain, diagnostics }; }
export function buildDungeonWangWalls({ map, cells, tileSize = 32 }: { map?: number[][]; cells?: TerrainCell[][]; tileSize?: number }) { const grid = cells ? { cells } : map; const height = cells?.length ?? map?.length ?? 0; const width = cells?.[0]?.length ?? map?.[0]?.length ?? 0; const walls = []; const diagnostics: { x: number; y: number; mask: number; worldX: number; worldY: number }[] = []; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { if (walkableAt(grid, x, y)) continue; const mask = walkableMask(grid, x, y); if (!mask) continue; const frame = DUNGEON_WANG_WALL_BY_MASK[mask] ?? nearestFrame(mask, DUNGEON_WANG_WALL_BY_MASK); const entry = { x, y, mask, worldX: x * tileSize + tileSize / 2, worldY: y * tileSize + tileSize / 2, frame }; if (frame == null) diagnostics.push({ ...entry }); walls.push(entry); } return { walls, wallDiagnostics: diagnostics }; }

function propertiesObject(properties: TiledProperty[] = []) { return Object.fromEntries(properties.map(({ name, value }) => [name, value])); }
function propertiesArray(values: Record<string, unknown>): TiledProperty[] { return Object.entries(values).filter(([, value]) => value !== undefined).map(([name, value]) => ({ name, type: typeof value === "number" ? "int" : "string", value })); }
function objectLayer(name: string, id: number, objects: TiledObject[]): ObjectLayer { return { id, name, type: "objectgroup", visible: true, opacity: 1, draworder: "topdown", objects }; }
function objectCell(object: TiledObject) { return { x: Math.floor(Number(object.x) / TILED_TILE_SIZE), y: Math.floor(Number(object.y) / TILED_TILE_SIZE) }; }

export function serializeFloorToTiled({ campaign, generatorVersion = GENERATOR_VERSION }: { campaign?: Campaign; generatorVersion?: string } = {}): TiledMap {
  const floor = campaign ? ensureSemanticCells(campaign.floor) : null;
  if (!floor?.cells?.length) throw new Error("Cannot export an empty dungeon floor.");
  if (!campaign) throw new Error("Cannot export an empty dungeon floor.");
  const width = Number(floor.width ?? floor.cells[0].length); const height = Number(floor.height ?? floor.cells.length);
  const wallModel = buildDungeonWangWalls({ cells: floor.cells, tileSize: TILED_TILE_SIZE });
  const wallByCell = new Map(wallModel.walls.map((cell) => [`${cell.x},${cell.y}`, cell.frame == null ? 0 : cell.frame + 1]));
  // Ground art varies by coordinate, while wall decisions remain exclusively
  // in Walls. The stable selection keeps exports and in-game rendering aligned.
  const grounds = floor.cells.flatMap((row, y) => row.map((cell, x) => cell.walkable ? dungeonFloorTileGid(x, y) : 0));
  const walls = floor.cells.flatMap((row, y) => row.map((cell, x) => !cell.walkable ? (wallByCell.get(`${x},${y}`) ?? 0) : 0));
  const toObject = (entity: Entity, index: number) => ({ id: index + 1, name: entity.id ?? `${entity.kind}-${index}`, type: entity.kind, x: entity.x * TILED_TILE_SIZE, y: entity.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE, properties: propertiesArray({ ...entity, x: undefined, y: undefined, id: undefined, kind: undefined }) });
  const pickups = (floor.entities ?? []).filter((entity) => ["item", "potion", "key", "gold", "chest", "discovery"].includes(entity.kind));
  const decorations = (floor.entities ?? []).filter((entity) => !pickups.includes(entity));
  const markers = [
    { id: 10001, name: "player", type: "player", x: campaign.player.x * TILED_TILE_SIZE, y: campaign.player.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE },
    ...((floor.entities ?? []).filter((entity) => entity.kind === "stairs" && entity.direction !== "back").map((entity, index) => ({ id: 10002 + index, name: "exit", type: "exit", x: entity.x * TILED_TILE_SIZE, y: entity.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE }))),
  ];
  return {
    type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "orthogonal", renderorder: "right-down",
    width, height, tilewidth: TILED_TILE_SIZE, tileheight: TILED_TILE_SIZE, infinite: false,
    properties: propertiesArray({ world: campaign.world === "One" ? 1 : campaign.world, level: floor.level ?? 1, seed: floor.seed, scenario: floor.scenario, generatorVersion, coordinateConvention: "tile-origin" }),
    tilesets: [{ firstgid: 1, source: DUNGEON_TILESET_SOURCE }],
    layers: [
      { id: 1, name: "Grounds", type: "tilelayer", visible: true, opacity: 1, width, height, data: grounds },
      { id: 2, name: "Walls", type: "tilelayer", visible: true, opacity: 1, width, height, data: walls },
      objectLayer("Pickups", 3, pickups.map(toObject)), objectLayer("Decorations", 4, [...decorations.map(toObject), ...markers]),
    ],
  };
}

function tileLayer(map: Partial<TiledMap>, name: string) { return map.layers?.find((layer): layer is TileLayer => layer.type === "tilelayer" && layer.name === name); }
function objectLayerByName(map: Partial<TiledMap>, name: string) { return map.layers?.find((layer): layer is ObjectLayer => layer.type === "objectgroup" && layer.name === name); }

export function validateTiledRepairMap(input: unknown) {
  const map = (typeof input === "object" && input !== null ? input : {}) as Partial<TiledMap>;
  const properties = propertiesObject(map?.properties);
  const grounds = tileLayer(map, "Grounds"); const walls = tileLayer(map, "Walls"); const pickups = objectLayerByName(map, "Pickups"); const decorations = objectLayerByName(map, "Decorations");
  const errors = [];
  if (map?.type !== "map" || map.orientation !== "orthogonal") errors.push("map must be an orthogonal Tiled map");
  if (map?.width !== FLOOR_WIDTH || map?.height !== FLOOR_HEIGHT) errors.push(`map must be ${FLOOR_WIDTH} by ${FLOOR_HEIGHT} tiles`);
  if (map?.tilewidth !== TILED_TILE_SIZE || map?.tileheight !== TILED_TILE_SIZE) errors.push("map tiles must be 32 by 32 pixels");
  if (!grounds || !Array.isArray(grounds.data) || grounds.data.length !== FLOOR_WIDTH * FLOOR_HEIGHT) errors.push("Grounds layer is missing or has the wrong size");
  if (!walls || !Array.isArray(walls.data) || walls.data.length !== FLOOR_WIDTH * FLOOR_HEIGHT) errors.push("Walls layer is missing or has the wrong size");
  if (!pickups || !decorations) errors.push("Pickups and Decorations object layers are required");
  if (grounds && walls && grounds.data.some((cell, index) => Number(cell) > 0 && Number(walls.data[index]) > 0)) errors.push("Grounds and Walls overlap");
  if (!properties.generatorVersion || properties.coordinateConvention !== "tile-origin") errors.push("generation metadata is missing");
  const player = decorations?.objects?.find((object) => object.type === "player"); const exit = decorations?.objects?.find((object) => object.type === "exit");
  if (!player) errors.push("player marker is missing"); if (!exit) errors.push("exit marker is missing");
  for (const object of [player, exit]) if (object && (!Number.isInteger(object.x) || !Number.isInteger(object.y))) errors.push("markers must use integer tile-aligned coordinates");
  return { valid: errors.length === 0, errors, properties, grounds, walls, pickups, decorations, markers: decorations };
}

export function floorFromTiledRepairMap(map: unknown, fallbackFloor: Floor | null = null): Floor {
  const checked = validateTiledRepairMap(map); if (!checked.valid) throw new Error(`Invalid repaired map: ${checked.errors.join("; ")}`);
  const fallbackCells = fallbackFloor ? ensureSemanticCells(fallbackFloor).cells : null;
  const mapData = Array.from({ length: FLOOR_HEIGHT }, (_, y) => checked.grounds!.data.slice(y * FLOOR_WIDTH, (y + 1) * FLOOR_WIDTH).map((cell, x) => Number(cell) > 0 ? 0 : Number(checked.walls!.data[y * FLOOR_WIDTH + x]) > 0 ? 1 : (fallbackCells?.[y]?.[x]?.walkable ? 0 : 1)));
  const markers = checked.markers!.objects; const player = objectCell(markers.find((object) => object.type === "player")!); const exit = objectCell(markers.find((object) => object.type === "exit")!);
  if (mapData[player.y]?.[player.x] !== 0 || mapData[exit.y]?.[exit.x] !== 0) throw new Error("player and exit markers must be on walkable cells");
  const toEntity = (object: TiledObject): Entity => { const position = objectCell(object); const props = propertiesObject(object.properties); return { ...props, id: object.name || props.id, kind: object.type || props.kind, x: position.x, y: position.y } as Entity; };
  const entities = [...(checked.pickups!.objects ?? []), ...(checked.decorations!.objects ?? [])].filter((object) => !["player", "exit"].includes(object.type)).map(toEntity);
  if (!entities.some((entity) => entity.kind === "stairs")) entities.push({ id: "stairs", kind: "stairs", x: exit.x, y: exit.y });
  const floor = { ...(fallbackFloor ?? generateFloor(Number(checked.properties.level ?? 1), Number(checked.properties.seed ?? 0), Number(checked.properties.level ?? 1))), seed: Number(checked.properties.seed ?? fallbackFloor?.seed ?? 0), width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells: semanticCellsFromMap(mapData), start: player, entities, level: Number(checked.properties.level ?? fallbackFloor?.level ?? 1), scenario: typeof checked.properties.scenario === "string" ? checked.properties.scenario : fallbackFloor?.scenario, generatorVersion: GENERATOR_VERSION, tiledGrounds: checked.grounds!.data.slice(), tiledWalls: checked.walls!.data.slice() };
  return ensureSemanticCells(floor);
}

export function compareTiledRepairLayers(generated: TiledMap, repaired: TiledMap) {
  const layer = (map: TiledMap, name: string) => map.layers.find((entry): entry is TileLayer => entry.type === "tilelayer" && entry.name === name)?.data ?? [];
  const differences: { layer: "Grounds" | "Walls"; index: number; generated: number; repaired: number }[] = [];
  for (const name of ["Grounds", "Walls"] as const) { const expected = layer(generated, name); const actual = layer(repaired, name); for (let index = 0; index < Math.max(expected.length, actual.length); index++) if (Number(expected[index] ?? 0) !== Number(actual[index] ?? 0)) differences.push({ layer: name, index, generated: Number(expected[index] ?? 0), repaired: Number(actual[index] ?? 0) }); }
  return differences;
}
