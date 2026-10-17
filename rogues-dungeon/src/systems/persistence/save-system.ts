import type { AbilityId, Attributes, Campaign, Floor, Item, Position, Preferences, ResourceInput, ResourceName, StorageAccess, StorageCollection } from "../../game/types.ts";
interface LegacyItem { id?: string; name?: string; slot?: string; defense?: number; attack?: number }
type LegacyAttributes = Partial<Attributes> & { agility?: number };
interface LegacyCampaign extends Omit<Campaign, "player" | "progression"> {
  time?: number; pending?: { sneaking?: boolean };
  player: Position & { hp?: number; maxHp?: number; resources?: ResourceInput; equipment: Record<string, LegacyItem | null>; sneaking?: boolean };
  progression: { stats: LegacyAttributes; difficulty?: number; level?: number; xp?: number; totalKills?: number };
}
// Preserve the existing shallow save guards; normalization owns legacy fields.
function candidate(value: unknown): Partial<Campaign> | null { return typeof value === "object" && value !== null ? value as Partial<Campaign> : null; }
import { compactCampaignForSave, createCampaign, createResourcesModel, createRunCampaign, effectiveAttributes, ensureNearbyStairs, FLOOR_HEIGHT, FLOOR_WIDTH, GENERATOR_VERSION, isResourcesModel, normalizeQuickSlots, normalizeStackableLocations, restoreCompactCampaign, upgradeCampaignResources } from "../procedural/world-procedural-system.ts";
import { gameZoomPresets } from "../../content/world/zoom.ts";
import { createSemanticCells, ensureSemanticCells, semanticCellsFromMap } from "../procedural/level-grid-system.ts";
import { normalizeQuest } from "../quests/quest-progression-system.ts";

const PREFIX = "rogues-dungeon.slot.";
const BACKUP_PREFIX = "rogues-dungeon.slot.v1-backup.";
const PREFERENCE_KEY = "rogues-dungeon.preferences.v1";
const WORLD_SEED_KEY = "rogues-dungeon.world-seed.v1";
export const SLOT_IDS = Object.freeze(["1", "2", "3"]);
export const DEFAULT_PREFERENCES: Readonly<Preferences> = Object.freeze({ zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
const DEFAULT_ABILITIES: readonly (AbilityId | null)[] = Object.freeze(["heal", "wand", null]);

function normalizeAbilityBindings(value: { player?: { abilities?: (AbilityId | null)[] } }) {
  return Array.isArray(value?.player?.abilities) ? value.player.abilities.slice(0, 3) : [...DEFAULT_ABILITIES];
}
function validWorldSeed(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff; }
function legacyWorldSeed(storage: StorageAccess) {
  for (const slot of SLOT_IDS) {
    try {
      const saved = JSON.parse(storage.getItem(PREFIX + slot) ?? "null") as { floor?: { seed?: unknown } } | null;
      if (validWorldSeed(saved?.floor?.seed)) return Number(saved!.floor!.seed);
    } catch { /* Invalid saves do not supply a migration seed. */ }
  }
  return null;
}
export function readWorldSeed(storage: StorageAccess, fallback: number | null = null) {
  const raw = storage.getItem(WORLD_SEED_KEY);
  if (raw !== null && /^(0|[1-9]\d*)$/.test(raw)) {
    const value = Number(raw);
    if (Number.isSafeInteger(value) && value <= 0xffffffff) return value;
  }
  const seed = fallback ?? Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
  storage.setItem(WORLD_SEED_KEY, String(seed));
  return seed;
}

export function isValidCampaign(input: unknown): input is Campaign { const value = candidate(input); return Boolean(value?.version === 5 && value.progression?.attributes && value.floor && value.player?.equipment && Array.isArray(value.player.inventory)); }
function isV2Campaign(input: unknown): input is Campaign { const value = candidate(input); return Boolean((value?.version === 2 || value?.version === 3 || value?.version === 4) && value.progression?.attributes && (value.floor?.cells || value.floor?.map) && value.player?.equipment && Array.isArray(value.player.inventory)); }
function validV1(input: unknown): input is LegacyCampaign { const value = candidate(input) as Partial<LegacyCampaign> | null; return Boolean(value?.version === 1 && value.progression?.stats && value.floor?.map && value.player?.equipment); }
function oldItem(item: LegacyItem, id: string): Item {
  const group = /head|body|leg/i.test(item?.slot ?? "") ? "armor" : "weapons";
  return { id, name: item?.name ?? "Recovered item", group, modifiers: group === "armor" ? { defense: item?.defense ?? 0 } : { offense: item?.attack ?? 0, defense: item?.defense ?? 0 } };
}
function legacyEquipmentItems(equipment: Record<string, LegacyItem | null> = {}) {
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
function expandUndersizedFloor(campaign: Campaign) {
  ensureSemanticCells(campaign.floor);
  const source = campaign.floor.cells;
  const sourceHeight = source.length;
  const sourceWidth = source[0]?.length ?? 0;
  if (sourceWidth >= FLOOR_WIDTH && sourceHeight >= FLOOR_HEIGHT) return false;
  const offsetX = Math.max(0, Math.floor((FLOOR_WIDTH - sourceWidth) / 2));
  const offsetY = Math.max(0, Math.floor((FLOOR_HEIGHT - sourceHeight) / 2));
  const cells = createSemanticCells(FLOOR_WIDTH, FLOOR_HEIGHT);
  for (let y = 0; y < sourceHeight; y++) for (let x = 0; x < sourceWidth; x++) cells[y + offsetY][x + offsetX] = structuredClone(source[y][x]);
  const shift = <T extends Position>(position: T): T => position && { ...position, x: position.x + offsetX, y: position.y + offsetY };
  const { map, ...floorWithoutLegacyMap } = campaign.floor;
  campaign.floor = { ...floorWithoutLegacyMap, width: FLOOR_WIDTH, height: FLOOR_HEIGHT, cells, start: shift(campaign.floor.start), entities: (campaign.floor.entities ?? []).map(shift) };
  ensureSemanticCells(campaign.floor);
  campaign.player = shift(campaign.player);
  return true;
}
function resourceFraction(resources: ResourceInput | undefined, attributes: LegacyAttributes | undefined, name: "health" | "stamina" | "mana") {
  const resource = resources?.[name]; const current = Number((resource != null && typeof resource === "object" ? resource.current : resource) ?? attributes?.[name] ?? 0);
  const maximum = Number((resource != null && typeof resource === "object" ? resource.currentMax : undefined) ?? attributes?.[name] ?? 0);
  return maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
}
function currentAttributesFromLegacy(attributes: LegacyAttributes = {}) {
  return {
    health: Math.max(1, Number(attributes.health ?? 1)), stamina: Math.max(1, Number(attributes.stamina ?? 1)),
    offense: Math.max(1, Number(attributes.offense ?? 1)), defense: Math.max(1, Number(attributes.defense ?? 1)), mana: Math.max(1, Number(attributes.mana ?? 1)),
    vitality: Math.max(0, Number(attributes.vitality ?? 0)), strength: Math.max(0, Number(attributes.strength ?? 0)),
    luck: Math.max(0, Number(attributes.luck ?? 0)), recovery: Math.max(0, Number(attributes.recovery ?? 0)),
    stealth: Math.max(1, Number(attributes.stealth ?? attributes.agility ?? 1)),
  };
}
function rebuildBalanceProfile(campaign: Campaign, legacyAttributes: LegacyAttributes, legacyResources: ResourceInput | undefined) {
  const fresh = createCampaign(campaign.floor.seed, campaign.progression.difficulty ?? campaign.floor.level ?? 1);
  campaign.progression.attributes = { ...fresh.progression.attributes, ...currentAttributesFromLegacy(legacyAttributes) };
  const caps = effectiveAttributes(campaign);
  campaign.player.resources = createResourcesModel(Object.fromEntries((["health", "stamina", "mana"] as const).map((name) => [name, { current: caps[name] * resourceFraction(legacyResources, legacyAttributes, name), currentMax: caps[name] }])));
}
export function migrateCampaign(value: unknown): Campaign {
  if (isValidCampaign(value)) {
    const campaign = structuredClone(value);
    if (!Array.isArray(campaign.floor.cells) || campaign.floor.cells.length === 0) return restoreCompactCampaign(campaign);
    if (campaign.floor.cells.length !== FLOOR_HEIGHT || (campaign.floor.cells[0]?.length ?? 0) !== FLOOR_WIDTH) expandUndersizedFloor(campaign);
    campaign.player.abilities = normalizeAbilityBindings(campaign);
    campaign.quest = normalizeQuest(campaign.quest);
    return upgradeCampaignResources(campaign);
  }
  if (isV2Campaign(value)) {
    const level = Number.isInteger(value.floor.level) ? value.floor.level : Number.isInteger(value.floor.depth) ? value.floor.depth! : 1;
    const difficulty = Number.isInteger(value.progression.difficulty) ? value.progression.difficulty : level;
    const needsResourceMigration = !isResourcesModel(value.player.resources) || (value.floor.entities ?? []).some((entity) => entity.kind === "enemy" && !isResourcesModel(entity.resources));
    const needsSemanticMigration = !Array.isArray(value.floor.cells);
    const sourceCells = value.floor.cells ?? semanticCellsFromMap(value.floor.map ?? []);
    const needsFloorMigration = sourceCells.length < FLOOR_HEIGHT || (sourceCells[0]?.length ?? 0) < FLOOR_WIDTH;
    const needsBalanceMigration = value.version !== 5 || !Object.hasOwn(value.progression.attributes, "stealth") || !Number.isFinite(value.progression.attributePoints) || (value.floor.entities ?? []).some((entity) => entity.kind === "enemy" && (!Number.isFinite(entity.actionCooldown) || !Number.isFinite(entity.nextActionAt)));
    const needsAbilityMigration = !Array.isArray(value.player.abilities) || value.player.abilities.length !== 3;
    const needsQuestMigration = !value.quest;
    if (value.floor.level === level && value.progression.difficulty === difficulty && !needsSemanticMigration && !needsResourceMigration && !needsFloorMigration && !needsBalanceMigration && !needsAbilityMigration && !needsQuestMigration) { value.quest = normalizeQuest(value.quest); return upgradeCampaignResources(value); }
    const next = { ...structuredClone(value), version: 5, floor: { ...structuredClone(value.floor), level }, progression: { ...structuredClone(value.progression), difficulty, attributePoints: Math.max(0, Number(value.progression.attributePoints ?? 0)) }, player: { ...structuredClone(value.player), abilities: normalizeAbilityBindings(value) }, realm: value.realm ?? `Underground ${level}`, quest: normalizeQuest(value.quest) };
    ensureSemanticCells(next.floor);
    expandUndersizedFloor(next);
    if (needsBalanceMigration) rebuildBalanceProfile(next, value.progression.attributes, value.player.resources);
    return upgradeCampaignResources(next);
  }
  if (!validV1(value)) throw new Error("This save is invalid or from an unsupported version.");
  const level = Number.isInteger(value.floor.level) ? value.floor.level : Number.isInteger(value.floor.depth) ? value.floor.depth! : 1;
  const difficulty = Number.isInteger(value.progression.difficulty) ? value.progression.difficulty : level;
  const next = createCampaign(value.floor.seed, difficulty, level);
  next.floor = ensureSemanticCells(structuredClone(value.floor));
  ensureSemanticCells(next.floor);
  next.floor.generatorVersion = GENERATOR_VERSION;
  next.floor.level = level;
  next.floor.time = Number.isFinite(value.floor.time) ? value.floor.time : Number.isFinite(value.time) ? value.time! : 0;
  next.world = value.world ?? "One"; next.realm = value.realm ?? `Underground ${level}`;
  next.player.x = value.player.x; next.player.y = value.player.y;
  const stats = value.progression.stats;
  const oldHealth = stats.health ?? stats.vitality ?? value.player.maxHp ?? 25;
  const oldStamina = stats.stamina ?? 25;
  next.progression = { attributes: { ...next.progression.attributes, ...currentAttributesFromLegacy(stats) }, level: value.progression.level ?? 1, xp: value.progression.xp ?? 0, nextXp: 100, totalKills: value.progression.totalKills ?? 0, difficulty: level, attributePoints: 0 };
  const legacyResources: ResourceInput = { health: value.player.resources?.health ?? value.player.hp ?? oldHealth, stamina: value.player.resources?.stamina ?? oldStamina, mana: value.player.resources?.mana ?? 20 }; next.player.resources = createResourcesModel(Object.fromEntries(Object.entries(legacyResources).map(([name, value]) => [name, typeof value === "number" ? { current: value } : value])));
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
  next.quest = normalizeQuest(next.quest);
  return upgradeCampaignResources(next);
}
export function readSlot(storage: StorageAccess, slot: string | number) {
  if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game.");
  const raw = storage.getItem(PREFIX + slot); if (!raw) return null;
  const original: unknown = JSON.parse(raw); const originalVersion = candidate(original)?.version;
  if (originalVersion !== 5) {
    const legacy = migrateCampaign(original);
    const worldSeed = readWorldSeed(storage, legacyWorldSeed(storage));
    const campaign = createRunCampaign(worldSeed, Number(slot), 1, legacy.progression.difficulty ?? 1, 1, { attributes: structuredClone(legacy.progression.attributes) });
    campaign.progression = structuredClone(legacy.progression);
    campaign.player.abilities = legacy.player.abilities.slice(0, 3);
    campaign.quest = normalizeQuest(legacy.quest);
    storage.setItem(BACKUP_PREFIX + slot, raw);
    writeSlot(storage, slot, campaign);
    return campaign;
  }
  const campaign = migrateCampaign(original);
  if (campaign?.floor?.generatorVersion === GENERATOR_VERSION) ensureNearbyStairs(campaign.floor);
  return campaign;
}
export function writeSlot(storage: StorageAccess, slot: string | number, campaign: Campaign) {
  if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game.");
  if (!isValidCampaign(campaign)) throw new Error("Cannot save an invalid campaign.");
  ensureSemanticCells(campaign.floor);
  normalizeQuickSlots(campaign);
  normalizeStackableLocations(campaign);
  campaign.quest = normalizeQuest(campaign.quest);
  campaign.slot = Number(slot);
  campaign.run = Number.isInteger(campaign.run) && campaign.run! > 0 ? campaign.run : 1;
  campaign.worldSeed = Number.isInteger(campaign.worldSeed) && campaign.worldSeed! >= 0 ? campaign.worldSeed : campaign.floor.seed;
  const compact = compactCampaignForSave(campaign);
  storage.setItem(PREFIX + slot, JSON.stringify({ ...compact, player: { ...compact.player, abilities: normalizeAbilityBindings(compact), quickSlots: compact.player.quickSlots }, savedAt: Date.now() }));
}
export function deleteSlot(storage: StorageAccess, slot: string | number) { if (!SLOT_IDS.includes(String(slot))) throw new Error("Unknown Saved Game."); storage.removeItem(PREFIX + slot); }
export function clearRoguesDungeonStorage(storage: StorageCollection) {
  const keys = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key === WORLD_SEED_KEY || key === PREFERENCE_KEY || key?.startsWith(PREFIX) || key?.startsWith(BACKUP_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}
export function formatSavedAgo(savedAt: number | undefined, now = Date.now()) {
  const elapsed = Math.max(0, now - (Number.isFinite(savedAt) ? savedAt! : now));
  const rounded = (unit: number) => Math.max(1, Math.round(elapsed / unit));
  if (elapsed < 60_000) return `${rounded(1_000)} secs ago`;
  if (elapsed < 3_600_000) return `${rounded(60_000)} mins ago`;
  if (elapsed < 86_400_000) return `${rounded(3_600_000)} hours ago`;
  if (elapsed < 7 * 86_400_000) return `${rounded(86_400_000)} days ago`;
  if (elapsed < 365 * 86_400_000) return `${rounded(7 * 86_400_000)} weeks ago`;
  return `${rounded(365 * 86_400_000)} years ago`;
}
export function readSlotSummary(storage: StorageAccess) { return SLOT_IDS.map((slot) => { try { const state = readSlot(storage, slot); return { slot, occupied: Boolean(state), level: state?.floor.level ?? state?.floor.depth ?? null, xpLevel: state?.progression.level ?? null, savedAt: state?.savedAt }; } catch (error) { return { slot, occupied: true, invalid: true, error: error instanceof Error ? error.message : String(error) }; } }); }
function normalizeVolume(value: unknown, fallback: number) { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback; }
export function normalizePreferences(input: unknown): Preferences { const value = typeof input === "object" && input !== null ? input as Record<string, unknown> : {}; return { zoom: typeof value.zoom === "number" && gameZoomPresets.includes(value.zoom) ? value.zoom : DEFAULT_PREFERENCES.zoom, camera: typeof value.camera === "string" && ["center", "deadzone", "screen"].includes(value.camera) ? value.camera as Preferences["camera"] : DEFAULT_PREFERENCES.camera, fullscreenDesired: value?.fullscreenDesired === true, sfxVolume: normalizeVolume(value?.sfxVolume, DEFAULT_PREFERENCES.sfxVolume), musicVolume: normalizeVolume(value?.musicVolume, DEFAULT_PREFERENCES.musicVolume), muteAll: value?.muteAll === true, urlArgs: value?.urlArgs === true }; }
export function readPreferences(storage: StorageAccess) { try { return normalizePreferences(JSON.parse(storage.getItem(PREFERENCE_KEY) ?? "null")); } catch { return { ...DEFAULT_PREFERENCES }; } }
export function writePreferences(storage: StorageAccess, value: unknown) { const normalized = normalizePreferences(value); storage.setItem(PREFERENCE_KEY, JSON.stringify(normalized)); return normalized; }
