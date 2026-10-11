import { createCampaign, effectiveAttributes, FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION, isResourcesModel, upgradeCampaignResources } from "../procedural-generation/procedural-generation-system.js";
import { gameZoomPresets } from "../../content/world/zoom.js";
import { createSemanticCells, ensureSemanticCells, semanticCellsFromMap } from "../procedural-generation/level-grid.js";

const PREFIX = "rogues-dungeon.slot.";
const BACKUP_PREFIX = "rogues-dungeon.slot.v1-backup.";
const PREFERENCE_KEY = "rogues-dungeon.preferences.v1";
export const SLOT_IDS = Object.freeze(["1", "2", "3"]);
export const DEFAULT_PREFERENCES = Object.freeze({ zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 80, musicVolume: 20, muteAll: false });
const DEFAULT_ABILITIES = Object.freeze(["heal", "wand", null]);

function normalizeAbilityBindings(value) {
  return Array.isArray(value?.player?.abilities) ? value.player.abilities.slice(0, 3) : [...DEFAULT_ABILITIES];
}

export function isValidCampaign(value) { return value?.version === 3 && value.progression?.attributes && (value.floor?.cells || value.floor?.map) && value.player?.equipment && Array.isArray(value.player.inventory); }
function isV2Campaign(value) { return value?.version === 2 && value.progression?.attributes && (value.floor?.cells || value.floor?.map) && value.player?.equipment && Array.isArray(value.player.inventory); }
function validV1(value) { return value?.version === 1 && value.progression?.stats && value.floor?.map && value.player?.equipment; }
function oldItem(item, id) {
  const group = /head|body|leg/i.test(item?.slot ?? "") ? "armor" : "weapons";
  return { id, name: item?.name ?? "Recovered item", group, modifiers: group === "armor" ? { defense: item?.defense ?? 0 } : { offense: item?.attack ?? 0, defense: item?.defense ?? 0 } };
}
function legacyEquipmentItems(equipment = {}) {
  const seen = new Set();
  return Object.values(equipment).flatMap((item, index) => {
    if (!item) return [];
    // Legacy state could reference the same item in both a slot and a pending
    // choice. Preserve the first occurrence only so migration never clones it.
    const identity = item.id ?? `${item.name ?? "item"}:${item.slot ?? index}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [oldItem(item, `legacy-${identity}`)];
  });
}
function expandUndersizedFloor(campaign) {
  ensureSemanticCells(campaign.floor);
  const source = campaign.floor.cells;
  const sourceHeight = source.length;
  const sourceWidth = source[0]?.length ?? 0;
  if (sourceWidth >= FLOOR_WIDTH && sourceHeight >= FLOOR_HEIGHT) return false;
  const offsetX = Math.max(0, Math.floor((FLOOR_WIDTH - sourceWidth) / 2));
  const offsetY = Math.max(0, Math.floor((FLOOR_HEIGHT - sourceHeight) / 2));
  const cells = createSemanticCells(FLOOR_WIDTH, FLOOR_HEIGHT);
  for (let y = 0; y < sourceHeight; y++) for (let x = 0; x < sourceWidth; x++) cells[y + offsetY][x + offsetX] = structuredClone(source[y][x]);
  const shift = (position) => position && { ...position, x: position.x + offsetX, y: position.y + offsetY };
  const { map, ...floorWithoutLegacyMap } = campaign.floor;
  campaign.floor = { ...floorWithoutLegacyMap, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells, start: shift(campaign.floor.start), entities: (campaign.floor.entities ?? []).map(shift) };
  ensureSemanticCells(campaign.floor);
  campaign.player = shift(campaign.player);
  return true;
}
function resourceFraction(resources, attributes, name) {
  const current = Number(resources?.[name]?.current ?? resources?.[name] ?? attributes?.[name] ?? 0);
  const maximum = Number(resources?.[name]?.currentMax ?? attributes?.[name] ?? 0);
  return maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
}
function currentAttributesFromLegacy(attributes = {}) {
  return {
    vitality: Math.max(0, Number(attributes.vitality ?? 0)), strength: Math.max(0, Number(attributes.strength ?? 0)),
    luck: Math.max(0, Number(attributes.luck ?? 0)), recovery: Math.max(0, Number(attributes.recovery ?? 0)),
    stealth: Math.max(0, Number(attributes.stealth ?? attributes.agility ?? 0)),
  };
}
function rebuildBalanceProfile(campaign, legacyAttributes, legacyResources) {
  const fresh = createCampaign(campaign.floor.seed, campaign.progression.difficulty ?? campaign.floor.level ?? 1);
  campaign.progression.attributes = { ...fresh.progression.attributes, ...currentAttributesFromLegacy(legacyAttributes) };
  const caps = effectiveAttributes(campaign);
  campaign.player.resources = Object.fromEntries(["health", "stamina", "mana"].map((name) => [name, { current: caps[name] * resourceFraction(legacyResources, legacyAttributes, name), currentMax: caps[name] }]));
}
export function migrateCampaign(value) {
  if (isValidCampaign(value) || isV2Campaign(value)) {
    const level = Number.isInteger(value.floor.level) ? value.floor.level : Number.isInteger(value.floor.depth) ? value.floor.depth : 1;
    const difficulty = Number.isInteger(value.progression.difficulty) ? value.progression.difficulty : level;
    const needsResourceMigration = !isResourcesModel(value.player.resources) || (value.floor.entities ?? []).some((entity) => entity.kind === "enemy" && !isResourcesModel(entity.resources));
    const needsSemanticMigration = !Array.isArray(value.floor.cells);
    const sourceCells = value.floor.cells ?? semanticCellsFromMap(value.floor.map);
    const needsFloorMigration = sourceCells.length < FLOOR_HEIGHT || (sourceCells[0]?.length ?? 0) < FLOOR_WIDTH;
    const needsBalanceMigration = value.version !== 3 || !Object.hasOwn(value.progression.attributes, "stealth") || !Array.isArray(value.progression.pendingUpgrades) || (value.floor.entities ?? []).some((entity) => entity.kind === "enemy" && (!Number.isFinite(entity.actionCooldown) || !Number.isFinite(entity.nextActionAt)));
    const needsAbilityMigration = !Array.isArray(value.player.abilities) || value.player.abilities.length !== 3;
    if (value.floor.level === level && value.progression.difficulty === difficulty && !needsSemanticMigration && !needsResourceMigration && !needsFloorMigration && !needsBalanceMigration && !needsAbilityMigration) return upgradeCampaignResources(value);
    const next = { ...structuredClone(value), version: 3, floor: { ...structuredClone(value.floor), level }, progression: { ...structuredClone(value.progression), difficulty, pendingUpgrades: structuredClone(value.progression.pendingUpgrades ?? []) }, player: { ...structuredClone(value.player), abilities: normalizeAbilityBindings(value) }, realm: value.realm ?? `Underground ${level}` };
    ensureSemanticCells(next.floor);
    expandUndersizedFloor(next);
    if (needsBalanceMigration) rebuildBalanceProfile(next, value.progression.attributes, value.player.resources);
    return upgradeCampaignResources(next);
  }
  if (!validV1(value)) throw new Error("This save is invalid or from an unsupported version.");
  const level = Number.isInteger(value.floor.level) ? value.floor.level : Number.isInteger(value.floor.depth) ? value.floor.depth : 1;
  const difficulty = Number.isInteger(value.progression.difficulty) ? value.progression.difficulty : level;
  const next = createCampaign(value.floor.seed, difficulty, level);
  next.floor = structuredClone(value.floor);
  ensureSemanticCells(next.floor);
  next.floor.generatorVersion = GENERATOR_VERSION;
  next.floor.level = level;
  next.floor.time = Number.isFinite(value.floor.time) ? value.floor.time : Number.isFinite(value.time) ? value.time : 0;
  next.world = value.world ?? "One"; next.realm = value.realm ?? `Underground ${level}`;
  next.player.x = value.player.x; next.player.y = value.player.y;
  const stats = value.progression.stats;
  const oldHealth = stats.health ?? stats.vitality ?? value.player.maxHp ?? 25;
  const oldStamina = stats.stamina ?? 25;
  next.progression = { attributes: { ...next.progression.attributes, ...currentAttributesFromLegacy(stats) }, level: value.progression.level ?? 1, xp: value.progression.xp ?? 0, nextXp: 100, totalKills: value.progression.totalKills ?? 0, difficulty: level, pendingUpgrades: [] };
  next.player.resources = { health: value.player.resources?.health ?? value.player.hp ?? oldHealth, stamina: value.player.resources?.stamina ?? oldStamina, mana: value.player.resources?.mana ?? 20 };
  const legacy = legacyEquipmentItems(value.player.equipment);
  const armor = legacy.filter((item) => item.group === "armor"); const weapons = legacy.filter((item) => item.group === "weapons");
  next.player.equipment = { weapons: [weapons.shift() ?? null, weapons.shift() ?? null], armor: [armor.shift() ?? null, armor.shift() ?? null] };
  next.player.inventory = [...weapons, ...armor].sort((a, b) => a.name.localeCompare(b.name));
  next.player.sneaking = Boolean(value.player.sneaking ?? value.pending?.sneaking ?? false);
  next.counters = { ...next.counters, ...(value.counters ?? {}) };
  next.objective = value.objective ?? next.objective;
  next.log = [];
  expandUndersizedFloor(next);
  rebuildBalanceProfile(next, stats, value.player.resources);
  return upgradeCampaignResources(next);
}
export function readSlot(storage, slot) {
  if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game.");
  const raw = storage.getItem(PREFIX + slot); if (!raw) return null;
  const original = JSON.parse(raw); const campaign = migrateCampaign(original);
  if (original.version === 3 && campaign?.floor?.generatorVersion !== GENERATOR_VERSION) {
    storage.removeItem(PREFIX + slot);
    return null;
  }
  if (campaign !== original) {
    // Write the rollback copy first, then replace the primary record. If either
    // storage operation fails, the original slot data remains recoverable.
    if (original.version === 1) storage.setItem(BACKUP_PREFIX + slot, raw);
    storage.setItem(PREFIX + slot, JSON.stringify({ ...campaign, savedAt: Date.now() }));
  }
  return campaign;
}
export function writeSlot(storage, slot, campaign) {
  if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game.");
  if (!isValidCampaign(campaign)) throw new Error("Cannot save an invalid campaign.");
  ensureSemanticCells(campaign.floor);
  storage.setItem(PREFIX + slot, JSON.stringify({ ...campaign, player: { ...campaign.player, abilities: normalizeAbilityBindings(campaign) }, savedAt: Date.now() }));
}
export function deleteSlot(storage, slot) { if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game."); storage.removeItem(PREFIX + slot); }
export function clearRoguesDungeonStorage(storage) {
  const keys = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key === PREFERENCE_KEY || key?.startsWith(PREFIX) || key?.startsWith(BACKUP_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}
export function readSlotSummary(storage) { return SLOT_IDS.map((slot) => { try { const state = readSlot(storage, slot); return { slot, occupied: Boolean(state), level: state?.floor.level ?? state?.floor.depth ?? null, xpLevel: state?.progression.level ?? null }; } catch (error) { return { slot, occupied: true, invalid: true, error: error.message }; } }); }
function normalizeVolume(value, fallback) { return Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback; }
export function normalizePreferences(value) { return { zoom: gameZoomPresets.includes(value?.zoom) ? value.zoom : DEFAULT_PREFERENCES.zoom, camera: ["center", "deadzone", "screen"].includes(value?.camera) ? value.camera : DEFAULT_PREFERENCES.camera, fullscreenDesired: value?.fullscreenDesired === true, sfxVolume: normalizeVolume(value?.sfxVolume, DEFAULT_PREFERENCES.sfxVolume), musicVolume: normalizeVolume(value?.musicVolume, DEFAULT_PREFERENCES.musicVolume), muteAll: value?.muteAll === true }; }
export function readPreferences(storage) { try { return normalizePreferences(JSON.parse(storage.getItem(PREFERENCE_KEY) ?? "null")); } catch { return { ...DEFAULT_PREFERENCES }; } }
export function writePreferences(storage, value) { const normalized = normalizePreferences(value); storage.setItem(PREFERENCE_KEY, JSON.stringify(normalized)); return normalized; }
