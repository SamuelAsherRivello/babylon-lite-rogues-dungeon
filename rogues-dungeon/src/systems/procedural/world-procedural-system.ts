import type { Action, ActionResult, Attributes, AttributeName, Campaign, ConsumableResource, Direction, Enemy, Entity, Equipment, EquipmentGroup, EventFacts, Floor, FloorTriggerDoorBarrelSet, GameEvent, Item, LevelStateDelta, MassBearingPosition, ObjectSet, ObjectSetRegionRole, Position, QuickSlot, Resource, ResourceInput, ResourceName, Resources, Room, WorldDecoration } from "../../game/types.ts";
import { createLevelContext, ensureSemanticCells, isWalkable, runLevelPasses } from "./level-grid-system.ts";
import { isWallDecorationCell, TRAP_FRAME_DURATION_MS, trapFrameAt, trapIsDangerous, trapStrikeDamage } from "./world-hazards-system.ts";
import { worldFloorSeed } from "./world-seed-system.ts";
import { planEnemyActions } from "../../game/enemy-ai-system.ts";

export const FLOOR_WIDTH = 100;
export const FLOOR_HEIGHT = 100;
export const FLOOR_CENTER = Object.freeze({ x: Math.floor(FLOOR_WIDTH / 2), y: Math.floor(FLOOR_HEIGHT / 2) });
export const GENERATOR_VERSION = "rogues-dungeon-floor-v4";
const ITEM_CAPACITY = 10;
export const VISIBLE_LANDSCAPE_SCREEN = Object.freeze({ width: 30, height: 17 });
export const PICKUP_DENSITY_DEFAULTS = Object.freeze({
  key: Object.freeze({ min: 0.5, max: 1 }),
  mana: Object.freeze({ min: 0.75, max: 1.5 }),
  health: Object.freeze({ min: 1, max: 1.75 }),
  gold: Object.freeze({ min: 1.25, max: 2 }),
});
export const GAME_TUNING = Object.freeze({
  startingHealth: 3, startingStamina: 3, startingMana: 3, innateDefense: 1,
  attackStaminaCost: 4, moveStaminaRecovery: 2, readinessFloor: 0.75,
  healthPotionRestore: 10, manaPotionRestore: 8,
  xpPerAttack: 5, xpPerKillBase: 10, xpPerContainer: 10, xpPerDiscovery: 5, xpPerFloor: 20, xpThreshold: 100,
  enemyAwareness: 6, enemyActionCooldown: 2, sneakingAwarenessReduction: 3,
  vitalityHealthBonus: 3, strengthOffenseBonus: 1, recoveryMoveBonus: 1,
  luckTierRanks: 2, stealthAwarenessRanks: 2,
});
export const STAIRS_MAX_DISTANCE_FROM_START = 10;

const objectSetRoles: readonly ObjectSetRegionRole[] = ["optional-reward", "exit"];

function samePosition(left: Position, right: Position) { return left.x === right.x && left.y === right.y; }
function validPosition(value: unknown): value is Position { return typeof value === "object" && value !== null && Number.isInteger((value as Position).x) && Number.isInteger((value as Position).y); }
export function normalizeObjectSets(floor: Floor) {
  const raw = Array.isArray(floor.objectSets) ? floor.objectSets : [];
  floor.objectSets = raw.filter((set): set is FloorTriggerDoorBarrelSet => set?.kind === "floor-trigger-door-barrel" && typeof set.id === "string" && validPosition(set.barrel) && validPosition(set.trigger) && validPosition(set.door) && objectSetRoles.includes(set.regionRole))
    .map((set) => ({ ...set, barrel: { ...set.barrel, hasMass: set.barrel.hasMass !== false }, barrelStart: validPosition(set.barrelStart) ? { ...set.barrelStart } : { ...set.barrel }, barrelReturnUsed: Boolean(set.barrelReturnUsed), trigger: { ...set.trigger }, door: { ...set.door } }));
  return floor;
}
function hasMassAt(position: Position, object: MassBearingPosition, defaultHasMass = false) { return (object.hasMass ?? defaultHasMass) === true && samePosition(position, object); }
export function isObjectSetDoorOpen(set: FloorTriggerDoorBarrelSet, player: MassBearingPosition, entities: Entity[] = []) {
  return hasMassAt(set.trigger, player) || hasMassAt(set.trigger, set.barrel, true) || entities.some((entity) => hasMassAt(set.trigger, entity));
}
function emitFloorTriggerChanges(events: GameEvent[], previous: Campaign, current: Campaign) {
  const previousSets = new Map(floorTriggerDoorSets(previous.floor).map((set) => [set.id, set]));
  for (const set of floorTriggerDoorSets(current.floor)) {
    const previousSet = previousSets.get(set.id);
    if (!previousSet) continue;
    const wasActive = isObjectSetDoorOpen(previousSet, previous.player, previous.floor.entities);
    const active = isObjectSetDoorOpen(set, current.player, current.floor.entities);
    if (active !== wasActive) emit(events, "floor-trigger.changed", { id: set.id, active }, current);
  }
}
export function floorTriggerDoorSets(floor: Floor) { return (floor.objectSets ?? []).filter((set): set is FloorTriggerDoorBarrelSet => set.kind === "floor-trigger-door-barrel"); }
function barrelSetAt(floor: Floor, x: number, y: number) { return floorTriggerDoorSets(floor).find((set) => set.barrel.x === x && set.barrel.y === y); }
export function isBarrelAdjacentToWall(floor: Parameters<typeof isWalkable>[0], barrel: Position) { return [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) => !isWalkable(floor, barrel.x + dx, barrel.y + dy)); }
export function isObjectSetBlocked(floor: Floor, player: MassBearingPosition, x: number, y: number) {
  return floorTriggerDoorSets(floor).some((set) => samePosition(set.barrel, { x, y }) || (samePosition(set.door, { x, y }) && !isObjectSetDoorOpen(set, player, floor.entities)));
}

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
export const EVENT_TYPES = Object.freeze(["action.committed", "action.rejected", "time.advanced", "player.moved", "player.sneak.changed", "combat.hit", "enemy.defeated", "resource.changed", "item.collected", "item.collection.rejected", "potion.consumed", "quick-slot.changed", "quick-slot.use.rejected", "chest.opened", "crate.bumped", "crate.opened", "equipment.changed", "ability.used", "ability.assignment.changed", "barrel.pushed", "floor-trigger.changed", "xp.gained", "xp.level.changed", "progression.points.spent", "realm.entered", "player.died", "campaign.save.succeeded", "campaign.save.failed"]);
export const progressionStatNames: readonly AttributeName[] = Object.freeze(["health", "stamina", "offense", "defense", "mana", "vitality", "strength", "luck", "recovery", "stealth"]);
export const attributeLabels = Object.freeze({ health: "Health", stamina: "Stamina", offense: "Offense", defense: "Defense", mana: "Mana", vitality: "Vitality", strength: "Strength", luck: "Luck", recovery: "Recovery", stealth: "Stealth" });
export const statLabels = attributeLabels;
export const abilityCatalog = Object.freeze({
  heal: Object.freeze({ id: "heal", title: "Heal", icon: "✦", manaCost: 5, kind: "heal", amount: 8, target: "self", isStackable: false }),
  wand: Object.freeze({ id: "wand", title: "Wand", icon: "✹", manaCost: 4, kind: "wand", damage: 7, target: "nearest-enemy", range: 8, isStackable: false }),
});
export const itemCatalog: readonly Omit<Item, "id">[] = Object.freeze([
  { name: "Dagger (Magic)", group: "weapons", modifiers: { offense: 3, mana: 2 }, hitChance: 94, critChance: 4, perks: ["Reliable"], isStackable: false },
  { name: "Sword", group: "weapons", modifiers: { offense: 6 }, hitChance: 76, critChance: 20, perks: ["High CRIT"], isStackable: false },
  { name: "Two-Handed Sword", group: "weapons", slotSpan: 2, modifiers: { offense: 15, defense: 2 }, hitChance: 90, critChance: 8, perks: ["Automatic parry"], isStackable: false },
  { name: "Leg Armor (Magic)", group: "armor", modifiers: { defense: 2, mana: 2 }, perks: ["Mana boost"], isStackable: false },
  { name: "Chest Armor", group: "armor", modifiers: { offense: 1, defense: 5 }, perks: ["Balanced"], isStackable: false },
  { name: "Suit of Armor", group: "armor", slotSpan: 2, modifiers: { offense: 2, defense: 12 }, perks: ["Heavy protection"], isStackable: false },
  { name: "Oak Shield 03", group: "weapons", modifiers: { defense: 3 }, perks: ["Shield"], isStackable: false },
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
  const normalizeGroup = (raw: (Item | null)[]) => {
    const slots = raw.slice(0, 2).map((item) => item ? normalizeEquipmentItem(item) : null);
    while (slots.length < 2) slots.push(null);
    for (const item of uniqueItems(slots)) if (item.slotSpan === 2) { slots[0] = item; slots[1] = item; }
    return slots;
  };
  campaign.player.equipment = { weapons: normalizeGroup(campaign.player.equipment.weapons), armor: normalizeGroup(campaign.player.equipment.armor) };
  return campaign;
}
function entityAt(entities: Entity[], x: number, y: number) { return entities.find((entity) => entity.x === x && entity.y === y); }
function isAvailableEntranceCell(floor: Floor, position: Position) {
  return isWalkable(floor, position.x, position.y)
    && !entityAt(floor.entities, position.x, position.y)
    && !isObjectSetBlocked(floor, position, position.x, position.y);
}
export function entrancePosition(floor: Floor): Position {
  const returnStair = floor.entities.find((entity) => entity.kind === "stairs" && entity.direction === "back");
  const preferred = returnStair ? { x: returnStair.x + 1, y: returnStair.y } : { ...floor.start };
  if (isAvailableEntranceCell(floor, preferred)) return preferred;
  for (let distance = 1; distance <= floor.width + floor.height; distance++) {
    for (let dx = -distance; dx <= distance; dx++) {
      const dy = distance - Math.abs(dx);
      for (const yOffset of dy === 0 ? [0] : [-dy, dy]) {
        const candidate = { x: preferred.x + dx, y: preferred.y + yOffset };
        if (isAvailableEntranceCell(floor, candidate)) return candidate;
      }
    }
  }
  throw new Error("The destination floor has no available entrance grid spot.");
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

function isSolidObjectPlacementCell(cells: ReturnType<typeof createLevelContext>["cells"], cell: Position) {
  const walkable = (x: number, y: number) => Boolean(cells[y]?.[x]?.walkable);
  return (walkable(cell.x, cell.y - 1) || walkable(cell.x, cell.y + 1))
    && (walkable(cell.x - 1, cell.y) || walkable(cell.x + 1, cell.y));
}

// Any object that blocks movement may use an alcove, but it must not split a
// route between its neighbouring floor cells. Existing blocking objects count
// as walls, so a later placement cannot complete a blockage that an earlier
// placement left open.
export function isNonBlockingObjectPlacementCell(cells: ReturnType<typeof createLevelContext>["cells"], cell: Position, blockingCells: readonly Position[] = []) {
  const blocked = new Set(blockingCells.map(({ x, y }) => `${x},${y}`));
  blocked.add(`${cell.x},${cell.y}`);
  const neighbours = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy }))
    .filter(({ x, y }) => Boolean(cells[y]?.[x]?.walkable) && !blocked.has(`${x},${y}`));
  if (neighbours.length < 2) return true;

  const visited = new Set<string>([`${neighbours[0].x},${neighbours[0].y}`]);
  const queue = [neighbours[0]];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = `${next.x},${next.y}`;
      if (visited.has(key) || blocked.has(key) || !cells[next.y]?.[next.x]?.walkable) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return neighbours.every(({ x, y }) => visited.has(`${x},${y}`));
}

// Kept for callers that specifically ask about chests. The same rule applies
// to every movement-blocking object.
export const isNonBlockingChestPlacementCell = isNonBlockingObjectPlacementCell;

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
  if (maximumStamina <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, currentStamina / maximumStamina));
  return GAME_TUNING.readinessFloor + (1 - GAME_TUNING.readinessFloor) * ratio;
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
  campaign.worldSeed ??= campaign.floor.seed;
  campaign.slot = Number.isInteger(campaign.slot) && campaign.slot! > 0 ? campaign.slot : 1;
  campaign.run = Number.isInteger(campaign.run) && campaign.run! > 0 ? campaign.run : 1;
  ensureSemanticCells(campaign.floor);
  normalizeObjectSets(campaign.floor);
  campaign.levelStates ??= {};
  ensureStarterConsumables(campaign);
  normalizeQuickSlots(campaign);
  normalizeStackableLocations(campaign);
  campaign.player.hasMass = campaign.player.hasMass !== false;
  campaign.player.heading = campaign.player.heading ?? "e";
  campaign.player.encumberedDirection ??= null;
  campaign.combatRollState = Number.isInteger(campaign.combatRollState) ? campaign.combatRollState! >>> 0 : campaign.floor.seed >>> 0;
  campaign.floor.projectiles = Array.isArray(campaign.floor.projectiles) ? campaign.floor.projectiles : [];
  campaign.player.resources = playerResourcesFromCampaign(campaign);
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  for (const entity of campaign.floor.entities ?? []) if (entity.kind === "enemy") {
    entity.hasMass = entity.hasMass !== false;
    if (entity.name === "Cave Rat") entity.name = "Rat";
    entity.resources = enemyResources(entity, level);
    entity.hp = entity.resources.health.current;
    entity.maxHp = entity.resources.health.currentMax;
    entity.damage = entity.resources.offense.current;
    entity.xp = entity.resources.xp.current;
    entity.awareness = Number(entity.awareness ?? GAME_TUNING.enemyAwareness);
    entity.actionCooldown = Math.max(1, Number(entity.actionCooldown ?? GAME_TUNING.enemyActionCooldown));
    entity.attackKind ??= "melee";
    entity.attackRange = Math.max(1, Number(entity.attackRange ?? 1));
    entity.nextActionAt = Math.max(0, Number(entity.nextActionAt ?? campaign.floor.time + entity.actionCooldown));
    entity.heading = entity.heading ?? "e";
    entity.ai = entity.ai && ["idle", "pursue", "attack", "blocked"].includes(entity.ai.state)
      ? { state: entity.ai.state, targetId: entity.ai.targetId === "player" ? "player" : null }
      : { state: "idle", targetId: null };
  }
  campaign.progression.level = Math.max(1, Math.min(99, Math.trunc(Number(campaign.progression.level) || 1)));
  campaign.progression.xp = Math.max(0, Math.trunc(Number(campaign.progression.xp) || 0));
  campaign.progression.nextXp = GAME_TUNING.xpThreshold;
  campaign.progression.attributePoints = Math.max(0, Math.trunc(Number(campaign.progression.attributePoints) || 0));
  for (const name of progressionStatNames) campaign.progression.attributes[name] = Math.max(1, Math.min(99, Math.trunc(Number(campaign.progression.attributes[name]) || 1)));
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
  const regionRole = level === 1 ? level1TestMode ? "exit" : objectSetRoles[Math.floor(random() * objectSetRoles.length)] : null;
  const sealedDoor = { x: start.x + 4, y: start.y };
  const sealedGoal = { x: start.x + 6, y: start.y };
  if (level === 1) {
    for (let y = start.y - 2; y <= start.y + 2; y++) for (let x = start.x + 4; x <= start.x + 8; x++) map[y][x] = 1;
    carveRoom(map, { x: start.x + 5, y: start.y - 1, w: 3, h: 3 });
    map[sealedDoor.y][sealedDoor.x] = 0;
  }
  const exitCandidates: Position[] = [];
  for (let y = 1; y < FLOOR_HEIGHT - 1; y++) for (let x = 1; x < FLOOR_WIDTH - 1; x++) if (map[y][x] === 0 && Math.hypot(x - start.x, y - start.y) >= 20) exitCandidates.push({ x, y });
  const distantExit = exitCandidates[Math.floor(random() * exitCandidates.length)] ?? { x: start.x + 3, y: start.y };
  // Keep the nearby test-mode stair one clear tile away from the sealed door.
  // A stair beside a door makes its interaction hard to distinguish from opening
  // the door and violates the shared object-placement spacing rule.
  const forward = level1TestMode ? { x: start.x + 2, y: start.y } : regionRole === "exit" ? sealedGoal : distantExit;
  if (level === 1 && !level1TestMode && regionRole !== "exit") {
    const bypass = { x: start.x, y: start.y + 4 };
    connectRooms(map, start, bypass, corridorWidth);
    connectRooms(map, bypass, forward, corridorWidth);
  }
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
    const blockingCells: Position[] = [];
    const blocksMovement = (entity: Entity) => ["chest", "crate", "campfire", "enemy"].includes(entity.kind) && (entity.kind !== "chest" || !entity.opened) && (entity.kind !== "crate" || !entity.opened);
    const nextCell = () => candidates.find((cell) => !route.has(`${cell.x},${cell.y}`) && claim(cell)) ?? null;
    const nextBlockingCell = () => candidates.find((cell) => !route.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && claim(cell)) ?? null;
    const add = (entity: Entity) => { generation.entities.push(entity); if (blocksMovement(entity)) blockingCells.push(entity); };
    const objectSets: FloorTriggerDoorBarrelSet[] = [];
    if (level === 1 && regionRole) {
      const layouts = [
        { barrel: { x: start.x - 2, y: start.y }, trigger: { x: start.x - 1, y: start.y } },
        { barrel: { x: start.x, y: start.y - 2 }, trigger: { x: start.x, y: start.y - 1 } },
        { barrel: { x: start.x - 2, y: start.y + 2 }, trigger: { x: start.x - 1, y: start.y + 2 } },
      ];
      const layout = layouts[Math.floor(random() * layouts.length)];
      const claimSetCell = (cell: Position) => generation.reserveEntityCell(cell.x, cell.y);
      if (!isBarrelAdjacentToWall(generation, layout.barrel) && claimSetCell(layout.barrel) && claimSetCell(layout.trigger) && claimSetCell(sealedDoor)) {
        objectSets.push({ id: "floor-trigger-door-barrel-1", kind: "floor-trigger-door-barrel", barrel: layout.barrel, barrelStart: { ...layout.barrel }, trigger: layout.trigger, door: sealedDoor, regionRole });
        blockingCells.push(layout.barrel, sealedDoor);
        if (regionRole === "optional-reward" && claimSetCell(sealedGoal)) add({ id: "sealed-reward", kind: "chest", opened: false, ...sealedGoal });
      }
    }
    const addPickup = (kind: "health" | "mana", index: number) => {
      const cell = nextCell(); if (!cell) return;
      add({ id: `${kind}-potion-${index}`, kind: "potion", resource: kind, x: cell.x, y: cell.y });
    };
    const addCounterPickup = (kind: "key" | "gold", index: number) => {
      const cell = nextCell(); if (!cell) return;
      add({ id: `${kind}-${index}`, kind, amount: kind === "gold" ? 5 + Math.floor(random() * 16) : 1, x: cell.x, y: cell.y });
    };
    // Test mode places introductory pickups, a chest, and a crate beside the level-one entrance.
    // Normal floors use the seeded, object-specific distribution rules below.
    const nearStart = (offsets: readonly Position[]) => offsets.map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => !route.has(`${cell.x},${cell.y}`) && claim(cell));
    const nearStartBlocking = (offsets: readonly Position[]) => offsets.map(({ x, y }) => ({ x: start.x + x, y: start.y + y })).find((cell) => !route.has(`${cell.x},${cell.y}`) && isSolidObjectPlacementCell(generation.cells, cell) && isNonBlockingObjectPlacementCell(generation.cells, cell, blockingCells) && claim(cell));
    if (level1TestMode) {
      const testChest = nearStartBlocking([{ x: -1, y: 0 }, { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -2, y: 0 }]);
      const testCrate = nearStartBlocking([{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -2 }, { x: 2, y: -1 }]);
      const healthCell = nearStart([{ x: 0, y: 1 }, { x: -1, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }]);
      const manaCell = nearStart([{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: -1, y: 2 }]);
      const starterKey = nearStart([{ x: -2, y: 2 }, { x: -2, y: -2 }, { x: 2, y: 2 }]);
      const starterGold = nearStart([{ x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: -2 }]);
      const testCampfire = nearStartBlocking([{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -2, y: 1 }]);
      if (healthCell) add({ id: "health-potion", kind: "potion", resource: "health", ...healthCell });
      if (manaCell) add({ id: "mana-potion", kind: "potion", resource: "mana", ...manaCell });
      if (starterKey) add({ id: "starter-key", kind: "key", amount: 1, ...starterKey });
      if (starterGold) add({ id: "starter-gold", kind: "gold", amount: 10, ...starterGold });
      if (testChest) add({ id: "test-chest", kind: "chest", opened: false, ...testChest });
      if (testCrate) add({ id: "test-crate", kind: "crate", health: 100, ...testCrate });
      if (testCampfire) add({ id: "test-campfire", kind: "campfire", name: "CampFire", ...testCampfire });
    }
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i]; const preferred = { x: room.x + 2, y: room.y + 2 };
      const enemyCell = !route.has(`${preferred.x},${preferred.y}`) && isSolidObjectPlacementCell(generation.cells, preferred) && isNonBlockingObjectPlacementCell(generation.cells, preferred, blockingCells) && claim(preferred) ? preferred : nextBlockingCell();
      if (enemyCell && random() < 0.76) {
        const archer = difficulty > 2 && random() < .18; const skeleton = !archer && difficulty > 1 && random() < .4;
        const health = archer ? 20 + (difficulty - 2) * 4 : skeleton ? 20 + (difficulty - 2) * 4 : 12 + (difficulty - 1) * 3;
        const damage = archer ? 4 + (difficulty - 3) : skeleton ? 6 + (difficulty - 2) * 2 : 3 + (difficulty - 1) * 2;
        const enemy: Omit<Enemy, "resources"> = { id: `enemy-${i}`, kind: "enemy", x: enemyCell.x, y: enemyCell.y, hasMass: true, hp: health, maxHp: health, damage, awareness: GAME_TUNING.enemyAwareness, actionCooldown: GAME_TUNING.enemyActionCooldown, nextActionAt: GAME_TUNING.enemyActionCooldown, name: archer ? "Skeleton Archer" : skeleton ? "Skeleton" : "Rat", attackKind: archer ? "ranged" : "melee", attackRange: archer ? 5 : 1, xp: GAME_TUNING.xpPerKillBase + difficulty, heading: "e", ai: { state: "idle", targetId: null } };
        add({ ...enemy, resources: enemyResources(enemy, level) });
      }
      if (!level1TestMode && random() < 0.35) {
        const chestCell = nextBlockingCell(); if (chestCell) add({ id: `chest-${i}`, kind: "chest", x: chestCell.x, y: chestCell.y, opened: false });
      }
      if (random() < 0.25) {
        const crateCell = nextBlockingCell(); if (crateCell) add({ id: `crate-${i}`, kind: "crate", x: crateCell.x, y: crateCell.y, health: 100 });
      }
    }
    const campfireCount = Math.max(1, Math.floor(context.cells.flat().filter((cell) => cell.walkable).length / 420));
    for (let index = 0; index < campfireCount; index++) {
      const cell = nextBlockingCell();
      if (cell) add({ id: `campfire-${index + 1}`, kind: "campfire", name: "CampFire", ...cell });
    }
    if (level1TestMode) {
      const testEnemy = (id: string, name: "Rat" | "Skeleton", offsets: readonly Position[]) => {
        const cell = nearStartBlocking(offsets); if (!cell) return;
        const skeleton = name === "Skeleton"; const health = skeleton ? 20 : 12; const damage = skeleton ? 6 : 3;
        const enemy: Omit<Enemy, "resources"> = { id, kind: "enemy", x: cell.x, y: cell.y, hasMass: true, hp: health, maxHp: health, damage, awareness: GAME_TUNING.enemyAwareness, actionCooldown: GAME_TUNING.enemyActionCooldown, nextActionAt: GAME_TUNING.enemyActionCooldown, name, xp: GAME_TUNING.xpPerKillBase + difficulty, heading: "e", ai: { state: "idle", targetId: null } };
        add({ ...enemy, resources: enemyResources(enemy, level) });
      };
      testEnemy("test-rat", "Rat", [{ x: -1, y: 0 }, { x: -1, y: -1 }]);
      testEnemy("test-skeleton", "Skeleton", [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: -2 }, { x: 2, y: -1 }, { x: -1, y: -2 }]);
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
    (generation as typeof generation & { objectSets?: FloorTriggerDoorBarrelSet[] }).objectSets = objectSets;
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
  const floor: Floor = { seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells: context.cells, start, entities: context.entities, decorations, objectSets: (context as typeof context & { objectSets?: FloorTriggerDoorBarrelSet[] }).objectSets ?? [], time: 1, level, generatorVersion: GENERATOR_VERSION, generation: { ...context.generation, passes: context.passes } };
  return normalizeObjectSets(ensureSemanticCells(floor));
}

export function effectiveAttributes(campaign: Campaign, equipment: Equipment = campaign.player.equipment): Attributes {
  const base = campaign.progression.attributes; const seen = new Set<string>(); const mods = Object.values(equipment).flat().filter((item): item is Item => item !== null && !seen.has(item.id) && (seen.add(item.id), true)).reduce<Partial<Attributes>>((all, item) => {
    for (const [key, value] of Object.entries(item.modifiers ?? {}) as [AttributeName, number][]) all[key] = (all[key] ?? 0) + value;
    return all;
  }, {});
  const vitality = statRank(base, "vitality"); const strength = statRank(base, "strength");
  return {
    health: Math.max(1, Number(base.health ?? GAME_TUNING.startingHealth) * 10 + vitality * GAME_TUNING.vitalityHealthBonus + Number(mods.health ?? 0)),
    stamina: Math.max(0, Number(base.stamina ?? GAME_TUNING.startingStamina) * 5 + Number(mods.stamina ?? 0)),
    offense: Math.max(1, Number(base.offense ?? 1) + strength * GAME_TUNING.strengthOffenseBonus + Number(mods.offense ?? 0)),
    defense: Math.max(0, Number(base.defense ?? GAME_TUNING.innateDefense) + Number(mods.defense ?? 0)),
    mana: Math.max(0, Number(base.mana ?? GAME_TUNING.startingMana) * 5 + Number(mods.mana ?? 0)),
    vitality, strength, luck: statRank(base, "luck"), recovery: statRank(base, "recovery"), stealth: statRank(base, "stealth"),
  };
}

export function resourceState(campaign: Campaign) {
  return playerResourcesFromCampaign(campaign);
}

export function rollStartingAttributes(random = Math.random): Attributes {
  const attributes = Object.fromEntries(progressionStatNames.map((name) => [name, 1])) as Attributes;
  for (let point = 0; point < 20; point++) {
    const choices = progressionStatNames.filter((name) => attributes[name] < 5);
    attributes[choices[Math.floor(random() * choices.length)]]++;
  }
  return attributes;
}

export function createCampaign(seed = seedNow(), difficulty = 1, level = 1, options: { level1TestMode?: boolean; attributes?: Attributes } = {}): Campaign {
  const floor = generateFloor(level, seed, difficulty, options); const attributes = options.attributes ? { ...options.attributes } : rollStartingAttributes(rng(seed));
  const campaign: Campaign = { version: 5, world: "One", realm: `Underground ${floor.level}`, floor, combatRollState: seed >>> 0, generatorVersion: GENERATOR_VERSION, levelStates: {}, floors: { [level]: structuredClone(floor) }, progression: { attributes, level: 1, xp: 0, nextXp: GAME_TUNING.xpThreshold, totalKills: 0, difficulty, attributePoints: 0 }, player: { x: floor.start.x, y: floor.start.y, hasMass: true, heading: "e", resources: createResourcesModel(), equipment: { weapons: [itemInstance(itemCatalog[7], "starter-stick"), null], armor: [null, null] }, inventory: [consumableInstance("health", "starter-health-potion"), consumableInstance("mana", "starter-mana-potion", 2)], inventoryCapacity: ITEM_CAPACITY, abilities: ["heal", "wand", null], quickSlots: [null, null], sneaking: false, encumberedDirection: null }, starterConsumablesSeeded: true, counters: { keys: 1, gold: 55 }, objective: "Find the exit", quest: { id: "my-first-quest", title: "My First Quest", items: [{ id: "walk-through-stairs", title: "Walk through the stairs", complete: false }, { id: "collect-health-potion", title: "Collect a Health Potion", complete: false }, { id: "collect-coin", title: "Collect a coin", complete: false }], activeItemId: "walk-through-stairs" }, log: [] };
  campaign.player.resources = playerResourcesFromCampaign(campaign, { health: effectiveAttributes(campaign).health, stamina: effectiveAttributes(campaign).stamina, mana: effectiveAttributes(campaign).mana });
  return campaign;
}

const blobFrames = Object.freeze([3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
export function wallFrameAt(floor: Floor, x: number, y: number) { const wall = (tx: number, ty: number) => !isWalkable(floor, tx, ty); const mask = Number(wall(x, y - 1)) | (Number(wall(x + 1, y)) << 1) | (Number(wall(x, y + 1)) << 2) | (Number(wall(x - 1, y)) << 3); return blobFrames[mask]; }

function tick(state: Campaign, events: GameEvent[], restTime = false) { const previous = state.floor.time; state.floor.time++; emit(events, "time.advanced", { previous, current: state.floor.time, restTime }, state); if (!restTime) enemyPhase(state, events); }
function normalizeResources(state: Campaign, events: GameEvent[], cause: string, previousCaps: Attributes) { const caps = effectiveAttributes(state); for (const key of ["health", "stamina", "mana"] as const) { const prior = state.player.resources[key].current; const oldMax = previousCaps[key]; const ratio = oldMax > 0 ? prior / oldMax : 0; const next = Math.max(0, Math.min(caps[key], ratio * caps[key])); state.player.resources[key] = { current: next, currentMax: caps[key] }; if (prior !== next) emit(events, "resource.changed", { resource: key, previous: prior, current: next, previousMax: oldMax, currentMax: caps[key], cause }, state); } state.player.resources = playerResourcesFromCampaign(state, state.player.resources); }
function changeResource(state: Campaign, events: GameEvent[], key: "health" | "stamina" | "mana", value: number, cause: string) { const cap = effectiveAttributes(state)[key]; const previous = state.player.resources[key].current; const current = Math.max(0, Math.min(cap, value)); state.player.resources[key] = { current, currentMax: cap }; state.player.resources = playerResourcesFromCampaign(state, state.player.resources); if (current !== previous) emit(events, "resource.changed", { resource: key, previous, current, currentMax: cap, cause, ...(key === "health" ? { position: { x: state.player.x, y: state.player.y } } : {}) }, state); }
function applyTrapOnEntry(state: Campaign, events: GameEvent[], elapsedMs: number) {
  const trap = state.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === state.player.x && decoration.y === state.player.y);
  if (!trap || !trapIsDangerous(trapFrameAt(elapsedMs))) return;
  const damage = trapStrikeDamage(resourceState(state).defense.current);
  changeResource(state, events, "health", state.player.resources.health.current - damage, "trap");
}
function applyActiveTrapStrikes(state: Campaign, events: GameEvent[], elapsedMs: number) {
  if (!trapIsDangerous(trapFrameAt(elapsedMs))) return;
  applyTrapOnEntry(state, events, elapsedMs);
  const defeatedEnemyIds = new Set<string>();
  for (const enemy of state.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy")) {
    if (!floorTrapAt(state.floor, enemy)) continue;
    const health = enemy.resources.health;
    const previousHealth = health.current;
    const damage = trapStrikeDamage(enemy.resources.defense.current);
    health.current = Math.max(0, health.current - damage);
    enemy.hp = health.current;
    emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage, previousHealth, currentHealth: health.current, source: "trap" }, state);
    if (health.current === 0) defeatedEnemyIds.add(enemy.id);
  }
  if (defeatedEnemyIds.size > 0) state.floor.entities = state.floor.entities.filter((entity) => entity.kind !== "enemy" || !defeatedEnemyIds.has(entity.id));
}
function floorTrapAt(floor: Floor, position: Position) {
  return floor.decorations?.some((decoration) => decoration.kind === "trap" && decoration.x === position.x && decoration.y === position.y) ?? false;
}
function enemyAvoidsTrap(enemy: Enemy, target: Position, time: number) {
  let hash = time;
  for (const value of [enemy.id, `${target.x},${target.y}`]) for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0 & 1) === 0;
}
function resetPlayerAfterDeath(state: Campaign, events: GameEvent[]) {
  if (state.player.resources.health.current > 0) return;
  const reset = freshRunAfterDeath(state); Object.assign(state, reset); emit(events, "player.died", { realm: "Underground 1" }, state);
}
function gainXp(state: Campaign, events: GameEvent[], amount: number, cause: string) {
  if (amount <= 0 || state.progression.level >= 99) return;
  const previous = state.progression.xp; state.progression.xp += amount;
  emit(events, "xp.gained", { amount, cause, previous, current: state.progression.xp }, state);
  while (state.progression.level < 99 && state.progression.xp >= state.progression.nextXp) {
    state.progression.xp -= state.progression.nextXp; state.progression.level++;
    state.progression.attributePoints += 3;
    emit(events, "xp.level.changed", { level: state.progression.level, current: state.progression.xp, threshold: state.progression.nextXp }, state);
  }
  if (state.progression.level >= 99) state.progression.xp = Math.min(state.progression.xp, state.progression.nextXp - 1);
  state.player.resources = playerResourcesFromCampaign(state, state.player.resources);
}
function integerDamage(amount: number) { return Math.max(0, Math.round(amount)); }
function cardinalDistance(from: Position, to: Position) { return Math.abs(from.x - to.x) + Math.abs(from.y - to.y); }
function cardinalDirection(from: Position, to: Position): Direction | null { if (from.x === to.x && from.y !== to.y) return to.y < from.y ? "n" : "s"; if (from.y === to.y && from.x !== to.x) return to.x < from.x ? "w" : "e"; return null; }
function hasClearCardinalLine(floor: Floor, from: Position, to: Position) { const direction = cardinalDirection(from, to); if (!direction) return false; const [dx, dy] = directions[direction]; for (let x = from.x + dx, y = from.y + dy; x !== to.x || y !== to.y; x += dx, y += dy) if (!isWalkable(floor, x, y)) return false; return true; }
function nextCombatRoll(state: Campaign) { const prior = state.combatRollState ?? state.floor.seed; state.combatRollState = (Math.imul(prior >>> 0, 1664525) + 1013904223) >>> 0; return state.combatRollState % 100 + 1; }
function hasPerk(state: Campaign, perk: string) { return uniqueItems(Object.values(state.player.equipment).flat()).some((item) => item.perks?.includes(perk)); }
function incomingDefense(state: Campaign, enemy: Enemy) { const direction = cardinalDirection(state.player, enemy) ?? "n"; const heading = state.player.heading ?? "e"; const side = direction === "n" || direction === "s" ? ["e", "w"] : ["n", "s"]; const multiplier = direction === heading ? 1 : side.includes(heading) ? .7 : .4; return { direction, multiplier, defense: resourceState(state).defense.current * multiplier }; }
function enemyCanAttack(enemy: Enemy, player: Position) {
  const distance = cardinalDistance(enemy, player);
  if (enemy.attackKind === "ranged") return distance <= (enemy.attackRange ?? 1) && cardinalDirection(enemy, player) !== null;
  return cardinalDistance(enemy, player) === 1;
}
function headingToward(from: Position, to: Position, fallback: Direction) {
  const dx = Math.sign(to.x - from.x); const dy = Math.sign(to.y - from.y);
  return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? headingFromMovement(dx, 0, fallback) : headingFromMovement(0, dy, fallback);
}
function enemyPhase(state: Campaign, events: GameEvent[]) {
  if (state.floor.time === 1) return;
  const player = state.player;
  const enemies = state.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy");
  const canEnter = (enemy: Enemy, position: Position) => !isObjectSetBlocked(state.floor, state.player, position.x, position.y)
    && !(floorTrapAt(state.floor, position) && enemyAvoidsTrap(enemy, position, state.floor.time));
  const intents = planEnemyActions({ floor: state.floor, player, time: state.floor.time, enemies, effectiveAwareness: (enemy) => effectiveAwareness(state, enemy), canAttack: (enemy, target) => enemyCanAttack(enemy, target) && (enemy.attackKind !== "ranged" || hasClearCardinalLine(state.floor, enemy, target)), canEnter });
  const occupied = new Set(state.floor.entities.map((entity) => `${entity.x},${entity.y}`));
  for (const intent of intents) {
    const enemy = state.floor.entities.find((entity): entity is Enemy => entity.kind === "enemy" && entity.id === intent.enemyId);
    if (!enemy) continue;
    if (intent.kind === "idle") { enemy.ai = { state: "idle", targetId: null }; continue; }
    if (intent.kind === "wait") { enemy.ai = { state: intent.state, targetId: intent.state === "idle" ? null : "player" }; continue; }
    if (intent.kind === "attack") {
      enemy.ai = { state: "attack", targetId: "player" };
      enemy.nextActionAt = state.floor.time + enemy.actionCooldown;
      enemy.heading = headingToward(enemy, player, enemy.heading ?? "e");
      const defense = incomingDefense(state, enemy);
      const parried = hasPerk(state, "Automatic parry");
      const damage = parried ? 0 : Math.max(1, integerDamage(enemy.resources.offense.current - defense.defense));
      if (enemy.attackKind === "ranged") {
        const projectileId = `projectile-${state.floor.time}-${enemy.id}`;
        state.floor.projectiles = [...(state.floor.projectiles ?? []), { id: projectileId, sourceId: enemy.id, from: { x: enemy.x, y: enemy.y }, to: { x: player.x, y: player.y }, direction: defense.direction, createdAt: state.floor.time }];
        emit(events, "projectile.fired", { projectileId, source: enemy.id, from: { x: enemy.x, y: enemy.y }, targetPosition: { x: player.x, y: player.y }, attackDirection: defense.direction }, state);
      }
      if (damage > 0) changeResource(state, events, "health", player.resources.health.current - damage, "enemy-attack");
      emit(events, "combat.hit", { target: "Player", targetId: "player", source: enemy.id, targetPosition: { x: player.x, y: player.y }, damage, attackDirection: defense.direction, mitigation: defense.multiplier, outcome: parried ? "PARRY" : "HIT" }, state);
      continue;
    }
    if (intent.kind === "blocked") { enemy.ai = { state: "blocked", targetId: "player" }; continue; }
    const origin = `${enemy.x},${enemy.y}`; const destination = `${intent.to.x},${intent.to.y}`;
    occupied.delete(origin);
    if (occupied.has(destination) || !canEnter(enemy, intent.to)) {
      occupied.add(origin); enemy.ai = { state: "blocked", targetId: "player" }; continue;
    }
    enemy.heading = headingFromMovement(intent.to.x - enemy.x, intent.to.y - enemy.y, enemy.heading ?? "e");
    enemy.x = intent.to.x; enemy.y = intent.to.y; enemy.ai = { state: "pursue", targetId: "player" };
    enemy.nextActionAt = state.floor.time + enemy.actionCooldown; occupied.add(destination);
  }
  resetPlayerAfterDeath(state, events);
}
function sameSerializedValue(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }

/** Captures only changes from a deterministic base floor. Runtime floors remain complete. */
export function createLevelStateDelta(base: Floor, current: Floor): LevelStateDelta {
  const baseEntities = new Map(base.entities.map((entity) => [entity.id, entity]));
  const currentEntities = new Map(current.entities.map((entity) => [entity.id, entity]));
  const removedGeneratedIds = [...baseEntities.keys()].filter((id) => !currentEntities.has(id)).sort();
  const entityOverrides: Record<string, Entity> = {};
  const spawnedEntities: Entity[] = [];
  for (const entity of current.entities) {
    const generated = baseEntities.get(entity.id);
    if (!generated) spawnedEntities.push(structuredClone(entity));
    else if (!sameSerializedValue(generated, entity)) entityOverrides[entity.id] = structuredClone(entity);
  }
  const baseSets = new Map((base.objectSets ?? []).map((set) => [set.id, set]));
  const objectSetOverrides: Record<string, ObjectSet> = {};
  for (const set of current.objectSets ?? []) if (!sameSerializedValue(baseSets.get(set.id), set)) objectSetOverrides[set.id] = structuredClone(set);
  return { time: current.time, removedGeneratedIds, entityOverrides, spawnedEntities: spawnedEntities.sort((left, right) => left.id.localeCompare(right.id)), objectSetOverrides };
}

export function applyLevelStateDelta(base: Floor, delta: LevelStateDelta | undefined): Floor {
  if (!delta) return structuredClone(base);
  const removed = new Set(delta.removedGeneratedIds);
  const entities = base.entities.filter((entity) => !removed.has(entity.id)).map((entity) => structuredClone(delta.entityOverrides[entity.id] ?? entity));
  entities.push(...delta.spawnedEntities.map((entity) => structuredClone(entity)));
  const objectSets = (base.objectSets ?? []).map((set) => structuredClone(delta.objectSetOverrides[set.id] ?? set));
  return normalizeObjectSets(ensureSemanticCells({ ...structuredClone(base), time: delta.time, entities, objectSets }));
}

export function generatedFloorForCampaign(campaign: Pick<Campaign, "worldSeed" | "slot" | "run" | "progression">, level: number) {
  const seed = worldFloorSeed(campaign.worldSeed ?? 0, campaign.slot ?? 1, campaign.run ?? 1, level);
  return generateFloor(level, seed, Math.max(campaign.progression.difficulty ?? 1, level));
}

export function rebuildCampaignFloor(campaign: Campaign, level: number) {
  return applyLevelStateDelta(generatedFloorForCampaign(campaign, level), campaign.levelStates?.[String(level)]);
}

/** Produces a JSON-safe campaign record without a generated terrain grid. */
export function compactCampaignForSave(campaign: Campaign): Campaign {
  const copy = structuredClone(campaign);
  const level = copy.floor.level ?? copy.floor.depth ?? 1;
  copy.levelStates = { ...(copy.levelStates ?? {}), [String(level)]: createLevelStateDelta(generatedFloorForCampaign(copy, level), copy.floor) };
  copy.generatorVersion = GENERATOR_VERSION;
  copy.version = 5;
  copy.floors = undefined;
  const base = generatedFloorForCampaign(copy, level);
  copy.floor = { seed: base.seed, width: base.width, height: base.height, cells: [], start: base.start, entities: [], time: copy.floor.time, level, generatorVersion: GENERATOR_VERSION };
  return copy;
}

export function restoreCompactCampaign(campaign: Campaign) {
  const level = campaign.floor.level ?? campaign.floor.depth ?? 1;
  campaign.floor = rebuildCampaignFloor(campaign, level);
  campaign.realm = campaign.realm || `Underground ${level}`;
  return upgradeCampaignResources(campaign);
}

export function createRunCampaign(worldSeed: number, slot: number, run: number, difficulty = 1, level = 1, options: { level1TestMode?: boolean; attributes?: Attributes } = {}) {
  const campaign = createCampaign(worldFloorSeed(worldSeed, slot, run, level), difficulty, level, options);
  campaign.worldSeed = worldSeed >>> 0;
  campaign.slot = slot;
  campaign.run = run;
  campaign.generatorVersion = GENERATOR_VERSION;
  campaign.floors = undefined;
  return campaign;
}
function freshRunAfterDeath(state: Campaign) { const difficulty = state.progression.difficulty ?? state.floor.level ?? state.floor.depth ?? 1; const campaign = createRunCampaign(state.worldSeed ?? state.floor.seed, state.slot ?? 1, (state.run ?? 1) + 1, difficulty); campaign.progression = structuredClone(state.progression); campaign.progression.difficulty = difficulty; campaign.player.abilities = state.player.abilities.slice(0, 3); campaign.player.resources = playerResourcesFromCampaign(campaign, campaign.player.resources); return campaign; }
function orderedInventory(inventory: Item[]) { return [...inventory].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
function occupiedIndexes(slots: (Item | null)[], item: Item) { return slots.flatMap((entry, index) => entry?.id === item.id ? [index] : []); }
function targetIndexes(slots: (Item | null)[], item: Item, index: number) {
  if (item.slotSpan === 2) return [0, 1];
  const target = slots[index];
  return target?.slotSpan === 2 ? occupiedIndexes(slots, target) : [index];
}
function uniqueItems(items: (Item | null | undefined)[]) { const seen = new Set<string>(); return items.filter((item): item is Item => { if (!item || seen.has(item.id)) return false; seen.add(item.id); return true; }); }
function applyEquipmentItem(slots: (Item | null)[], item: Item, indexes: number[]) {
  for (const target of indexes) slots[target] = null;
  if (item.slotSpan === 2) { slots[0] = item; slots[1] = item; }
  else slots[indexes[0]!] = item;
}
function attack(state: Campaign, events: GameEvent[], enemy: Enemy) {
  const weapon = uniqueItems(state.player.equipment.weapons).find((item) => Number.isFinite(item.hitChance)) ?? null;
  const hitChance = Math.min(100, Math.max(0, (weapon?.hitChance ?? 100) + effectiveAttributes(state).luck));
  const critChance = Math.min(hitChance, Math.max(0, weapon?.critChance ?? 0));
  const roll = nextCombatRoll(state); const outcome = roll <= critChance ? "CRIT" : roll <= hitChance ? "HIT" : "MISS";
  const normalDamage = Math.max(1, integerDamage(resourceState(state).offense.current));
  const damage = outcome === "CRIT" ? Math.ceil(normalDamage * 1.5) : outcome === "HIT" ? normalDamage : 0;
  const health = enemy.resources.health; const before = health.current; health.current = Math.max(0, health.current - damage); enemy.hp = health.current;
  emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage, previousHealth: before, currentHealth: health.current, hitChance, critChance, outcome, roll }, state);
  changeResource(state, events, "stamina", state.player.resources.stamina.current - ATTACK_STAMINA_COST, "attack"); gainXp(state, events, GAME_TUNING.xpPerAttack, "attack");
  if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== enemy.id); state.progression.totalKills++; gainXp(state, events, enemy.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: enemy.name, xp: enemy.resources.xp.current }, state); }
}
const chestCoinOffsets: readonly Position[] = [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 }];
function openChest(state: Campaign, events: GameEvent[], chest: Extract<Entity, { kind: "chest" }>) {
  chest.opened = true;
  let coinsCreated = 0;
  for (const offset of chestCoinOffsets) {
    if (coinsCreated === 3) break;
    const x = chest.x + offset.x; const y = chest.y + offset.y;
    if (!isWalkable(state.floor, x, y) || isObjectSetBlocked(state.floor, state.player, x, y) || (state.player.x === x && state.player.y === y) || entityAt(state.floor.entities, x, y)) continue;
    coinsCreated++;
    state.floor.entities.push({ id: `chest-gold-${chest.id}-${coinsCreated}`, kind: "gold", amount: 1, x, y });
  }
  emit(events, "chest.opened", { id: chest.id, position: { x: chest.x, y: chest.y }, item: "Gold", amount: coinsCreated, lootTier: lootTier(state) }, state);
  gainXp(state, events, GAME_TUNING.xpPerContainer, "chest");
}
function openCrate(state: Campaign, events: GameEvent[], crate: Extract<Entity, { kind: "crate" }>) {
  crate.opened = true;
  crate.openFrame = ((state.floor.seed ^ (crate.x * 73856093) ^ (crate.y * 19349663)) >>> 0) % 2 === 0 ? 1 : 5;
  let coinsCreated = 0;
  for (const offset of chestCoinOffsets) {
    if (coinsCreated === 3) break;
    const x = crate.x + offset.x; const y = crate.y + offset.y;
    if (!isWalkable(state.floor, x, y) || isObjectSetBlocked(state.floor, state.player, x, y) || (state.player.x === x && state.player.y === y) || entityAt(state.floor.entities, x, y)) continue;
    coinsCreated++;
    state.floor.entities.push({ id: `crate-gold-${crate.id}-${coinsCreated}`, kind: "gold", amount: 1, x, y });
  }
  emit(events, "crate.opened", { id: crate.id, position: { x: crate.x, y: crate.y }, item: "Gold", amount: coinsCreated, lootTier: lootTier(state) }, state);
  gainXp(state, events, GAME_TUNING.xpPerContainer, "crate");
}

export function applyAction(campaign: Campaign, action: Action): ActionResult {
  const state = upgradeCampaignResources(structuredClone(campaign)); const events: GameEvent[] = []; const reject = (reason: string, facts: EventFacts = {}, type = "action.rejected"): ActionResult => ({ state: campaign, events: [{ type, facts: { reason, ...facts }, gameTime: campaign.floor.time, sequence: 1 }], accepted: false, ticks: 0 });
  if (action.type === "trap-strike") {
    applyActiveTrapStrikes(state, events, action.hazardElapsedMs);
    resetPlayerAfterDeath(state, events);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "spend-attribute-points") {
    const entries = progressionStatNames.map((name) => [name, Math.max(0, Math.trunc(Number(action.allocation[name]) || 0))] as const).filter(([, amount]) => amount > 0);
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    if (!total || total > state.progression.attributePoints || entries.some(([name, amount]) => state.progression.attributes[name] + amount > 99)) return reject("invalid-attribute-allocation");
    const previousCaps = effectiveAttributes(state);
    for (const [name, amount] of entries) state.progression.attributes[name] += amount;
    state.progression.attributePoints -= total;
    normalizeResources(state, events, "attribute-points", previousCaps);
    emit(events, "progression.points.spent", { amount: total, points: state.progression.attributePoints }, state);
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "toggle-sneak") { state.player.sneaking = !state.player.sneaking; emit(events, "player.sneak.changed", { active: state.player.sneaking }, state); return { state, events, accepted: true, ticks: 0 }; }
  if (action.type === "return-barrel") {
    const set = floorTriggerDoorSets(state.floor).find((entry) => entry.id === action.setId); const start = set?.barrelStart;
    if (!set || !start || set.barrelReturnUsed || !isBarrelAdjacentToWall(state.floor, set.barrel) || samePosition(set.barrel, start) || !isWalkable(state.floor, start.x, start.y) || samePosition(state.player, start) || entityAt(state.floor.entities, start.x, start.y)) return reject("barrel-return-unavailable");
    const from = { ...set.barrel }; set.barrel = { ...start }; set.barrelReturnUsed = true;
    emit(events, "barrel.returned", { id: set.id, from, to: { ...start } }, state); return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "wait") { tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "rest") { tick(state, events, true); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "enter-stairs") {
    const stair = state.floor.entities.find((entity): entity is Extract<Entity, { kind: "stairs" }> => entity.kind === "stairs" && entity.x === state.player.x && entity.y === state.player.y);
    if (!stair) return reject("not-on-stairs");
    const currentLevel = state.floor.level ?? state.floor.depth ?? 1;
    const level = stair.direction === "back" ? Math.max(1, currentLevel - 1) : currentLevel + 1;
    const time = state.floor.time;
    state.levelStates ??= {};
    if (state.floors) state.floors[String(currentLevel)] = structuredClone(state.floor);
    else state.levelStates[String(currentLevel)] = createLevelStateDelta(generatedFloorForCampaign(state, currentLevel), state.floor);
    const difficulty = Math.max(state.progression.difficulty ?? 1, level);
    state.progression.difficulty = difficulty;
    state.floor = state.floors?.[String(level)] ? structuredClone(state.floors[String(level)]!) : rebuildCampaignFloor(state, level);
    state.floor.time = time;
    if (state.floors) state.floors[String(level)] = structuredClone(state.floor);
    state.realm = `Underground ${level}`;
    const entrance = entrancePosition(state.floor);
    state.player.x = entrance.x; state.player.y = entrance.y;
    emit(events, "realm.entered", { realm: state.realm, level }, state);
    if (!state.floor.progressionXpAwarded) { state.floor.progressionXpAwarded = true; gainXp(state, events, GAME_TUNING.xpPerFloor, "floor-arrival"); }
    return { state, events, accepted: true, ticks: 0 };
  }
  if (action.type === "move") {
    const direction = directions[action.direction as Direction]; if (!direction) return reject("invalid-direction"); const [dx, dy] = direction; const x = state.player.x + dx; const y = state.player.y + dy; const entity = entityAt(state.floor.entities, x, y);
    const barrelSet = barrelSetAt(state.floor, x, y);
    const isOrdinaryStep = !entity && !barrelSet && isWalkable(state.floor, x, y) && !isObjectSetBlocked(state.floor, state.player, x, y);
    if (state.player.inventory.length > state.player.inventoryCapacity && isOrdinaryStep) {
      if (state.player.encumberedDirection !== action.direction) { state.player.encumberedDirection = action.direction as Direction; return { state, events, accepted: true, ticks: 0 }; }
      state.player.encumberedDirection = null;
    }
    if (barrelSet) {
      const target = { x: x + dx, y: y + dy };
      if (!isWalkable(state.floor, target.x, target.y) || isObjectSetBlocked(state.floor, state.player, target.x, target.y) || entityAt(state.floor.entities, target.x, target.y)) return reject("blocked-barrel");
      barrelSet.barrel = target;
      state.player.heading = action.direction as Direction; state.player.x = x; state.player.y = y;
      emit(events, "barrel.pushed", { id: barrelSet.id, from: { x, y }, to: { ...target } }, state);
      emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
      tick(state, events); return { state, events, accepted: true, ticks: 1 };
    }
    if ((!isWalkable(state.floor, x, y) || isObjectSetBlocked(state.floor, state.player, x, y)) && !entity) return reject("blocked");
    if (entity?.kind === "campfire") return reject("blocked-campfire");
    if (entity?.kind === "enemy") {
      state.player.heading = action.direction as Direction;
      attack(state, events, entity);
    }
    else if (entity?.kind === "chest") {
      state.player.heading = action.direction as Direction;
      if (!entity.opened) openChest(state, events, entity);
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    } else if (entity?.kind === "crate" && !entity.opened) {
      state.player.heading = action.direction as Direction;
      if (!entity.opened) {
        emit(events, "crate.bumped", { id: entity.id, position: { x: entity.x, y: entity.y } }, state);
        entity.health = Math.max(0, entity.health - 50);
        if (entity.health === 0) openCrate(state, events, entity);
      }
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    } else {
      state.player.heading = action.direction as Direction;
      state.player.x = x; state.player.y = y; emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      applyTrapOnEntry(state, events, Number.isFinite(action.hazardElapsedMs) ? action.hazardElapsedMs! : state.floor.time * TRAP_FRAME_DURATION_MS);
      if (entity?.kind === "stairs") {
        emit(events, "stairs.entered", { id: entity.id, position: { x, y } }, state);
      }
      else if (entity?.kind === "potion") { const item = consumableInstance(entity.resource, entity.id); const quickIndex = state.player.quickSlots!.findIndex((slot) => slot?.item.consumableResource === entity.resource); const inventoryItem = state.player.inventory.find((entry) => isQuickSlottableItem(entry) && entry.consumableResource === entity.resource); if (quickIndex >= 0) { state.player.quickSlots![quickIndex]!.quantity += 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { inventoryItem.quantity = (inventoryItem.quantity ?? 1) + 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (state.player.inventory.length < state.player.inventoryCapacity) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, item: item.name, name: item.name, resource: entity.resource, destination: "inventory", quantity: 1 }, state); } else emit(events, "item.collection.rejected", { itemId: entity.id, name: entity.name ?? `${entity.resource} potion`, resource: entity.resource, reason: "inventory-full" }, state); }
      else if (entity?.kind === "item") { const item = normalizeItem(entity.item); const quickIndex = isQuickSlottableItem(item) ? state.player.quickSlots!.findIndex((slot) => slot?.item.consumableResource === item.consumableResource) : -1; const inventoryItem = isQuickSlottableItem(item) ? state.player.inventory.find((entry) => isQuickSlottableItem(entry) && entry.consumableResource === item.consumableResource) : null; if (quickIndex >= 0) { state.player.quickSlots![quickIndex]!.quantity += item.quantity ?? 1; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: { quickSlot: quickIndex }, quickSlot: quickIndex, quantity: state.player.quickSlots![quickIndex]!.quantity }, state); } else if (inventoryItem) { inventoryItem.quantity = (inventoryItem.quantity ?? 1) + (item.quantity ?? 1); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: inventoryItem.quantity }, state); } else if (state.player.inventory.length < state.player.inventoryCapacity) { state.player.inventory = orderedInventory([...state.player.inventory, item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: item.id, name: item.name, destination: "inventory", quantity: item.quantity ?? 1 }, state); } else emit(events, "item.collection.rejected", { itemId: item.id, name: item.name, reason: "inventory-full" }, state); }
      else if (entity?.kind === "key" || entity?.kind === "gold") {
        const amount = entity.amount ?? 1;
        if (entity.kind === "key") state.counters.keys += amount; else state.counters.gold += amount;
        state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id);
        emit(events, "item.collected", { itemId: entity.id, name: entity.kind === "key" ? "Key" : "Gold", amount, destination: entity.kind }, state);
        gainXp(state, events, GAME_TUNING.xpPerDiscovery, "discovery");
      }
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
    if (action.type === "equip") {
      const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex];
      if (!item || item.category === "consumable" || item.group !== group) return reject("invalid-equipment-drop");
      const slots = state.player.equipment[group]; const indexes = targetIndexes(slots, item, index); const displaced = uniqueItems(indexes.map((target) => slots[target]));
      if (state.player.inventory.length - 1 + displaced.length > state.player.inventoryCapacity) return reject("inventory-full");
      state.player.inventory.splice(itemIndex, 1); applyEquipmentItem(slots, item, indexes);
      state.player.inventory = orderedInventory([...state.player.inventory, ...displaced]);
      emit(events, "equipment.changed", { action: displaced.length ? "swapped" : "enabled", itemId: item.id, item: item.name, source: "inventory", destination: { group, index }, group, index, displacedItemIds: displaced.map((entry) => entry.id) } as EventFacts, state);
    }
    else if (action.type === "unequip") { const item = state.player.equipment[group][index]; if (!item || state.player.inventory.length >= state.player.inventoryCapacity) return reject("cannot-unequip"); for (const slotIndex of occupiedIndexes(state.player.equipment[group], item)) state.player.equipment[group][slotIndex] = null; state.player.inventory = orderedInventory([...state.player.inventory, item]); emit(events, "equipment.changed", { action: "returned to inventory", itemId: item.id, item: item.name, source: { group, index }, destination: "inventory", group, index }, state); }
    else { const other = action.other; if (!Number.isInteger(other) || other < 0 || other > 1 || other === index) return reject("invalid-equipment-slot"); const left = state.player.equipment[group][index]; const right = state.player.equipment[group][other]; if (left?.slotSpan === 2 || right?.slotSpan === 2) return reject("cannot-reorder-two-slot"); [state.player.equipment[group][index], state.player.equipment[group][other]] = [right, left]; emit(events, "equipment.changed", { action: "reordered", group, index, other, source: { group, index }, destination: { group, index: other } }, state); }
    normalizeResources(state, events, "equipment", previousCaps); tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  return reject("unknown-action");
}

export function resolveTurn(state: Campaign, direction: string) { return applyAction(state, { type: "move", direction }).state; }
export function previewEquipment(campaign: Campaign, item: Item, group: EquipmentGroup, index: number, mode = "equip") { const projected = structuredClone(campaign); const slots = projected.player.equipment[group]; if (mode === "equip" && item.group === group) applyEquipmentItem(slots, item, targetIndexes(slots, item, index)); if (mode === "unequip") for (const slotIndex of occupiedIndexes(slots, item)) slots[slotIndex] = null; return effectiveAttributes(projected); }
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
          if (result.accepted) emitFloorTriggerChanges(result.events, state, result.state);
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
