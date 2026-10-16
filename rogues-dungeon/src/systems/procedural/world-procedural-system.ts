import type { Action, ActionResult, Attributes, AttributeName, Campaign, ConsumableResource, Direction, Enemy, Entity, Equipment, EquipmentGroup, EventFacts, Floor, GameEvent, Item, Position, QuickSlot, Resource, ResourceInput, ResourceName, Resources, Room, WorldDecoration } from "../../game/types.ts";
import { createLevelContext, ensureSemanticCells, isWalkable, runLevelPasses } from "./level-grid-system.ts";
import { isWallDecorationCell, TRAP_FRAME_DURATION_MS, trapFrameAt, trapIsDangerous, trapStrikeDamage } from "./world-hazards-system.ts";

export const FLOOR_WIDTH = 100;
export const FLOOR_HEIGHT = 100;
export const FLOOR_CENTER = Object.freeze({ x: Math.floor(FLOOR_WIDTH / 2), y: Math.floor(FLOOR_HEIGHT / 2) });
export const GENERATOR_VERSION = "rogues-dungeon-floor-v2";
const ITEM_CAPACITY = 10;
export const VISIBLE_LANDSCAPE_SCREEN = Object.freeze({ width: 30, height: 17 });
export const PICKUP_DENSITY_DEFAULTS = Object.freeze({
  key: Object.freeze({ min: 0.5, max: 1 }),
  mana: Object.freeze({ min: 0.75, max: 1.5 }),
  health: Object.freeze({ min: 1, max: 1.75 }),
  gold: Object.freeze({ min: 1.25, max: 2 }),
});
export const GAME_TUNING = Object.freeze({
  startingHealth: 30, startingStamina: 16, startingMana: 12, innateDefense: 1,
  attackStaminaCost: 4, moveStaminaRecovery: 2, readinessFloor: 0.75,
  healthPotionRestore: 10, manaPotionRestore: 8,
  xpPerAttack: 1, xpPerKillBase: 6, xpThreshold: 100,
  enemyAwareness: 6, enemyActionCooldown: 2, sneakingAwarenessReduction: 3,
  vitalityHealthBonus: 3, strengthOffenseBonus: 1, recoveryMoveBonus: 1,
  luckTierRanks: 2, stealthAwarenessRanks: 2,
});
export const STAIRS_MAX_DISTANCE_FROM_START = 10;

function stairsForLevel(level: number, start: Position, forward: Position): Extract<Entity, { kind: "stairs" }>[] {
  const forwardStair = { id: "stairs-forward", kind: "stairs" as const, direction: "forward" as const, name: "Stairs up", ...forward };
  return level > 1
    ? [{ id: "stairs-back", kind: "stairs" as const, direction: "back" as const, name: "Stairs down", x: start.x - 3, y: start.y }, forwardStair]
    : [forwardStair];
}

export function ensureNearbyStairs(floor: Floor) {
  const level = floor.level ?? floor.depth ?? 1;
  const forward = floor.entities?.find((entity) => entity.kind === "stairs" && entity.direction !== "back") ?? { x: floor.start.x + 3, y: floor.start.y };
  const expected = stairsForLevel(level, floor.start, forward).filter((stair) => isWalkable(floor, stair.x, stair.y));
  if (!expected.length) return floor;
  floor.entities = [...(floor.entities ?? []).filter((entity) => entity.kind !== "stairs"), ...expected];
  return floor;
}
const ATTACK_STAMINA_COST = GAME_TUNING.attackStaminaCost;

export const directions = Object.freeze<Record<Direction, [number, number]>>({ n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] });
export function headingFromMovement(dx: number, dy: number, fallback: Direction = "e"): Direction {
  if (dx < 0) return "w";
  if (dx > 0) return "e";
  if (dy < 0) return "n";
  if (dy > 0) return "s";
  return fallback;
}
export const resourceNames: readonly ResourceName[] = Object.freeze(["health", "stamina", "offense", "defense", "mana", "xp"]);
export const EVENT_TYPES = Object.freeze(["action.committed", "action.rejected", "time.advanced", "player.moved", "player.sneak.changed", "combat.hit", "enemy.defeated", "resource.changed", "item.collected", "item.collection.rejected", "potion.consumed", "quick-slot.changed", "quick-slot.use.rejected", "chest.opened", "equipment.changed", "ability.used", "ability.assignment.changed", "xp.gained", "xp.level.changed", "progression.upgrade.offered", "progression.upgrade.chosen", "realm.entered", "player.died", "campaign.save.succeeded", "campaign.save.failed"]);
export const progressionStatNames: readonly AttributeName[] = Object.freeze(["vitality", "strength", "luck", "recovery", "stealth"]);
export const attributeLabels = Object.freeze({ health: "Health", stamina: "Stamina", offense: "Offense", defense: "Defense", mana: "Mana", vitality: "Vitality", strength: "Strength", luck: "Luck", recovery: "Recovery", stealth: "Stealth" });
export const statLabels = attributeLabels;
export const abilityCatalog = Object.freeze({
  heal: Object.freeze({ id: "heal", title: "Heal", icon: "✦", manaCost: 5, kind: "heal", amount: 8, target: "self", isStackable: false }),
  wand: Object.freeze({ id: "wand", title: "Wand", icon: "✹", manaCost: 4, kind: "wand", damage: 7, target: "nearest-enemy", range: 8, isStackable: false }),
});
export const itemCatalog: readonly Omit<Item, "id">[] = Object.freeze([
  { name: "Chest Plate 02", group: "armor", modifiers: { defense: 4 }, isStackable: false },
  { name: "Iron Sword 01", group: "weapons", modifiers: { offense: 8 }, isStackable: false },
  { name: "Oak Shield 03", group: "weapons", modifiers: { defense: 3 }, isStackable: false },
  { name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 }, isStackable: false },
]);
export const consumableCatalog = Object.freeze({
  health: Object.freeze({ name: "Health Potion", resource: "health" as const }),
  mana: Object.freeze({ name: "Mana Potion", resource: "mana" as const }),
});
export function isQuickSlottableItem(item: Item | null | undefined): item is Item & { category: "consumable"; consumableResource: ConsumableResource } {
  return item?.isStackable === true && item.category === "consumable" && (item.consumableResource === "health" || item.consumableResource === "mana");
}
function consumableInstance(resource: ConsumableResource, id: string, quantity = 1): Item { return { id, name: consumableCatalog[resource].name, group: "weapons", modifiers: {}, category: "consumable", consumableResource: resource, isStackable: true, quantity }; }

function ensureStarterConsumables(campaign: Campaign) {
  if (campaign.starterConsumablesSeeded) return campaign;
  const inventory = campaign.player.inventory;
  const quickSlots = Array.isArray(campaign.player.quickSlots) ? campaign.player.quickSlots : [];
  const hasHealth = inventory.some((item) => item.category === "consumable" && item.consumableResource === "health") || quickSlots.some((slot) => slot?.item.category === "consumable" && slot.item.consumableResource === "health");
  if (!hasHealth) inventory.push(consumableInstance("health", "starter-health-potion"));
  const manaPotions = inventory.filter((item) => item.category === "consumable" && item.consumableResource === "mana").reduce((total, item) => total + (item.quantity ?? 1), 0) + quickSlots.filter((slot) => slot?.item.category === "consumable" && slot.item.consumableResource === "mana").reduce((total, slot) => total + (slot?.quantity ?? 0), 0);
  if (manaPotions < 2 && inventory.length < campaign.player.inventoryCapacity) inventory.push(consumableInstance("mana", "starter-mana-potion", 2 - manaPotions));
  campaign.starterConsumablesSeeded = true;
  return campaign;
}

function rng(seed: number) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function stochasticCount(random: () => number, floorArea: number, range: { min: number; max: number }) {
  const screens = floorArea / (VISIBLE_LANDSCAPE_SCREEN.width * VISIBLE_LANDSCAPE_SCREEN.height);
  const expected = screens * (range.min + random() * (range.max - range.min));
  const whole = Math.floor(expected);
  return whole + (random() < expected - whole ? 1 : 0);
}
function seedNow() { return Math.floor(Math.random() * 0xffffffff) >>> 0; }
function blankMap(width = FLOOR_WIDTH, height = FLOOR_HEIGHT) { return Array.from({ length: height }, () => Array.from({ length: width }, () => 1)); }
function itemInstance(item: Omit<Item, "id">, id: string): Item { return { id, ...item, modifiers: { ...item.modifiers } }; }
export function normalizeQuickSlots(campaign: Campaign) {
  const input = Array.isArray(campaign.player.quickSlots) ? campaign.player.quickSlots : [];
  campaign.player.quickSlots = [0, 1].map((index) => {
    const value = input[index];
    const item = value?.item ? normalizeItem(value.item) : null;
    if (!value || !item || !isQuickSlottableItem(item) || !Number.isInteger(value.quantity) || value.quantity < 1) return null;
    return { item: structuredClone(item), quantity: value.quantity } as QuickSlot;
  }) as [QuickSlot | null, QuickSlot | null];
  return campaign;
}
function normalizeItem(item: Item): Item {
  const stackable = item.category === "consumable" && (item.consumableResource === "health" || item.consumableResource === "mana");
  return { ...item, isStackable: stackable, ...(stackable ? { quantity: Math.max(1, Math.floor(item.quantity ?? 1)) } : {}) };
}
function normalizeEquipmentItem(item: Item): Item { const { quantity: _quantity, ...equipment } = item; return { ...equipment, isStackable: false }; }
export function normalizeStackableLocations(campaign: Campaign) {
  const slots = campaign.player.quickSlots!;
  const inventory: Item[] = [];
  for (const rawItem of campaign.player.inventory ?? []) {
    const item = normalizeItem(rawItem);
    if (!isQuickSlottableItem(item)) { inventory.push(item); continue; }
    const quickIndex = slots.findIndex((slot) => slot?.item.consumableResource === item.consumableResource);
    if (quickIndex >= 0) { slots[quickIndex]!.quantity += item.quantity ?? 1; continue; }
    const existing = inventory.find((entry) => isQuickSlottableItem(entry) && entry.consumableResource === item.consumableResource);
    if (existing) existing.quantity = (existing.quantity ?? 1) + (item.quantity ?? 1);
    else inventory.push(item);
  }
  campaign.player.inventory = orderedInventory(inventory);
  campaign.player.equipment = {
    weapons: campaign.player.equipment.weapons.map((item) => item ? normalizeEquipmentItem(item) : null),
    armor: campaign.player.equipment.armor.map((item) => item ? normalizeEquipmentItem(item) : null),
  };
  return campaign;
}
function entityAt(entities: Entity[], x: number, y: number) { return entities.find((entity) => entity.x === x && entity.y === y); }
function entrancePosition(floor: Floor): Position {
  const returnStair = floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back");
  return returnStair ? { x: returnStair.x + 1, y: returnStair.y } : { ...floor.start };
}
function emit(events: GameEvent[], type: string, facts: EventFacts, state: Campaign, source = type.split(".")[0]) { events.push({ type, facts, source, gameTime: state.floor.time, sequence: events.length + 1 }); }
function carveRoom(map: number[][], room: Room) { for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) map[y][x] = 0; }
function roomCenter(room: Room) { return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function roomSocket(room: Room, target: Position) {
  const center = roomCenter(room); const horizontal = Math.abs(target.x - center.x) >= Math.abs(target.y - center.y);
  if (horizontal) return { x: target.x < center.x ? room.x : room.x + room.w - 1, y: clamp(target.y, room.y + 1, room.y + room.h - 2) };
  return { x: clamp(target.x, room.x + 1, room.x + room.w - 2), y: target.y < center.y ? room.y : room.y + room.h - 1 };
}
function carveCorridorCell(map: number[][], x: number, y: number, width: number, axis = "horizontal") {
  const half = Math.floor(width / 2);
  for (let offset = -half; offset < width - half; offset++) {
    if (map[y]?.[x] == null) continue;
    if (axis === "horizontal" && map[y]?.[x + offset] !== undefined) map[y][x + offset] = 0;
    if (axis === "vertical" && map[y + offset]?.[x] !== undefined) map[y + offset][x] = 0;
  }
}
function connectRooms(map: number[][], from: Position, to: Position, width = 1) {
  const corridorWidth = Math.max(1, Math.floor(width)); let { x, y } = from;
  while (x !== to.x) { carveCorridorCell(map, x, y, corridorWidth, "horizontal"); x += Math.sign(to.x - x); }
  while (y !== to.y) { carveCorridorCell(map, x, y, corridorWidth, "vertical"); y += Math.sign(to.y - y); }
  carveCorridorCell(map, x, y, corridorWidth, "vertical");
}

function shuffledWalkableCells(cells: ReturnType<typeof createLevelContext>["cells"], random: () => number) {
  const candidates: Position[] = [];
  for (let y = 1; y < cells.length - 1; y++) for (let x = 1; x < (cells[y]?.length ?? 1) - 1; x++) if (cells[y]?.[x]?.walkable) candidates.push({ x, y });
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates;
}

function shuffledWallDecorationCells(map: number[][], random: () => number) {
  const candidates: Position[] = [];
  for (let y = 1; y < map.length - 1; y++) for (let x = 1; x < (map[y]?.length ?? 1) - 1; x++) if (isWallDecorationCell(map, { x, y })) candidates.push({ x, y });
  for (let index = candidates.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  return candidates;
}

function structuralRoute(map: number[][], from: Position, to: Position) {
  const queue = [from]; const previous = new Map<string, Position | null>([[`${from.x},${from.y}`, null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]; if (current.x === to.x && current.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: current.x + dx, y: current.y + dy }; const key = `${next.x},${next.y}`;
      if (map[next.y]?.[next.x] !== 0 || previous.has(key)) continue;
      previous.set(key, current); queue.push(next);
    }
  }
  const route: Position[] = []; let current: Position | undefined = to;
  while (current && previous.has(`${current.x},${current.y}`)) { route.push(current); current = previous.get(`${current.x},${current.y}`) ?? undefined; }
  return route;
}

export function createResourcesModel(values: Partial<Record<ResourceName, Partial<Resource>>> = {}): Resources {
  return Object.fromEntries(resourceNames.map((name) => {
    const value = values[name] ?? {};
    return [name, { current: Number(value.current ?? 0), currentMax: Number(value.currentMax ?? 0), ...(value.level == null ? {} : { level: Number(value.level) }) }];
  })) as Resources;
}

export function isResourcesModel(value: unknown): value is Resources {
  return typeof value === "object" && value !== null && resourceNames.every((name) => { const resource = (value as Record<string, unknown>)[name]; return typeof resource === "object" && resource !== null && "current" in resource && "currentMax" in resource && Number.isFinite(resource.current) && Number.isFinite(resource.currentMax); });
}

function playerResourcesFromCampaign(campaign: Campaign, previous: ResourceInput = campaign.player.resources) {
  const attributes = effectiveAttributes(campaign);
  const current = (name: ResourceName, fallback = 0): number => { const resource = previous[name]; return resource != null && typeof resource === "object" && Number.isFinite(resource.current) ? resource.current! : typeof resource === "number" && Number.isFinite(resource) ? resource : fallback; };
  const stamina = Math.max(0, Math.min(attributes.stamina, current("stamina")));
  const readiness = combatReadiness(stamina, attributes.stamina);
  return createResourcesModel({
    health: { current: Math.max(0, Math.min(attributes.health, current("health", attributes.health))), currentMax: attributes.health },
    stamina: { current: stamina, currentMax: attributes.stamina },
    offense: { current: Math.round(attributes.offense * readiness), currentMax: attributes.offense },
    defense: { current: Math.round(attributes.defense * readiness), currentMax: attributes.defense },
    mana: { current: Math.max(0, Math.min(attributes.mana, current("mana", attributes.mana))), currentMax: attributes.mana },
    xp: { current: campaign.progression.xp, currentMax: campaign.progression.nextXp, level: campaign.progression.level },
  });
}

export function combatReadiness(currentStamina: number, maximumStamina: number) {
  const ratio = maximumStamina > 0 ? Math.max(0, Math.min(1, currentStamina / maximumStamina)) : 0;
  return GAME_TUNING.readinessFloor + (1 - GAME_TUNING.readinessFloor) * ratio;
}

export function levelUpOptions(level: number) {
  const start = Math.max(0, Number(level ?? 1) - 2) % progressionStatNames.length;
  return Object.freeze([0, 1, 2].map((offset) => progressionStatNames[(start + offset) % progressionStatNames.length]));
}

function statRank(attributes: Partial<Attributes>, name: AttributeName) { return Math.max(0, Number(attributes?.[name] ?? 0)); }
function lootTier(campaign: Campaign) { return Math.floor(statRank(campaign.progression.attributes, "luck") / GAME_TUNING.luckTierRanks); }
function recoveryAmount(campaign: Campaign) { return GAME_TUNING.moveStaminaRecovery + statRank(campaign.progression.attributes, "recovery") * GAME_TUNING.recoveryMoveBonus; }
function effectiveAwareness(campaign: Campaign, enemy: Enemy) {
  const base = Number(enemy.awareness ?? GAME_TUNING.enemyAwareness);
  const stealthReduction = Math.floor(statRank(campaign.progression.attributes, "stealth") / GAME_TUNING.stealthAwarenessRanks);
  return Math.max(1, base - stealthReduction - (campaign.player.sneaking ? GAME_TUNING.sneakingAwarenessReduction : 0));
}

function enemyResources(enemy: Pick<Enemy, "hp" | "maxHp" | "damage" | "xp"> & { resources?: Resources }, level = 1) {
  const healthMax = Number(enemy.resources?.health?.currentMax ?? enemy.maxHp ?? enemy.hp ?? 0);
  const healthCurrent = Number(enemy.resources?.health?.current ?? enemy.hp ?? healthMax);
  const offense = Number(enemy.resources?.offense?.current ?? enemy.damage ?? 0);
  const xp = Number(enemy.resources?.xp?.current ?? enemy.xp ?? 0);
  return createResourcesModel({
    health: { current: healthCurrent, currentMax: healthMax },
    stamina: { current: 0, currentMax: 0 },
    offense: { current: offense, currentMax: offense },
    defense: { current: 0, currentMax: 0 },
    mana: { current: 0, currentMax: 0 },
    xp: { current: xp, currentMax: xp, level },
  });
}

export function upgradeCampaignResources(campaign: Campaign) {
  ensureSemanticCells(campaign.floor);
  campaign.floors ??= { [campaign.floor.level ?? campaign.floor.depth ?? 1]: structuredClone(campaign.floor) };
  ensureStarterConsumables(campaign);
  normalizeQuickSlots(campaign);
  normalizeStackableLocations(campaign);
  campaign.player.heading = campaign.player.heading ?? "e";
  campaign.player.resources = playerResourcesFromCampaign(campaign);
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  for (const entity of campaign.floor.entities ?? []) if (entity.kind === "enemy") {
    if (entity.name === "Cave Rat") entity.name = "Rat";
    entity.resources = enemyResources(entity, level);
    entity.hp = entity.resources.health.current;
    entity.maxHp = entity.resources.health.currentMax;
    entity.damage = entity.resources.offense.current;
    entity.xp = entity.resources.xp.current;
    entity.awareness = Number(entity.awareness ?? GAME_TUNING.enemyAwareness);
    entity.actionCooldown = Math.max(1, Number(entity.actionCooldown ?? GAME_TUNING.enemyActionCooldown));
    entity.nextActionAt = Math.max(0, Number(entity.nextActionAt ?? campaign.floor.time + entity.actionCooldown));
    entity.heading = entity.heading ?? "e";
  }
  campaign.progression.pendingUpgrades = Array.isArray(campaign.progression.pendingUpgrades) ? campaign.progression.pendingUpgrades.filter((entry) => Array.isArray(entry?.options) && entry.options.length === 3) : [];
  campaign.floors[String(campaign.floor.level ?? campaign.floor.depth ?? 1)] = structuredClone(campaign.floor);
  return campaign;
}

export function generateFloor(level: number, seed = seedNow(), difficulty = level, options: { corridorWidth?: number; pickupDensity?: Partial<typeof PICKUP_DENSITY_DEFAULTS>; level1TestMode?: boolean } = {}): Floor {
  const random = rng(seed); const map = blankMap(); const rooms: Room[] = [];
  const corridorWidth = Math.max(1, Math.floor(Number(options?.corridorWidth ?? 1)));
  const startRoom = { x: FLOOR_CENTER.x - 3, y: FLOOR_CENTER.y - 3, w: 7, h: 7 };
  carveRoom(map, startRoom); rooms.push(startRoom);
  for (let i = 0; i < 9; i++) {
    const room = { x: 0, y: 0, w: 5 + Math.floor(random() * 5), h: 4 + Math.floor(random() * 4) };
    room.x = 2 + Math.floor(random() * (FLOOR_WIDTH - room.w - 3));
    room.y = 2 + Math.floor(random() * (FLOOR_HEIGHT - room.h - 3));
    carveRoom(map, room);
    const previous = rooms.at(-1)!; const previousSocket = roomSocket(previous, roomCenter(room)); const nextSocket = roomSocket(room, roomCenter(previous));
    connectRooms(map, previousSocket, nextSocket, corridorWidth);
    rooms.push(room);
  }
  const start = { ...FLOOR_CENTER };
  const level1TestMode = level === 1 && options.level1TestMode === true;
  const exitCandidates: Position[] = [];
  for (let y = 1; y < FLOOR_HEIGHT - 1; y++) for (let x = 1; x < FLOOR_WIDTH - 1; x++) if (map[y][x] === 0 && Math.hypot(x - start.x, y - start.y) >= 20) exitCandidates.push({ x, y });
  const distantExit = exitCandidates[Math.floor(random() * exitCandidates.length)] ?? { x: start.x + 3, y: start.y };
  const forward = level1TestMode ? { x: start.x + 3, y: start.y } : distantExit;
  const stairs = stairsForLevel(level, start, forward);
  const exit = stairs.find((stair) => stair.direction === "forward")!;
  const context = createLevelContext({ worldId: "One", realmId: `Underground ${level}`, levelId: level, seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, start, exit });
  runLevelPasses(context, [{ id: "structured-dungeon", run: (generation) => {
    for (let y = 0; y < FLOOR_HEIGHT; y++) for (let x = 0; x < FLOOR_WIDTH; x++) if (map[y][x] === 0) generation.writeCell(x, y, { walkable: true });
    return {};
  } }, { id: "reserve-semantic-cells", run: (generation) => {
    generation.reserveCell(start.x, start.y);
    stairs.forEach((stair) => generation.reserveCell(stair.x, stair.y));
    return {};
  } }, { id: "place-dungeon-objects", run: (generation) => {
    // Placement is intentionally a later pass. Every object claims its cell
    // through one shared reservation map, so a seed cannot overlap actors,
    // chests, pickups, the start, or the exit.
    generation.reserveEntityCell(start.x, start.y);
    stairs.forEach((stair) => generation.reserveEntityCell(stair.x, stair.y));
    const candidates = shuffledWalkableCells(generation.cells, random);
    const route = new Set(structuralRoute(map, start, exit).map((cell) => `${cell.x},${cell.y}`));
    const claim = (cell: Position) => generation.occupiedCells.some((occupied) => occupied.x === cell.x && occupied.y === cell.y) || !isWalkable(generation, cell.x, cell.y) ? false : generation.reserveEntityCell(cell.x, cell.y);
    const nextCell = () => candidates.find((cell) => !route.has(`${cell.x},${cell.y}`) && claim(cell)) ?? null;
    const add = (entity: Entity) => { generation.entities.push(entity); };
    const addPickup = (kind: "health" | "mana", index: number) => {
      const cell = nextCell(); if (!cell) return;
      add({ id: `${kind}-potion-${index}`, kind: "potion", resource: kind, x: cell.x, y: cell.y });
    };
    const addCounterPickup = (kind: "key" | "gold", index: number) => {
      const cell = nextCell(); if (!cell) return;
      add({ id: `${kind}-${index}`, kind, amount: kind === "gold" ? 5 + Math.floor(random() * 16) : 1, x: cell.x, y: cell.y });
    };
    // Test mode places introductory pickups and a chest beside the level-one entrance.
    // Normal floors use the seeded random layout below.
    const nearStart = (offsets: readonly Position[]) => offsets.map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => !route.has(`${cell.x},${cell.y}`) && claim(cell));
    if (level1TestMode) {
      const testChest = nearStart([{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -2, y: 0 }]);
      const healthCell = nearStart([{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }]);
      const manaCell = nearStart([{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -1, y: 2 }]);
      const starterKey = nearStart([{ x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: 2 }]);
      const starterGold = nearStart([{ x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: -2 }]);
      if (healthCell) add({ id: "health-potion", kind: "potion", resource: "health", ...healthCell });
      if (manaCell) add({ id: "mana-potion", kind: "potion", resource: "mana", ...manaCell });
      if (starterKey) add({ id: "starter-key", kind: "key", amount: 1, ...starterKey });
      if (starterGold) add({ id: "starter-gold", kind: "gold", amount: 10, ...starterGold });
      if (testChest) add({ id: "test-chest", kind: "chest", opened: false, ...testChest });
    }
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i]; const preferred = { x: room.x + 2, y: room.y + 2 };
      const enemyCell = !route.has(`${preferred.x},${preferred.y}`) && claim(preferred) ? preferred : nextCell();
      if (enemyCell && random() < 0.76) {
        const skeleton = difficulty > 1 && random() < 0.4;
        const health = skeleton ? 20 + (difficulty - 2) * 4 : 12 + (difficulty - 1) * 3;
        const damage = skeleton ? 6 + (difficulty - 2) * 2 : 3 + (difficulty - 1) * 2;
        const enemy: Omit<Enemy, "resources"> = { id: `enemy-${i}`, kind: "enemy", x: enemyCell.x, y: enemyCell.y, hp: health, maxHp: health, damage, awareness: GAME_TUNING.enemyAwareness, actionCooldown: GAME_TUNING.enemyActionCooldown, nextActionAt: GAME_TUNING.enemyActionCooldown, name: skeleton ? "Skeleton" : "Rat", xp: GAME_TUNING.xpPerKillBase + difficulty, heading: "e" };
        add({ ...enemy, resources: enemyResources(enemy, level) });
      }
      if (random() < 0.35) {
        const chestCell = nextCell(); if (chestCell) add({ id: `chest-${i}`, kind: "chest", x: chestCell.x, y: chestCell.y, opened: false });
      }
    }
    if (level1TestMode) {
      const testEnemy = (id: string, name: "Rat" | "Skeleton", offsets: readonly Position[]) => {
        const cell = nearStart(offsets); if (!cell) return;
        const skeleton = name === "Skeleton"; const health = skeleton ? 20 : 12; const damage = skeleton ? 6 : 3;
        const enemy: Omit<Enemy, "resources"> = { id, kind: "enemy", x: cell.x, y: cell.y, hp: health, maxHp: health, damage, awareness: GAME_TUNING.enemyAwareness, actionCooldown: GAME_TUNING.enemyActionCooldown, nextActionAt: GAME_TUNING.enemyActionCooldown, name, xp: GAME_TUNING.xpPerKillBase + difficulty, heading: "e" };
        add({ ...enemy, resources: enemyResources(enemy, level) });
      };
      testEnemy("test-rat", "Rat", [{ x: -1, y: 0 }, { x: -1, y: -1 }]);
      testEnemy("test-skeleton", "Skeleton", [{ x: 0, y: -1 }, { x: 1, y: -1 }]);
    }
    // Pickup counts are area-scaled from the visible 1x landscape screen and
    // use seeded stochastic rounding. Object cells and pickup cells share the
    // same reservation set, so density never creates overlaps.
    const densities = options.pickupDensity ?? {};
    const density = (kind: keyof typeof PICKUP_DENSITY_DEFAULTS) => ({ ...PICKUP_DENSITY_DEFAULTS[kind], ...(densities[kind] ?? {}) });
    const healthCount = Math.max(1, stochasticCount(random, FLOOR_WIDTH * FLOOR_HEIGHT, density("health")));
    const manaCount = Math.max(1, stochasticCount(random, FLOOR_WIDTH * FLOOR_HEIGHT, density("mana")));
    const keyCount = stochasticCount(random, FLOOR_WIDTH * FLOOR_HEIGHT, density("key"));
    const goldCount = stochasticCount(random, FLOOR_WIDTH * FLOOR_HEIGHT, density("gold"));
    for (let index = 1; index < healthCount; index++) addPickup("health", index + 1);
    for (let index = 1; index < manaCount; index++) addPickup("mana", index + 1);
    for (let index = 0; index < keyCount; index++) addCounterPickup("key", index + 1);
    for (let index = 0; index < goldCount; index++) addCounterPickup("gold", index + 1);
    stairs.forEach(add);
    return {};
  } }]);
  const torchCells = shuffledWallDecorationCells(map, random);
  const trapCells = shuffledWalkableCells(context.cells, random).filter((cell) => !context.occupiedCells.some((occupied) => occupied.x === cell.x && occupied.y === cell.y));
  const entranceTrap = level1TestMode ? [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -2, y: 1 }].map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => isWalkable(context, cell.x, cell.y) && !context.occupiedCells.some((occupied) => occupied.x === cell.x && occupied.y === cell.y)) : null;
  const torchCount = Math.max(3, Math.floor(context.cells.flat().filter((cell) => cell.walkable).length / 180));
  const trapCount = Math.max(2, Math.floor(context.cells.flat().filter((cell) => cell.walkable).length / 280));
  const placedTrapCells = entranceTrap ? [entranceTrap, ...trapCells.filter((cell) => cell.x !== entranceTrap.x || cell.y !== entranceTrap.y)].slice(0, trapCount + 1) : trapCells.slice(0, trapCount);
  const decorations: WorldDecoration[] = [
    ...torchCells.slice(0, torchCount).map((cell, index) => ({ id: `wall-torch-${index + 1}`, kind: "torch" as const, wallMounted: true, ...cell })),
    ...placedTrapCells.map((cell, index) => ({ id: `floor-trap-${index + 1}`, kind: "trap" as const, wallMounted: false, ...cell })),
  ];
  const floor: Floor = { seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells: context.cells, start, entities: context.entities, decorations, time: 0, level, generatorVersion: GENERATOR_VERSION, generation: { ...context.generation, passes: context.passes } };
  return ensureSemanticCells(floor);
}

export function effectiveAttributes(campaign: Campaign, equipment: Equipment = campaign.player.equipment): Attributes {
  const base = campaign.progression.attributes; const mods = Object.values(equipment).flat().filter((item): item is Item => item !== null).reduce<Partial<Attributes>>((all, item) => {
    for (const [key, value] of Object.entries(item.modifiers ?? {}) as [AttributeName, number][]) all[key] = (all[key] ?? 0) + value;
    return all;
  }, {});
  const vitality = statRank(base, "vitality"); const strength = statRank(base, "strength");
  return {
    health: Math.max(1, Number(base.health ?? GAME_TUNING.startingHealth) + vitality * GAME_TUNING.vitalityHealthBonus + Number(mods.health ?? 0)),
    stamina: Math.max(0, Number(base.stamina ?? GAME_TUNING.startingStamina) + Number(mods.stamina ?? 0)),
    offense: Math.max(0, Number(base.offense ?? 0) + strength * GAME_TUNING.strengthOffenseBonus + Number(mods.offense ?? 0)),
    defense: Math.max(0, Number(base.defense ?? GAME_TUNING.innateDefense) + Number(mods.defense ?? 0)),
    mana: Math.max(0, Number(base.mana ?? GAME_TUNING.startingMana) + Number(mods.mana ?? 0)),
    vitality, strength, luck: statRank(base, "luck"), recovery: statRank(base, "recovery"), stealth: statRank(base, "stealth"),
  };
}

export function resourceState(campaign: Campaign) {
  return playerResourcesFromCampaign(campaign);
}

export function createCampaign(seed = seedNow(), difficulty = 1, level = 1, options: { level1TestMode?: boolean } = {}): Campaign {
  const floor = generateFloor(level, seed, difficulty, options); const attributes = { health: GAME_TUNING.startingHealth, stamina: GAME_TUNING.startingStamina, offense: 0, defense: GAME_TUNING.innateDefense, mana: GAME_TUNING.startingMana, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 };
  const campaign: Campaign = { version: 3, world: "One", realm: `Underground ${floor.level}`, floor, floors: { [floor.level]: structuredClone(floor) }, progression: { attributes, level: 1, xp: 0, nextXp: GAME_TUNING.xpThreshold, totalKills: 0, difficulty, pendingUpgrades: [] }, player: { x: floor.start.x, y: floor.start.y, heading: "e", resources: createResourcesModel(), equipment: { weapons: [itemInstance(itemCatalog[3], "starter-stick"), null], armor: [null, null] }, inventory: [consumableInstance("health", "starter-health-potion"), consumableInstance("mana", "starter-mana-potion", 2)], inventoryCapacity: ITEM_CAPACITY, abilities: ["heal", "wand", null], quickSlots: [null, null], sneaking: false }, starterConsumablesSeeded: true, counters: { keys: 1, gold: 55 }, objective: "Find the exit", quest: { id: "my-first-quest", title: "My First Quest", items: [{ id: "walk-through-stairs", title: "Walk through the stairs", complete: false }, { id: "collect-health-potion", title: "Collect a Health Potion", complete: false }, { id: "collect-coin", title: "Collect a coin", complete: false }], activeItemId: "walk-through-stairs" }, log: [] };
  campaign.player.resources = playerResourcesFromCampaign(campaign, { health: GAME_TUNING.startingHealth, stamina: GAME_TUNING.startingStamina, mana: GAME_TUNING.startingMana });
  return campaign;
}

const blobFrames = Object.freeze([3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
export function wallFrameAt(floor: Floor, x: number, y: number) { const wall = (tx: number, ty: number) => !isWalkable(floor, tx, ty); const mask = Number(wall(x, y - 1)) | (Number(wall(x + 1, y)) << 1) | (Number(wall(x, y + 1)) << 2) | (Number(wall(x - 1, y)) << 3); return blobFrames[mask]; }

function tick(state: Campaign, events: GameEvent[]) { const previous = state.floor.time; state.floor.time++; emit(events, "time.advanced", { previous, current: state.floor.time }, state); enemyPhase(state, events); }
function normalizeResources(state: Campaign, events: GameEvent[], cause: string, previousCaps: Attributes) { const caps = effectiveAttributes(state); for (const key of ["health", "stamina", "mana"] as const) { const prior = state.player.resources[key].current; const oldMax = previousCaps[key]; const ratio = oldMax > 0 ? prior / oldMax : 0; const next = Math.max(0, Math.min(caps[key], ratio * caps[key])); state.player.resources[key] = { current: next, currentMax: caps[key] }; if (prior !== next) emit(events, "resource.changed", { resource: key, previous: prior, current: next, previousMax: oldMax, currentMax: caps[key], cause }, state); } state.player.resources = playerResourcesFromCampaign(state, state.player.resources); }
function changeResource(state: Campaign, events: GameEvent[], key: "health" | "stamina" | "mana", value: number, cause: string) { const cap = effectiveAttributes(state)[key]; const previous = state.player.resources[key].current; const current = Math.max(0, Math.min(cap, value)); state.player.resources[key] = { current, currentMax: cap }; state.player.resources = playerResourcesFromCampaign(state, state.player.resources); if (current !== previous) emit(events, "resource.changed", { resource: key, previous, current, currentMax: cap, cause, ...(key === "health" ? { position: { x: state.player.x, y: state.player.y } } : {}) }, state); }
function applyTrapOnEntry(state: Campaign, events: GameEvent[], elapsedMs: number) {
  const trap = state.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === state.player.x && decoration.y === state.player.y);
  if (!trap || !trapIsDangerous(trapFrameAt(elapsedMs))) return;
  const damage = trapStrikeDamage(resourceState(state).defense.current);
  changeResource(state, events, "health", state.player.resources.health.current - damage, "trap");
}
function gainXp(state: Campaign, events: GameEvent[], amount: number, cause: string) {
  const previous = state.progression.xp; state.progression.xp += amount;
  emit(events, "xp.gained", { amount, cause, previous, current: state.progression.xp }, state);
  state.progression.pendingUpgrades ??= [];
  while (state.progression.xp >= state.progression.nextXp) {
    state.progression.xp -= state.progression.nextXp; state.progression.level++;
    const options = [...levelUpOptions(state.progression.level)];
    state.progression.pendingUpgrades.push({ level: state.progression.level, options });
    emit(events, "xp.level.changed", { level: state.progression.level, current: state.progression.xp, threshold: state.progression.nextXp }, state);
    emit(events, "progression.upgrade.offered", { level: state.progression.level, options }, state);
  }
  state.player.resources = playerResourcesFromCampaign(state, state.player.resources);
}
function integerDamage(amount: number) { return Math.max(0, Math.round(amount)); }
function enemyPhase(state: Campaign, events: GameEvent[]) {
  const player = state.player; const defense = resourceState(state).defense.current;
  for (const enemy of state.floor.entities.filter((entity) => entity.kind === "enemy")) {
    const distance = Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y));
    if (distance > effectiveAwareness(state, enemy) || state.floor.time < enemy.nextActionAt) continue;
    enemy.nextActionAt = state.floor.time + enemy.actionCooldown;
    const dx = Math.sign(player.x - enemy.x); const dy = Math.sign(player.y - enemy.y);
    if (distance <= 1) {
      const damage = Math.max(1, integerDamage(enemy.resources.offense.current - defense));
      changeResource(state, events, "health", player.resources.health.current - damage, "enemy-attack");
    } else {
      const tx = enemy.x + dx; const ty = enemy.y + dy;
      if (isWalkable(state.floor, tx, ty) && !entityAt(state.floor.entities.filter((entry) => entry !== enemy), tx, ty)) { enemy.heading = headingFromMovement(dx, dy, enemy.heading ?? "e"); enemy.x = tx; enemy.y = ty; }
    }
  }
  if (state.player.resources.health.current <= 0) { const reset = freshRunAfterDeath(state); Object.assign(state, reset); emit(events, "player.died", { realm: "Underground 1" }, state); }
}
function freshRunAfterDeath(state: Campaign) { const difficulty = state.progression.difficulty ?? state.floor.level ?? state.floor.depth ?? 1; const campaign = createCampaign(seedNow(), difficulty, 1); campaign.progression = structuredClone(state.progression); campaign.progression.difficulty = difficulty; campaign.player.abilities = state.player.abilities.slice(0, 3); campaign.player.resources = playerResourcesFromCampaign(campaign, campaign.player.resources); return campaign; }
function orderedInventory(inventory: Item[]) { return [...inventory].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
function attack(state: Campaign, events: GameEvent[], enemy: Enemy) { const offense = Math.max(1, integerDamage(resourceState(state).offense.current)); const health = enemy.resources.health; const before = health.current; health.current = Math.max(0, health.current - offense); enemy.hp = health.current; emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage: offense, previousHealth: before, currentHealth: health.current }, state); changeResource(state, events, "stamina", state.player.resources.stamina.current - ATTACK_STAMINA_COST, "attack"); gainXp(state, events, GAME_TUNING.xpPerAttack, "attack"); if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== enemy.id); state.progression.totalKills++; gainXp(state, events, enemy.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: enemy.name, xp: enemy.resources.xp.current }, state); } }

export function applyAction(campaign: Campaign, action: Action): ActionResult {
  const state = upgradeCampaignResources(structuredClone(campaign)); const events: GameEvent[] = []; const reject = (reason: string, facts: EventFacts = {}, type = "action.rejected"): ActionResult => ({ state: campaign, events: [{ type, facts: { reason, ...facts }, gameTime: campaign.floor.time, sequence: 1 }], accepted: false, ticks: 0 });
  const pendingUpgrade = state.progression.pendingUpgrades?.[0];
  if (pendingUpgrade && action.type !== "choose-upgrade") return reject("level-up-pending");
  if (action.type === "choose-upgrade") {
    const stat = action.stat;
    if (!pendingUpgrade?.options.includes(stat)) return reject("invalid-upgrade-choice");
    const previousCaps = effectiveAttributes(state); const previous = state.progression.attributes[stat] ?? 0;
    state.progression.attributes[stat] = previous + 1; state.progression.pendingUpgrades.shift();
    normalizeResources(state, events, "level-up", previousCaps);
    emit(events, "progression.upgrade.chosen", { level: pendingUpgrade.level, stat, previous, current: previous + 1 }, state);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "toggle-sneak") { state.player.sneaking = !state.player.sneaking; emit(events, "player.sneak.changed", { active: state.player.sneaking }, state); return { state, events, accepted: true, ticks: 0 }; }
  if (action.type === "wait") { tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "move") {
    const direction = directions[action.direction as Direction]; if (!direction) return reject("invalid-direction"); const [dx, dy] = direction; const x = state.player.x + dx; const y = state.player.y + dy; const entity = entityAt(state.floor.entities, x, y);
    if (!isWalkable(state.floor, x, y) && !entity) return reject("blocked");
    if (entity?.kind === "enemy") attack(state, events, entity); else {
      state.player.heading = action.direction as Direction;
      state.player.x = x; state.player.y = y; emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      applyTrapOnEntry(state, events, Number.isFinite(action.hazardElapsedMs) ? action.hazardElapsedMs! : state.floor.time * TRAP_FRAME_DURATION_MS);
      if (entity?.kind === "stairs") {
        const currentLevel = state.floor.level ?? state.floor.depth ?? 1;
        const level = entity.direction === "back" ? Math.max(1, currentLevel - 1) : currentLevel + 1;
        const time = state.floor.time;
        state.floors ??= {};
        state.floors[String(currentLevel)] = structuredClone(state.floor);
        const stored = state.floors[String(level)];
        const difficulty = Math.max(state.progression.difficulty ?? 1, level);
        state.progression.difficulty = difficulty;
        state.floor = stored ? structuredClone(stored) : generateFloor(level, seedNow(), difficulty);
        state.floor.time = time;
        state.floors[String(level)] = structuredClone(state.floor);
        state.realm = `Underground ${level}`;
        const entrance = entrancePosition(state.floor);
        state.player.x = entrance.x; state.player.y = entrance.y;
        emit(events, "realm.entered", { realm: state.realm, level }, state);
      }
      else if (entity?.kind === "potion") { const item = consumableInstance(entity.resource, entity.id); const quickIndex = state.player.quickSlots!.findIndex((slot) => slot?.item.consumableResource === entity.resource); const inventoryItem = state.player.inventory.find((entry) => isQuickSlottableItem(entry) && entry.consumableResource === entity.resource); if (quickIndex >= 0) { state.player.quickSlots![quickIndex]!.quantity += 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { inventoryItem.quantity = (inventoryItem.quantity ?? 1) + 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (state.player.inventory.length < state.player.inventoryCapacity) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: 1 }, state); } else emit(events, "item.collection.rejected", { itemId: entity.id, name: entity.name ?? `${entity.resource} potion`, resource: entity.resource, reason: "inventory-full" }, state); }
      else if (entity?.kind === "item") { const item = normalizeItem(entity.item); const quickIndex = isQuickSlottableItem(item) ? state.player.quickSlots!.findIndex((slot) => slot?.item.consumableResource === item.consumableResource) : -1; const inventoryItem = isQuickSlottableItem(item) ? state.player.inventory.find((entry) => isQuickSlottableItem(entry) && entry.consumableResource === item.consumableResource) : null; if (quickIndex >= 0) { state.player.quickSlots![quickIndex]!.quantity += item.quantity ?? 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { inventoryItem.quantity = (inventoryItem.quantity ?? 1) + (item.quantity ?? 1); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (state.player.inventory.length < state.player.inventoryCapacity) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: item.quantity ?? 1 }, state); } else emit(events, "item.collection.rejected", { itemId: item.id, name: item.name, reason: "inventory-full" }, state); }
      else if (entity?.kind === "key" || entity?.kind === "gold") {
        const amount = entity.amount ?? 1;
        if (entity.kind === "key") state.counters.keys += amount; else state.counters.gold += amount;
        state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id);
        emit(events, "item.collected", { itemId: entity.id, name: entity.kind === "key" ? "Key" : "Gold", amount, destination: entity.kind }, state);
      }
      else if (entity?.kind === "chest" && !entity.opened) { entity.opened = true; const item = itemInstance(itemCatalog[(state.floor.time + lootTier(state)) % itemCatalog.length], `chest-item-${state.floor.time}`); Object.assign(entity, { kind: "item", item }); delete entity.opened; emit(events, "chest.opened", { item: item.name, lootTier: lootTier(state) }, state); }
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    }
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "ability") { if (!Number.isInteger(action.index) || action.index < 0 || action.index >= 3) return reject("invalid-ability-slot"); const abilityId = state.player.abilities[action.index]; const ability = abilityId ? abilityCatalog[abilityId] : null; if (!ability) return reject("empty-ability"); if (state.player.resources.mana.current < ability.manaCost) return reject("insufficient-mana"); const enemy = ability.kind === "wand" ? [...state.floor.entities.filter((entry): entry is Enemy => entry.kind === "enemy" && Math.abs(entry.x - state.player.x) + Math.abs(entry.y - state.player.y) <= ability.range)].sort((a, b) => Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) - Math.abs(b.x - state.player.x) - Math.abs(b.y - state.player.y) || a.id.localeCompare(b.id))[0] : null; if (ability.kind === "wand" && !enemy) return reject("no-valid-target"); changeResource(state, events, "mana", state.player.resources.mana.current - ability.manaCost, "ability"); emit(events, "ability.used", { id: ability.id, abilityId: ability.id, title: ability.title, manaCost: ability.manaCost, target: ability.target, targetId: enemy?.id, position: { x: state.player.x, y: state.player.y } }, state); return { state, events, accepted: true, ticks: 0 }; }
  if (action.type === "resolve-ability") { const ability = abilityCatalog[action.abilityId]; if (!ability) return reject("unknown-ability"); if (ability.kind === "heal") changeResource(state, events, "health", state.player.resources.health.current + ability.amount, "heal"); else { const target = state.floor.entities.find((entry): entry is Enemy => entry.kind === "enemy" && entry.id === action.targetId); if (target) { const health = target.resources.health; const damage = integerDamage(ability.damage); const previousHealth = health.current; health.current = Math.max(0, health.current - damage); target.hp = health.current; emit(events, "combat.hit", { target: target.name, targetId: target.id, targetPosition: { x: target.x, y: target.y }, damage, previousHealth, currentHealth: health.current, source: ability.id }, state); if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== target.id); gainXp(state, events, target.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: target.name, xp: target.resources.xp.current }, state); } } } tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "assign-ability") { const { from, to } = action; if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < 3) || from === to) return reject("invalid-ability-slot"); [state.player.abilities[from], state.player.abilities[to]] = [state.player.abilities[to], state.player.abilities[from]]; emit(events, "ability.assignment.changed", { from, to }, state); tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "assign-quick-slot") {
    const { index } = action; const slots = state.player.quickSlots!;
    if (!Number.isInteger(index) || index < 0 || index > 1) return reject("invalid-quick-slot");
    const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex];
    if (!item || !isQuickSlottableItem(item)) return reject("incompatible-quick-slot-item");
    const existing = slots[index];
    if (existing && existing.item.consumableResource !== item.consumableResource) return reject("different-quick-slot-item");
    const otherIndex = slots.findIndex((slot, slotIndex) => slotIndex !== index && slot?.item.consumableResource === item.consumableResource);
    if (otherIndex >= 0) return reject("already-quick-slotted");
    const quantity = item.quantity ?? 1;
    state.player.inventory.splice(itemIndex, 1);
    slots[index] = existing ? { item: existing.item, quantity: existing.quantity + quantity } : { item, quantity };
    emit(events, "quick-slot.changed", { action: existing ? "combined" : "assigned", itemId: item.id, item: item.name, source: "inventory", destination: { quickSlot: index }, quickSlot: index, quantity: slots[index]!.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "move-quick-slot") {
    const { from, to } = action; const slots = state.player.quickSlots!;
    if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < 2) || from === to) return reject("invalid-quick-slot");
    const source = slots[from]; const target = slots[to];
    if (!source) return reject("empty-quick-slot");
    if (target && target.item.consumableResource !== source.item.consumableResource) return reject("different-quick-slot-item");
    slots[to] = target ? { item: target.item, quantity: target.quantity + source.quantity } : source;
    slots[from] = null;
    emit(events, "quick-slot.changed", { action: target ? "combined" : "moved", itemId: source.item.id, item: source.item.name, source: { quickSlot: from }, destination: { quickSlot: to }, quickSlot: to, quantity: slots[to]!.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "return-quick-slot") {
    const { index } = action; const slots = state.player.quickSlots!; const slot = slots[index];
    if (!Number.isInteger(index) || index < 0 || index > 1 || !slot) return reject("empty-quick-slot");
    const existing = state.player.inventory.find((item) => isQuickSlottableItem(item) && item.consumableResource === slot.item.consumableResource);
    if (!existing && state.player.inventory.length >= state.player.inventoryCapacity) return reject("inventory-full");
    if (existing) existing.quantity = (existing.quantity ?? 1) + slot.quantity;
    else state.player.inventory = orderedInventory([...state.player.inventory, { ...structuredClone(slot.item), quantity: slot.quantity }]);
    slots[index] = null;
    emit(events, "quick-slot.changed", { action: "returned", itemId: slot.item.id, item: slot.item.name, source: { quickSlot: index }, destination: "inventory", quickSlot: index, quantity: slot.quantity }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "use-quick-slot") {
    const { index } = action; const slot = state.player.quickSlots![index];
    if (!Number.isInteger(index) || index < 0 || index > 1 || !slot) return { state: campaign, events: [], accepted: false, ticks: 0 };
    const resource = slot.item.consumableResource!; const maximum = effectiveAttributes(state)[resource]; const current = state.player.resources[resource].current;
    if (current >= maximum) return reject("resource-full", { itemId: slot.item.id, item: slot.item.name, resource, current, currentMax: maximum, quickSlot: index }, "quick-slot.use.rejected");
    const previous = current; const restored = resource === "health" ? GAME_TUNING.healthPotionRestore : GAME_TUNING.manaPotionRestore;
    changeResource(state, events, resource, current + restored, "quick-slot");
    slot.quantity -= 1; if (slot.quantity <= 0) state.player.quickSlots![index] = null;
    emit(events, "potion.consumed", { itemId: slot.item.id, item: slot.item.name, resource, previous, current: state.player.resources[resource].current, quickSlot: index, quantity: Math.max(0, slot.quantity) }, state);
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "equip" || action.type === "unequip" || action.type === "reorder-equipment") { const { group, index } = action; if (!state.player.equipment[group] || !Number.isInteger(index) || index < 0 || index > 1) return reject("invalid-slot"); const previousCaps = effectiveAttributes(state);
    if (action.type === "equip") { const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex]; if (!item || item.category === "consumable" || item.group !== group || state.player.equipment[group][index]) return reject("invalid-equipment-drop"); state.player.inventory.splice(itemIndex, 1); state.player.equipment[group][index] = item; emit(events, "equipment.changed", { action: "enabled", itemId: item.id, item: item.name, source: "inventory", destination: { group, index }, group, index }, state); }
    else if (action.type === "unequip") { const item = state.player.equipment[group][index]; if (!item || state.player.inventory.length >= state.player.inventoryCapacity) return reject("cannot-unequip"); state.player.equipment[group][index] = null; state.player.inventory = orderedInventory([...state.player.inventory, item]); emit(events, "equipment.changed", { action: "returned to inventory", itemId: item.id, item: item.name, source: { group, index }, destination: "inventory", group, index }, state); }
    else { const other = action.other; if (!Number.isInteger(other) || other < 0 || other > 1 || other === index) return reject("invalid-equipment-slot"); [state.player.equipment[group][index], state.player.equipment[group][other]] = [state.player.equipment[group][other], state.player.equipment[group][index]]; emit(events, "equipment.changed", { action: "reordered", group, index, other, source: { group, index }, destination: { group, index: other } }, state); }
    normalizeResources(state, events, "equipment", previousCaps); tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  return reject("unknown-action");
}

export function resolveTurn(state: Campaign, direction: string) { return applyAction(state, { type: "move", direction }).state; }
export function previewEquipment(campaign: Campaign, item: Item, group: EquipmentGroup, index: number, mode = "equip") { const projected = structuredClone(campaign); if (mode === "equip" && projected.player.equipment[group]?.[index] === null) projected.player.equipment[group][index] = item; if (mode === "unequip") projected.player.equipment[group][index] = null; return effectiveAttributes(projected); }
export function createGameSession(initial: Campaign, { onCommit }: { onCommit?: (result: ActionResult) => void } = {}) {
  let state = initial; let transactionSequence = 0; let eventSequence = 0; let dispatching = false;
  const listeners = new Set<(result: ActionResult) => void>(); const queue: { action: Action; result: ActionResult | null }[] = [];
  const session = {
    getState: () => state,
    subscribe(listener: (result: ActionResult) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    publish(type: string, facts: EventFacts = {}) {
      const event: GameEvent = { type, facts, eventId: `event-${++eventSequence}`, transactionId: null, gameTime: state.floor.time, sequence: 1, outcome: "system" };
      const result = { state, events: [event], accepted: false, ticks: 0, system: true };
      for (const listener of [...listeners]) listener(result);
      state = result.state;
      return event;
    },
    dispatch(action: Action): ActionResult | { queued: true; accepted: false; ticks: number; events: GameEvent[] } | null {
      const request: { action: Action; result: ActionResult | null } = { action, result: null }; queue.push(request);
      if (dispatching) return { queued: true, accepted: false, ticks: 0, events: [] };
      dispatching = true;
      try {
        while (queue.length) {
          const current = queue.shift()!; const result = applyAction(state, current.action);
          result.transactionId = `tx-${++transactionSequence}`;
          result.events = result.events.map((event, index) => ({ ...event, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, sequence: index + 1, outcome: result.accepted ? "committed" : "rejected" }));
          if (result.accepted) {
            const committed: GameEvent = { type: "action.committed", facts: { transactionId: result.transactionId, actionType: current.action.type, ticks: result.ticks }, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, gameTime: result.state.floor.time, sequence: result.events.length + 1, outcome: "committed" };
            result.events.push(committed); state = result.state;
          }
          current.result = result;
          for (const listener of [...listeners]) listener(result);
          if (result.accepted) { state = result.state; onCommit?.(result); }
        }
      } finally { dispatching = false; }
      return request.result;
    },
  };
  return session;
}
