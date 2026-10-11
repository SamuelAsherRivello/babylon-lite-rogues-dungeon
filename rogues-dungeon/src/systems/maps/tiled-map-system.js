import { FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION, generateFloor } from "../procedural-generation/procedural-generation-system.js";
import { ensureSemanticCells, semanticCellsFromMap } from "../procedural-generation/level-grid.js";
import { buildDungeonWangWalls } from "./wang-autotiling-system.js";

export const TILED_TILE_SIZE = 32;
export const DUNGEON_TILESET_SOURCE = "../../assets/Tiled_Examples/Tilesets/Tileset_Dungeon.tsx";
const DUNGEON_TILESET_GROUND_GID = 14;

function propertiesObject(properties = []) { return Object.fromEntries(properties.map(({ name, value }) => [name, value])); }
function propertiesArray(values) { return Object.entries(values).filter(([, value]) => value !== undefined).map(([name, value]) => ({ name, type: typeof value === "number" ? "int" : "string", value })); }
function objectLayer(name, id, objects) { return { id, name, type: "objectgroup", visible: true, opacity: 1, draworder: "topdown", objects }; }
function objectCell(object) { return { x: Math.floor(Number(object.x) / TILED_TILE_SIZE), y: Math.floor(Number(object.y) / TILED_TILE_SIZE) }; }

export function serializeFloorToTiled({ campaign, generatorVersion = GENERATOR_VERSION } = {}) {
  const floor = ensureSemanticCells(campaign?.floor);
  if (!floor?.cells?.length) throw new Error("Cannot export an empty dungeon floor.");
  const width = Number(floor.width ?? floor.cells[0].length); const height = Number(floor.height ?? floor.cells.length);
  const wallModel = buildDungeonWangWalls({ cells: floor.cells, tileSize: TILED_TILE_SIZE });
  const wallByCell = new Map(wallModel.walls.map((cell) => [`${cell.x},${cell.y}`, cell.frame == null ? 0 : cell.frame + 1]));
  // Grounds is the gameplay mask, not a Wang-art preview. Keep it deliberately
  // boring: one verified walkable tile marks every floor cell and nothing else.
  // Wall decisions belong exclusively to Walls, so editing a ground cell in
  // Tiled cannot accidentally encode a wall shape.
  const grounds = floor.cells.flatMap((row) => row.map((cell) => cell.walkable ? DUNGEON_TILESET_GROUND_GID : 0));
  const walls = floor.cells.flatMap((row, y) => row.map((cell, x) => !cell.walkable ? (wallByCell.get(`${x},${y}`) ?? 0) : 0));
  const toObject = (entity, index) => ({ id: index + 1, name: entity.id ?? `${entity.kind}-${index}`, type: entity.kind, x: entity.x * TILED_TILE_SIZE, y: entity.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE, properties: propertiesArray({ ...entity, x: undefined, y: undefined, id: undefined, kind: undefined }) });
  const pickups = (floor.entities ?? []).filter((entity) => ["item", "potion", "chest", "discovery"].includes(entity.kind));
  const decorations = (floor.entities ?? []).filter((entity) => !pickups.includes(entity));
  const markers = [
    { id: 10001, name: "player", type: "player", x: campaign.player.x * TILED_TILE_SIZE, y: campaign.player.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE },
    ...((floor.entities ?? []).filter((entity) => entity.kind === "stairs").map((entity, index) => ({ id: 10002 + index, name: "exit", type: "exit", x: entity.x * TILED_TILE_SIZE, y: entity.y * TILED_TILE_SIZE, width: TILED_TILE_SIZE, height: TILED_TILE_SIZE }))),
  ];
  return {
    type: "map", version: "1.10", tiledversion: "1.10.2", orientation: "orthogonal", renderorder: "right-down",
    width, height, tilewidth: TILED_TILE_SIZE, tileheight: TILED_TILE_SIZE, infinite: false,
    properties: propertiesArray({ world: campaign.world === "One" ? 1 : campaign.world, level: floor.level ?? 1, seed: floor.seed, generatorVersion, coordinateConvention: "tile-origin" }),
    tilesets: [{ firstgid: 1, source: DUNGEON_TILESET_SOURCE }],
    layers: [
      { id: 1, name: "Grounds", type: "tilelayer", visible: true, opacity: 1, width, height, data: grounds },
      { id: 2, name: "Walls", type: "tilelayer", visible: true, opacity: 1, width, height, data: walls },
      objectLayer("Pickups", 3, pickups.map(toObject)), objectLayer("Decorations", 4, [...decorations.map(toObject), ...markers]),
    ],
  };
}

function tileLayer(map, name) { return map.layers?.find((layer) => layer.type === "tilelayer" && layer.name === name); }
function objectLayerByName(map, name) { return map.layers?.find((layer) => layer.type === "objectgroup" && layer.name === name); }

export function validateTiledRepairMap(map) {
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

export function floorFromTiledRepairMap(map, fallbackFloor = null) {
  const checked = validateTiledRepairMap(map); if (!checked.valid) throw new Error(`Invalid repaired map: ${checked.errors.join("; ")}`);
  const fallbackCells = fallbackFloor ? ensureSemanticCells(fallbackFloor).cells : null;
  const mapData = Array.from({ length: FLOOR_HEIGHT }, (_, y) => checked.grounds.data.slice(y * FLOOR_WIDTH, (y + 1) * FLOOR_WIDTH).map((cell, x) => Number(cell) > 0 ? 0 : Number(checked.walls.data[y * FLOOR_WIDTH + x]) > 0 ? 1 : (fallbackCells?.[y]?.[x]?.walkable ? 0 : 1)));
  const markers = checked.markers.objects; const player = objectCell(markers.find((object) => object.type === "player")); const exit = objectCell(markers.find((object) => object.type === "exit"));
  if (mapData[player.y]?.[player.x] !== 0 || mapData[exit.y]?.[exit.x] !== 0) throw new Error("player and exit markers must be on walkable cells");
  const toEntity = (object) => { const position = objectCell(object); const props = propertiesObject(object.properties); return { ...props, id: object.name || props.id, kind: object.type || props.kind, x: position.x, y: position.y }; };
  const entities = [...(checked.pickups.objects ?? []), ...(checked.decorations.objects ?? [])].filter((object) => !["player", "exit"].includes(object.type)).map(toEntity);
  if (!entities.some((entity) => entity.kind === "stairs")) entities.push({ id: "stairs", kind: "stairs", x: exit.x, y: exit.y });
  const floor = { ...(fallbackFloor ?? generateFloor(Number(checked.properties.level ?? 1), Number(checked.properties.seed ?? 0), Number(checked.properties.level ?? 1))), seed: Number(checked.properties.seed ?? fallbackFloor?.seed ?? 0), width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells: semanticCellsFromMap(mapData), start: player, entities, level: Number(checked.properties.level ?? fallbackFloor?.level ?? 1), generatorVersion: GENERATOR_VERSION, tiledGrounds: checked.grounds.data.slice(), tiledWalls: checked.walls.data.slice() };
  return ensureSemanticCells(floor);
}
