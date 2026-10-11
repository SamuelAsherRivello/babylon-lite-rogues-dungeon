import { createLevelContext, ensureSemanticCells, isWalkable, runLevelPasses } from "./level-grid.js";

export const FLOOR_WIDTH = 100;
export const FLOOR_HEIGHT = 100;
export const FLOOR_CENTER = Object.freeze({ x: Math.floor(FLOOR_WIDTH / 2), y: Math.floor(FLOOR_HEIGHT / 2) });
export const GENERATOR_VERSION = "rogues-dungeon-floor-v2";
const ITEM_CAPACITY = 10;
export const GAME_TUNING = Object.freeze({
  startingHealth: 30, startingStamina: 16, startingMana: 12, innateDefense: 1,
  attackStaminaCost: 4, moveStaminaRecovery: 2, readinessFloor: 0.75,
  healthPotionRestore: 10, manaPotionRestore: 8,
  xpPerAttack: 1, xpPerKillBase: 6, xpThreshold: 100,
  enemyAwareness: 6, enemyActionCooldown: 2, sneakingAwarenessReduction: 3,
  vitalityHealthBonus: 3, strengthOffenseBonus: 1, recoveryMoveBonus: 1,
  luckTierRanks: 2, stealthAwarenessRanks: 2,
});
const ATTACK_STAMINA_COST = GAME_TUNING.attackStaminaCost;

export const directions = Object.freeze({ n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] });
export const resourceNames = Object.freeze(["health", "stamina", "offense", "defense", "mana", "xp"]);
export const EVENT_TYPES = Object.freeze(["action.committed", "action.rejected", "time.advanced", "player.moved", "player.sneak.changed", "combat.hit", "enemy.defeated", "resource.changed", "item.collected", "item.collection.rejected", "potion.consumed", "chest.opened", "equipment.changed", "ability.used", "ability.assignment.changed", "xp.gained", "xp.level.changed", "progression.upgrade.offered", "progression.upgrade.chosen", "realm.entered", "player.died", "campaign.save.succeeded", "campaign.save.failed"]);
export const progressionStatNames = Object.freeze(["vitality", "strength", "luck", "recovery", "stealth"]);
export const attributeLabels = Object.freeze({ health: "Health", stamina: "Stamina", offense: "Offense", defense: "Defense", mana: "Mana", vitality: "Vitality", strength: "Strength", luck: "Luck", recovery: "Recovery", stealth: "Stealth" });
export const statLabels = attributeLabels;
export const abilityCatalog = Object.freeze({
  heal: Object.freeze({ id: "heal", title: "Heal", icon: "✦", manaCost: 5, kind: "heal", amount: 8, target: "self" }),
  wand: Object.freeze({ id: "wand", title: "Wand", icon: "✹", manaCost: 4, kind: "wand", damage: 7, target: "nearest-enemy", range: 8 }),
});
export const itemCatalog = Object.freeze([
  { name: "Chest Plate 02", group: "armor", modifiers: { defense: 4 } },
  { name: "Iron Sword 01", group: "weapons", modifiers: { offense: 8 } },
  { name: "Oak Shield 03", group: "weapons", modifiers: { defense: 3 } },
  { name: "Wooden Stick", group: "weapons", modifiers: { offense: 8 } },
]);

function rng(seed) { let value = seed >>> 0; return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; }; }
function seedNow() { return Math.floor(Math.random() * 0xffffffff) >>> 0; }
function blankMap(width = FLOOR_WIDTH, height = FLOOR_HEIGHT) { return Array.from({ length: height }, () => Array.from({ length: width }, () => 1)); }
function itemInstance(item, id) { return { id, ...item, modifiers: { ...item.modifiers } }; }
function entityAt(entities, x, y) { return entities.find((entity) => entity.x === x && entity.y === y); }
function emit(events, type, facts, state, source = type.split(".")[0]) { events.push({ type, facts, source, gameTime: state.floor.time, sequence: events.length + 1 }); }
function carveRoom(map, room) { for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) map[y][x] = 0; }
function roomCenter(room) { return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function roomSocket(room, target) {
  const center = roomCenter(room); const horizontal = Math.abs(target.x - center.x) >= Math.abs(target.y - center.y);
  if (horizontal) return { x: target.x < center.x ? room.x : room.x + room.w - 1, y: clamp(target.y, room.y + 1, room.y + room.h - 2) };
  return { x: clamp(target.x, room.x + 1, room.x + room.w - 2), y: target.y < center.y ? room.y : room.y + room.h - 1 };
}
function carveCorridorCell(map, x, y, width, axis = "horizontal") {
  const half = Math.floor(width / 2);
  for (let offset = -half; offset < width - half; offset++) {
    if (map[y]?.[x] == null) continue;
    if (axis === "horizontal" && map[y]?.[x + offset] !== undefined) map[y][x + offset] = 0;
    if (axis === "vertical" && map[y + offset]?.[x] !== undefined) map[y + offset][x] = 0;
  }
}
function connectRooms(map, from, to, width = 1) {
  const corridorWidth = Math.max(1, Math.floor(width)); let { x, y } = from;
  while (x !== to.x) { carveCorridorCell(map, x, y, corridorWidth, "horizontal"); x += Math.sign(to.x - x); }
  while (y !== to.y) { carveCorridorCell(map, x, y, corridorWidth, "vertical"); y += Math.sign(to.y - y); }
  carveCorridorCell(map, x, y, corridorWidth, "vertical");
}

export function createResourcesModel(values = {}) {
  return Object.fromEntries(resourceNames.map((name) => {
    const value = values[name] ?? {};
    return [name, { current: Number(value.current ?? 0), currentMax: Number(value.currentMax ?? 0), ...(value.level == null ? {} : { level: Number(value.level) }) }];
  }));
}

export function isResourcesModel(value) {
  return resourceNames.every((name) => Number.isFinite(value?.[name]?.current) && Number.isFinite(value?.[name]?.currentMax));
}

function playerResourcesFromCampaign(campaign, previous = campaign.player.resources) {
  const attributes = effectiveAttributes(campaign);
  const current = (name, fallback = 0) => Number.isFinite(previous?.[name]?.current) ? previous[name].current : Number.isFinite(previous?.[name]) ? previous[name] : fallback;
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

export function combatReadiness(currentStamina, maximumStamina) {
  const ratio = maximumStamina > 0 ? Math.max(0, Math.min(1, currentStamina / maximumStamina)) : 0;
  return GAME_TUNING.readinessFloor + (1 - GAME_TUNING.readinessFloor) * ratio;
}

export function levelUpOptions(level) {
  const start = Math.max(0, Number(level ?? 1) - 2) % progressionStatNames.length;
  return Object.freeze([0, 1, 2].map((offset) => progressionStatNames[(start + offset) % progressionStatNames.length]));
}

function statRank(attributes, name) { return Math.max(0, Number(attributes?.[name] ?? 0)); }
function lootTier(campaign) { return Math.floor(statRank(campaign.progression.attributes, "luck") / GAME_TUNING.luckTierRanks); }
function recoveryAmount(campaign) { return GAME_TUNING.moveStaminaRecovery + statRank(campaign.progression.attributes, "recovery") * GAME_TUNING.recoveryMoveBonus; }
function effectiveAwareness(campaign, enemy) {
  const base = Number(enemy.awareness ?? GAME_TUNING.enemyAwareness);
  const stealthReduction = Math.floor(statRank(campaign.progression.attributes, "stealth") / GAME_TUNING.stealthAwarenessRanks);
  return Math.max(1, base - stealthReduction - (campaign.player.sneaking ? GAME_TUNING.sneakingAwarenessReduction : 0));
}

function enemyResources(enemy, level = 1) {
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

export function upgradeCampaignResources(campaign) {
  ensureSemanticCells(campaign.floor);
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
  }
  campaign.progression.pendingUpgrades = Array.isArray(campaign.progression.pendingUpgrades) ? campaign.progression.pendingUpgrades.filter((entry) => Array.isArray(entry?.options) && entry.options.length === 3) : [];
  return campaign;
}

export function generateFloor(level, seed = seedNow(), difficulty = level, options = {}) {
  const random = rng(seed); const map = blankMap(); const rooms = [];
  const corridorWidth = Math.max(1, Math.floor(Number(options?.corridorWidth ?? 1)));
  const startRoom = { x: FLOOR_CENTER.x - 3, y: FLOOR_CENTER.y - 3, w: 7, h: 7 };
  carveRoom(map, startRoom); rooms.push(startRoom);
  for (let i = 0; i < 9; i++) {
    const room = { w: 5 + Math.floor(random() * 5), h: 4 + Math.floor(random() * 4) };
    room.x = 2 + Math.floor(random() * (FLOOR_WIDTH - room.w - 3));
    room.y = 2 + Math.floor(random() * (FLOOR_HEIGHT - room.h - 3));
    carveRoom(map, room);
    const previous = rooms.at(-1); const previousSocket = roomSocket(previous, roomCenter(room)); const nextSocket = roomSocket(room, roomCenter(previous));
    connectRooms(map, previousSocket, nextSocket, corridorWidth);
    rooms.push(room);
  }
  const start = { ...FLOOR_CENTER }; const exit = roomCenter(rooms.at(-1));
  const entities = [
    { id: "health-potion", kind: "potion", resource: "health", x: start.x, y: start.y + 1 },
    { id: "mana-potion", kind: "potion", resource: "mana", x: start.x + 2, y: start.y },
    { id: "stairs", kind: "stairs", x: exit.x, y: exit.y },
  ];
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i]; const x = room.x + 2; const y = room.y + 2;
    if (random() < 0.76) {
      const skeleton = difficulty > 1 && random() < 0.4;
      const health = skeleton ? 20 + (difficulty - 2) * 4 : 12 + (difficulty - 1) * 3;
      const damage = skeleton ? 6 + (difficulty - 2) * 2 : 3 + (difficulty - 1) * 2;
      const enemy = { id: `enemy-${i}`, kind: "enemy", x, y, hp: health, maxHp: health, damage, awareness: GAME_TUNING.enemyAwareness, actionCooldown: GAME_TUNING.enemyActionCooldown, nextActionAt: GAME_TUNING.enemyActionCooldown, name: skeleton ? "Skeleton" : "Rat", xp: GAME_TUNING.xpPerKillBase + difficulty };
      enemy.resources = enemyResources(enemy, level);
      entities.push(enemy);
    }
    if (random() < 0.35) entities.push({ id: `chest-${i}`, kind: "chest", x: Math.min(FLOOR_WIDTH - 2, x + 1), y, opened: false });
  }
  const context = createLevelContext({ worldId: "One", realmId: `Underground ${level}`, levelId: level, seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, entities, start, exit });
  runLevelPasses(context, [{ id: "structured-dungeon", run: (generation) => {
    for (let y = 0; y < FLOOR_HEIGHT; y++) for (let x = 0; x < FLOOR_WIDTH; x++) if (map[y][x] === 0) generation.writeCell(x, y, { walkable: true });
    return {};
  } }]);
  const floor = { seed, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells: context.cells, start, entities, time: 0, level, generatorVersion: GENERATOR_VERSION, generation: { ...context.generation, passes: context.passes } };
  return ensureSemanticCells(floor);
}

export function effectiveAttributes(campaign, equipment = campaign.player.equipment) {
  const base = campaign.progression.attributes; const mods = Object.values(equipment).flat().filter(Boolean).reduce((all, item) => {
    for (const [key, value] of Object.entries(item.modifiers ?? {})) all[key] = (all[key] ?? 0) + value;
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

export function resourceState(campaign) {
  return playerResourcesFromCampaign(campaign);
}

export function createCampaign(seed = seedNow(), difficulty = 1, level = 1) {
  const floor = generateFloor(level, seed, difficulty); const attributes = { health: GAME_TUNING.startingHealth, stamina: GAME_TUNING.startingStamina, offense: 0, defense: GAME_TUNING.innateDefense, mana: GAME_TUNING.startingMana, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 };
  const campaign = { version: 3, world: "One", realm: `Underground ${floor.level}`, floor, progression: { attributes, level: 1, xp: 0, nextXp: GAME_TUNING.xpThreshold, totalKills: 0, difficulty, pendingUpgrades: [] }, player: { x: floor.start.x, y: floor.start.y, resources: {}, equipment: { weapons: [itemInstance(itemCatalog[3], "starter-stick"), null], armor: [null, null] }, inventory: [], inventoryCapacity: ITEM_CAPACITY, abilities: ["heal", "wand", null], sneaking: false }, counters: { keys: 1, gold: 55 }, objective: "Find the exit", log: [] };
  campaign.player.resources = playerResourcesFromCampaign(campaign, { health: GAME_TUNING.startingHealth, stamina: GAME_TUNING.startingStamina, mana: GAME_TUNING.startingMana });
  return campaign;
}

const blobFrames = Object.freeze([3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
export function wallFrameAt(floor, x, y) { const wall = (tx, ty) => !isWalkable(floor, tx, ty); const mask = Number(wall(x, y - 1)) | (Number(wall(x + 1, y)) << 1) | (Number(wall(x, y + 1)) << 2) | (Number(wall(x - 1, y)) << 3); return blobFrames[mask]; }

function tick(state, events) { const previous = state.floor.time; state.floor.time++; emit(events, "time.advanced", { previous, current: state.floor.time }, state); enemyPhase(state, events); }
function normalizeResources(state, events, cause, previousCaps) { const caps = effectiveAttributes(state); for (const key of ["health", "stamina", "mana"]) { const prior = state.player.resources[key].current; const oldMax = previousCaps[key]; const ratio = oldMax > 0 ? prior / oldMax : 0; const next = Math.max(0, Math.min(caps[key], ratio * caps[key])); state.player.resources[key] = { current: next, currentMax: caps[key] }; if (prior !== next) emit(events, "resource.changed", { resource: key, previous: prior, current: next, previousMax: oldMax, currentMax: caps[key], cause }, state); } state.player.resources = playerResourcesFromCampaign(state, state.player.resources); }
function changeResource(state, events, key, value, cause) { const cap = effectiveAttributes(state)[key]; const previous = state.player.resources[key].current; const current = Math.max(0, Math.min(cap, value)); state.player.resources[key] = { current, currentMax: cap }; state.player.resources = playerResourcesFromCampaign(state, state.player.resources); if (current !== previous) emit(events, "resource.changed", { resource: key, previous, current, currentMax: cap, cause, ...(key === "health" ? { position: { x: state.player.x, y: state.player.y } } : {}) }, state); }
function gainXp(state, events, amount, cause) {
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
function integerDamage(amount) { return Math.max(0, Math.round(amount)); }
function enemyPhase(state, events) {
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
      if (isWalkable(state.floor, tx, ty) && !entityAt(state.floor.entities.filter((entry) => entry !== enemy), tx, ty)) { enemy.x = tx; enemy.y = ty; }
    }
  }
  if (state.player.resources.health.current <= 0) { const reset = freshRunAfterDeath(state); Object.assign(state, reset); emit(events, "player.died", { realm: "Underground 1" }, state); }
}
function freshRunAfterDeath(state) { const difficulty = state.progression.difficulty ?? state.floor.level ?? state.floor.depth ?? 1; const campaign = createCampaign(seedNow(), difficulty, 1); campaign.progression = structuredClone(state.progression); campaign.progression.difficulty = difficulty; campaign.player.abilities = state.player.abilities.slice(0, 3); campaign.player.resources = playerResourcesFromCampaign(campaign, campaign.player.resources); return campaign; }
function orderedInventory(inventory) { return [...inventory].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)); }
function attack(state, events, enemy) { const offense = Math.max(1, integerDamage(resourceState(state).offense.current)); const health = enemy.resources.health; const before = health.current; health.current = Math.max(0, health.current - offense); enemy.hp = health.current; emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage: offense, previousHealth: before, currentHealth: health.current }, state); changeResource(state, events, "stamina", state.player.resources.stamina.current - ATTACK_STAMINA_COST, "attack"); gainXp(state, events, GAME_TUNING.xpPerAttack, "attack"); if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== enemy.id); state.progression.totalKills++; gainXp(state, events, enemy.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: enemy.name, xp: enemy.resources.xp.current }, state); } }

export function applyAction(campaign, action) {
  const state = upgradeCampaignResources(structuredClone(campaign)); const events = []; const reject = (reason) => ({ state: campaign, events: [{ type: "action.rejected", facts: { reason }, gameTime: campaign.floor.time, sequence: 1 }], accepted: false, ticks: 0 });
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
  if (action.type === "move") {
    const direction = directions[action.direction]; if (!direction) return reject("invalid-direction"); const [dx, dy] = direction; const x = state.player.x + dx; const y = state.player.y + dy; const entity = entityAt(state.floor.entities, x, y);
    if (!isWalkable(state.floor, x, y) && !entity) return reject("blocked");
    if (entity?.kind === "enemy") attack(state, events, entity); else {
      state.player.x = x; state.player.y = y; emit(events, "player.moved", { from: { x: campaign.player.x, y: campaign.player.y }, to: { x, y } }, state);
      if (entity?.kind === "stairs") { const level = (state.floor.level ?? state.floor.depth ?? 1) + 1; const difficulty = (state.progression.difficulty ?? state.floor.depth ?? 1) + 1; const time = state.floor.time; state.progression.difficulty = difficulty; state.floor = generateFloor(level, seedNow(), difficulty); state.floor.time = time; state.realm = `Underground ${level}`; state.player.x = state.floor.start.x; state.player.y = state.floor.start.y; emit(events, "realm.entered", { realm: state.realm, level }, state); }
      else if (entity?.kind === "potion") { const cap = effectiveAttributes(state)[entity.resource]; if (state.player.resources[entity.resource].current < cap) { const previous = state.player.resources[entity.resource].current; const restored = entity.resource === "health" ? GAME_TUNING.healthPotionRestore : GAME_TUNING.manaPotionRestore; changeResource(state, events, entity.resource, previous + restored, "potion"); const current = state.player.resources[entity.resource].current; state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "potion.consumed", { itemId: entity.id, item: entity.name ?? `${entity.resource} potion`, resource: entity.resource, previous, current }, state); } }
      else if (entity?.kind === "item") { if (state.player.inventory.length < state.player.inventoryCapacity) { state.player.inventory = orderedInventory([...state.player.inventory, entity.item]); state.floor.entities = state.floor.entities.filter((entry) => entry.id !== entity.id); emit(events, "item.collected", { itemId: entity.item.id, name: entity.item.name, destination: "inventory" }, state); } else emit(events, "item.collection.rejected", { itemId: entity.item.id, name: entity.item.name, reason: "inventory-full" }, state); }
      else if (entity?.kind === "chest" && !entity.opened) { entity.opened = true; const item = itemInstance(itemCatalog[(state.floor.time + lootTier(state)) % itemCatalog.length], `chest-item-${state.floor.time}`); entity.kind = "item"; entity.item = item; delete entity.opened; emit(events, "chest.opened", { item: item.name, lootTier: lootTier(state) }, state); }
      changeResource(state, events, "stamina", state.player.resources.stamina.current + recoveryAmount(state), "move");
    }
    tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  if (action.type === "ability") { if (!Number.isInteger(action.index) || action.index < 0 || action.index >= 3) return reject("invalid-ability-slot"); const abilityId = state.player.abilities[action.index]; const ability = abilityCatalog[abilityId]; if (!ability) return reject("empty-ability"); if (state.player.resources.mana.current < ability.manaCost) return reject("insufficient-mana"); const enemy = ability.kind === "wand" ? [...state.floor.entities.filter((entry) => entry.kind === "enemy" && Math.abs(entry.x - state.player.x) + Math.abs(entry.y - state.player.y) <= ability.range)].sort((a, b) => Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) - Math.abs(b.x - state.player.x) - Math.abs(b.y - state.player.y) || a.id.localeCompare(b.id))[0] : null; if (ability.kind === "wand" && !enemy) return reject("no-valid-target"); changeResource(state, events, "mana", state.player.resources.mana.current - ability.manaCost, "ability"); if (ability.kind === "heal") changeResource(state, events, "health", state.player.resources.health.current + ability.amount, "heal"); else { const health = enemy.resources.health; const damage = integerDamage(ability.damage); const previousHealth = health.current; health.current = Math.max(0, health.current - damage); enemy.hp = health.current; emit(events, "combat.hit", { target: enemy.name, targetId: enemy.id, targetPosition: { x: enemy.x, y: enemy.y }, damage, previousHealth, currentHealth: health.current, source: ability.id }, state); if (health.current <= 0) { state.floor.entities = state.floor.entities.filter((entry) => entry.id !== enemy.id); gainXp(state, events, enemy.resources.xp.current, "kill"); emit(events, "enemy.defeated", { name: enemy.name, xp: enemy.resources.xp.current }, state); } } emit(events, "ability.used", { id: ability.id, title: ability.title, manaCost: ability.manaCost, target: ability.target }, state); tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "assign-ability") { const { from, to } = action; if (![from, to].every((index) => Number.isInteger(index) && index >= 0 && index < 3) || from === to) return reject("invalid-ability-slot"); [state.player.abilities[from], state.player.abilities[to]] = [state.player.abilities[to], state.player.abilities[from]]; emit(events, "ability.assignment.changed", { from, to }, state); tick(state, events); return { state, events, accepted: true, ticks: 1 }; }
  if (action.type === "equip" || action.type === "unequip" || action.type === "reorder-equipment") { const { group, index } = action; if (!state.player.equipment[group] || !Number.isInteger(index) || index < 0 || index > 1) return reject("invalid-slot"); const previousCaps = effectiveAttributes(state);
    if (action.type === "equip") { const itemIndex = state.player.inventory.findIndex((item) => item.id === action.itemId); const item = state.player.inventory[itemIndex]; if (!item || item.group !== group || state.player.equipment[group][index]) return reject("invalid-equipment-drop"); state.player.inventory.splice(itemIndex, 1); state.player.equipment[group][index] = item; emit(events, "equipment.changed", { action: "enabled", itemId: item.id, item: item.name, source: "inventory", destination: { group, index }, group, index }, state); }
    else if (action.type === "unequip") { const item = state.player.equipment[group][index]; if (!item || state.player.inventory.length >= state.player.inventoryCapacity) return reject("cannot-unequip"); state.player.equipment[group][index] = null; state.player.inventory = orderedInventory([...state.player.inventory, item]); emit(events, "equipment.changed", { action: "returned to inventory", itemId: item.id, item: item.name, source: { group, index }, destination: "inventory", group, index }, state); }
    else { const other = action.other; if (!Number.isInteger(other) || other < 0 || other > 1 || other === index) return reject("invalid-equipment-slot"); [state.player.equipment[group][index], state.player.equipment[group][other]] = [state.player.equipment[group][other], state.player.equipment[group][index]]; emit(events, "equipment.changed", { action: "reordered", group, index, other, source: { group, index }, destination: { group, index: other } }, state); }
    normalizeResources(state, events, "equipment", previousCaps); tick(state, events); return { state, events, accepted: true, ticks: 1 };
  }
  return reject("unknown-action");
}

export function resolveTurn(state, direction) { return applyAction(state, { type: "move", direction }).state; }
export function previewEquipment(campaign, item, group, index, mode = "equip") { const projected = structuredClone(campaign); if (mode === "equip" && projected.player.equipment[group]?.[index] === null) projected.player.equipment[group][index] = item; if (mode === "unequip") projected.player.equipment[group][index] = null; return effectiveAttributes(projected); }
export function createGameSession(initial, { onCommit } = {}) {
  let state = initial; let transactionSequence = 0; let eventSequence = 0; let dispatching = false;
  const listeners = new Set(); const queue = [];
  const session = {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    publish(type, facts = {}) {
      const event = { type, facts, eventId: `event-${++eventSequence}`, transactionId: null, gameTime: state.floor.time, sequence: 1, outcome: "system" };
      const result = { state, events: [event], accepted: false, ticks: 0, system: true };
      for (const listener of [...listeners]) listener(result);
      state = result.state;
      return event;
    },
    dispatch(action) {
      const request = { action, result: null }; queue.push(request);
      if (dispatching) return { queued: true, accepted: false, ticks: 0, events: [] };
      dispatching = true;
      try {
        while (queue.length) {
          const current = queue.shift(); const result = applyAction(state, current.action);
          result.transactionId = `tx-${++transactionSequence}`;
          result.events = result.events.map((event, index) => ({ ...event, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, sequence: index + 1, outcome: result.accepted ? "committed" : "rejected" }));
          if (result.accepted) {
            const committed = { type: "action.committed", facts: { transactionId: result.transactionId, actionType: current.action.type, ticks: result.ticks }, transactionId: result.transactionId, eventId: `event-${++eventSequence}`, gameTime: result.state.floor.time, sequence: result.events.length + 1, outcome: "committed" };
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
