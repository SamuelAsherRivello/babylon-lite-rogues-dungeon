import type { ActionResult, Campaign, Enemy, Entity, Item, Direction } from '../src/game/types.ts';
import type { TileLayer } from '../src/systems/rendering/tile-map-system.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAction, combatReadiness, createCampaign, createGameSession, effectiveAttributes, ensureNearbyStairs, entrancePosition, FLOOR_CENTER, FLOOR_HEIGHT, FLOOR_WIDTH, GAME_TUNING, generateFloor, headingFromMovement, isNonBlockingChestPlacementCell, isObjectSetBlocked, isObjectSetDoorOpen, levelUpOptions, previewEquipment, resourceState, STAIRS_MAX_DISTANCE_FROM_START, upgradeCampaignResources } from '../src/systems/procedural/world-procedural-system.ts';
import { worldFloorSeed } from '../src/systems/procedural/world-seed-system.ts';
import { projectLogEvents } from '../src/game/log-policy.ts';
import { projectFloatingFeedback, removeFloatingFeedback } from '../src/game/floating-feedback.ts';
import { projectResourceChangeEffects, removeResourceChangeEffect, resourceChangeEffectDurationMs } from '../src/game/resource-change-effects.ts';
import { getLatestMovement, getMovementKey, getMoveInitialDelay, getMoveRepeatDelay, getMoveScheduleDelay, SPRINT_INITIAL_DELAY, SPRINT_REPEAT_DELAY, WALK_INITIAL_DELAY, WALK_REPEAT_DELAY } from '../src/game/keyboard-input.ts';
import { findCardinalPath } from '../src/game/a-star.ts';
import { getMouseMovementFromSelectedCell, getMousePathFromSelectedCell } from '../src/game/mouse-selection.ts';
import { describeInventoryDrop, previewInventoryDrop, resolveInventoryDrop } from '../src/game/inventory-drag.ts';
import { getCameraCenter, getWorldCellAtScreenPosition, getWorldCellScreenCenter, getWorldScreenPosition, WorldRender } from '../src/systems/rendering/world-render-system.ts';
import { findWorldTooltipPosition } from '../src/content/world/tooltip-placement.ts';
import { gameZoomPresets, getTileCssSize } from '../src/content/world/zoom.ts';
import { clearRoguesDungeonStorage, formatSavedAgo, migrateCampaign, readPreferences, readSlot, readSlotSummary, writePreferences, writeSlot } from '../src/systems/persistence/save-system.ts';
import { randomSeedFromSearch } from '../src/game/random-seed.ts';
import { parseGameUrlOptions } from '../src/game/url-options.ts';
import { runUrlForCampaign } from '../src/game/run-url-system.ts';
import { DUNGEON_FLOOR_TILE_GIDS, DUNGEON_TILESET_SOURCE, DUNGEON_WANG_TILE_BY_MASK, compareTiledRepairLayers, floorFromTiledRepairMap, serializeFloorToTiled, validateTiledRepairMap } from '../src/systems/rendering/tile-map-system.ts';
import { createLevelContext, isWalkable, runLevelPasses } from '../src/systems/procedural/level-grid-system.ts';
import { buildManualTileScenario, getManualTileScenario } from '../src/systems/procedural/manual-tile-scenarios.ts';
import { CHARACTER_MOVEMENT_DURATION_MS, TURN_PLAYBACK_DURATION_MS, TurnPresentationSystem } from '../src/systems/animation/turn-presentation-system.ts';
import { createMyFirstQuest, currentQuest, projectQuestEvents } from '../src/systems/quests/quest-progression-system.ts';

function present<T>(value: T): NonNullable<T> { assert.ok(value != null, 'expected fixture value to exist'); return value; }
// These tests exercise runtime normalization of old enemies. Do not add defaults here:
// missing fields are the input under test, rather than a normalized Enemy.
function legacyEnemy(value: Partial<Enemy> & { id: string; kind: 'enemy'; x: number; y: number }): Enemy { return value as Enemy; }
function transaction(value: ReturnType<ReturnType<typeof createGameSession>['dispatch']>): ActionResult {
  assert.ok(value && 'state' in value, 'expected synchronous dispatch'); return value;
}
// Preserve the map-only, incomplete attributes accepted by the compatibility adapter.
function legacyMapCampaign(value: unknown): Campaign { return value as Campaign; }
class MemoryStorage { values = new Map<string, string>(); get length() { return this.values.size; } key(index: number) { return [...this.values.keys()][index] ?? null; } getItem(key: string) { return this.values.get(key) ?? null; } setItem(key: string, value: unknown) { this.values.set(key, String(value)); } removeItem(key: string) { this.values.delete(key); } }

test('My First Quest completes from generic events in any order and advances only when active', () => {
  const campaign = createCampaign(701);
  assert.deepEqual(currentQuest(campaign), createMyFirstQuest());
  projectQuestEvents(campaign, [{ type: 'item.collected', facts: { destination: 'gold' }, gameTime: 0, sequence: 1 }]);
  assert.equal(currentQuest(campaign).items[2].complete, true); assert.equal(currentQuest(campaign).activeItemId, 'walk-through-stairs');
  projectQuestEvents(campaign, [{ type: 'realm.entered', facts: {}, gameTime: 1, sequence: 1 }]);
  assert.equal(currentQuest(campaign).activeItemId, 'collect-health-potion');
  projectQuestEvents(campaign, [{ type: 'item.collected', facts: { resource: 'health', name: 'Health Potion' }, gameTime: 2, sequence: 1 }]);
  assert.deepEqual(currentQuest(campaign).items.map((item) => item.complete), [true, true, true]); assert.equal(currentQuest(campaign).activeItemId, null);
});

test('quest persistence initializes old saves and retains completed state', () => {
  const storage = new MemoryStorage(); const campaign = createCampaign(702); projectQuestEvents(campaign, [{ type: 'realm.entered', facts: {}, gameTime: 1, sequence: 1 }]);
  writeSlot(storage, '1', campaign); assert.equal(present(readSlot(storage, '1')).quest?.activeItemId, 'collect-health-potion');
  const old = createCampaign(703); Reflect.deleteProperty(old, 'quest'); storage.setItem('rogues-dungeon.slot.2', JSON.stringify(old));
  assert.equal(present(readSlot(storage, '2')).quest?.title, 'My First Quest');
});

test('level passes enforce scopes and protected semantic cells', () => {
  const context = createLevelContext({ width: 4, height: 4 });
  context.reserveCell(1, 1);
  runLevelPasses(context, [{ id: 'scoped-test', scope: { x: 1, y: 1, width: 2, height: 2 }, run: (level) => {
    assert.equal(level.writeCell(1, 1, { walkable: true }), false);
    assert.equal(level.writeCell(0, 0, { walkable: true }), false);
    assert.equal(level.writeCell(2, 2, { walkable: true }), true);
    return {};
  } }]);
  assert.equal(context.cells[2][2].walkable, true);
  assert.equal(context.passes[0].diagnostics, 2);
});

test('reads a validated randomSeed URL parameter for reproducible campaigns', () => {
  assert.equal(randomSeedFromSearch('?randomSeed=235234'), 235234);
  assert.equal(randomSeedFromSearch('?mute=1&randomSeed=0'), 0);
  for (const search of ['', '?randomSeed=', '?randomSeed=-1', '?randomSeed=1.5', '?randomSeed=4294967296', '?randomSeed=abc']) assert.equal(randomSeedFromSearch(search), null);
});

test('parses deterministic world, level, slot, seed, map-fix, and level-one test URL options', () => {
  assert.deepEqual(parseGameUrlOptions('?world=2&level=3&slot=2&run=4&seed=7&mute=1&level-1-test-mode=true&debug-fix-map-autotiled=1&scenario=corridor-joins'), { world: 2, level: 3, run: 4, slot: '2', seed: 7, mute: true, level1TestMode: true, mapFix: true, scenario: 'corridor-joins', map: null });
  assert.equal(parseGameUrlOptions('?slot=4').slot, null);
  assert.equal(parseGameUrlOptions('?seed=-1').seed, null);
  assert.equal(parseGameUrlOptions('?level-1-test-mode=1').level1TestMode, false);
  assert.equal(parseGameUrlOptions('?randomSeed=9').seed, 9);
});

test('adds or removes reproducible run arguments without changing unrelated URL arguments', () => {
  const campaign = createCampaign(17); Object.assign(campaign, { worldSeed: 17, slot: 2, run: 3, world: 'One' }); campaign.floor.level = 4;
  const enabled = new URL(runUrlForCampaign('https://example.test/play?mute=1&debug=1', true, campaign, '2'));
  assert.deepEqual(Object.fromEntries(enabled.searchParams), { mute: '1', debug: '1', world: '1', level: '4', slot: '2', run: '3', seed: '17' });
  const disabled = new URL(runUrlForCampaign(enabled.toString(), false, campaign, '2'));
  assert.deepEqual(Object.fromEntries(disabled.searchParams), { mute: '1', debug: '1' });
});

test('builds a deterministic manual tile scenario with width transitions', () => {
  assert.ok(getManualTileScenario('corridor-joins'));
  const first = buildManualTileScenario('corridor-joins', 13579, 1)!;
  const second = buildManualTileScenario('corridor-joins', 13579, 1)!;
  assert.deepEqual(first.cells, second.cells);
  assert.equal(first.scenario, 'corridor-joins');
  assert.equal(first.entities.find((entity) => entity.kind === 'stairs')?.x, 61);
  assert.ok(first.cells.flat().filter((cell) => cell.walkable).length > 150);
  const map = serializeFloorToTiled({ campaign: { ...createCampaign(13579), floor: first } });
  assert.equal(validateTiledRepairMap(map).valid, true);
  assert.equal(map.properties?.find((property) => property.name === 'scenario')?.value, 'corridor-joins');
});

test('reconstructs deterministic floors and round-trips Tiled repair maps', () => {
  const first = createCampaign(77, 2, 3); const second = createCampaign(77, 2, 3);
  assert.deepEqual(first.floor.map, second.floor.map);
  assert.deepEqual(first.floor.entities, second.floor.entities);
  const tiled = serializeFloorToTiled({ campaign: first });
  assert.equal(tiled.tilesets[0].source, DUNGEON_TILESET_SOURCE);
  assert.deepEqual(tiled.layers.map((layer) => [layer.name, layer.type]), [['Grounds', 'tilelayer'], ['Walls', 'tilelayer'], ['Pickups', 'objectgroup'], ['Decorations', 'objectgroup']]);
  const grounds = tiled.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Grounds')!;
  assert.deepEqual([...new Set(grounds.data.filter(Boolean))].sort((a, b) => a - b), [...DUNGEON_FLOOR_TILE_GIDS], 'Grounds varies only across the verified walkable-floor family');
  assert.equal(validateTiledRepairMap(tiled).valid, true);
  const repaired = floorFromTiledRepairMap(tiled, first.floor);
  assert.deepEqual(repaired.map, first.floor.map);
  assert.deepEqual(repaired.start, first.floor.start);
  assert.deepEqual(repaired.tiledGrounds, tiled.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Grounds')!.data);
  assert.deepEqual(repaired.tiledWalls, tiled.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!.data);
  const exit = repaired.entities.find((entity) => entity.kind === 'stairs')!;
  assert.ok(findCardinalPath(repaired, repaired.start, { x: exit.x, y: exit.y }));
});

test('places level-one test-mode stairs and starter entities beside the start only', () => {
  for (const seed of [1, 77, 13579, 9001]) {
    const floor = generateFloor(1, seed, 1, { level1TestMode: true });
    const puzzle = present(floor.objectSets?.find((set) => set.kind === 'floor-trigger-door-barrel'));
    assert.ok(Math.hypot(puzzle.barrel.x - floor.start.x, puzzle.barrel.y - floor.start.y) <= 3);
    const stairs = floor.entities.filter((entity) => entity.kind === 'stairs');
    assert.equal(stairs.length, 1);
    assert.deepEqual(stairs[0], { id: 'stairs-forward', kind: 'stairs', direction: 'forward', name: 'Stairs up', x: floor.start.x + 3, y: floor.start.y });
    assert.ok(Math.hypot(stairs[0].x - floor.start.x, stairs[0].y - floor.start.y) <= STAIRS_MAX_DISTANCE_FROM_START);
    assert.ok(floor.entities.some((entity) => entity.id === 'health-potion' && entity.kind === 'potion' && entity.resource === 'health'));
    assert.ok(floor.entities.some((entity) => entity.id === 'mana-potion' && entity.kind === 'potion' && entity.resource === 'mana'));
    assert.ok(floor.entities.some((entity) => entity.id === 'starter-key' && entity.kind === 'key'));
    const chest = floor.entities.find((entity) => entity.id === 'test-chest');
    assert.deepEqual(chest && { kind: chest.kind, opened: chest.kind === 'chest' ? chest.opened : undefined }, { kind: 'chest', opened: false });
    assert.equal(floor.entities.filter((entity) => entity.kind === 'chest').length, 1);
    assert.ok(chest && Math.max(Math.abs(chest.x - floor.start.x), Math.abs(chest.y - floor.start.y)) === 1);
    const crate = floor.entities.find((entity) => entity.id === 'test-crate');
    assert.deepEqual(crate && { kind: crate.kind, health: crate.kind === 'crate' ? crate.health : undefined, opened: crate.kind === 'crate' ? crate.opened : undefined }, { kind: 'crate', health: 100, opened: undefined });
    assert.ok(floor.entities.filter((entity) => entity.kind === 'crate').length >= 1);
    assert.ok(crate && Math.max(Math.abs(crate.x - floor.start.x), Math.abs(crate.y - floor.start.y)) === 1);
    assert.ok(floor.entities.some((entity) => entity.id === 'starter-gold' && entity.kind === 'gold'));
    const testEnemies = floor.entities.filter((entity): entity is Enemy => entity.kind === 'enemy' && entity.id.startsWith('test-'));
    assert.deepEqual(testEnemies.map((entity) => entity.name).sort(), ['Rat', 'Skeleton']);
    assert.ok(testEnemies.every((entity) => Math.hypot(entity.x - floor.start.x, entity.y - floor.start.y) <= 10));
  }
});

test('normalizes saved floors to directional stairs at the start', () => {
  const floor = generateFloor(1, 77, 1, { level1TestMode: true });
  floor.entities.push({ id: 'extra-stairs', kind: 'stairs', x: floor.start.x + 2, y: floor.start.y });
  const normalized = ensureNearbyStairs(floor);
  const stairs = normalized.entities.filter((entity) => entity.kind === 'stairs');
  assert.deepEqual(stairs, [{ id: 'stairs-forward', kind: 'stairs', direction: 'forward', name: 'Stairs up', x: floor.start.x + 3, y: floor.start.y }]);
});

test('places a return stair near the start and leaves the forward stair distant after level one', () => {
  const floor = generateFloor(2, 77);
  assert.deepEqual(floor.entities.find((entity) => entity.id === 'stairs-back'), { id: 'stairs-back', kind: 'stairs', direction: 'back', name: 'Stairs down', x: floor.start.x - 3, y: floor.start.y });
  const forward = present(floor.entities.find((entity) => entity.id === 'stairs-forward'));
  assert.ok(Math.hypot(forward.x - floor.start.x, forward.y - floor.start.y) >= 20);
  assert.equal(floor.entities.some((entity) => entity.id === 'test-rat' || entity.id === 'test-skeleton'), false);
});

test('chooses an unoccupied entrance grid spot when the preferred stair exit is occupied', () => {
  const floor = generateFloor(2, 77);
  const returnStair = floor.entities.find((entity) => entity.kind === 'stairs' && entity.direction === 'back')!;
  const preferred = { x: returnStair.x + 1, y: returnStair.y };
  floor.entities.push(legacyEnemy({ id: 'entrance-guard', kind: 'enemy', x: preferred.x, y: preferred.y, hp: 12, damage: 1, xp: 1, actionCooldown: 1, nextActionAt: 1 }));
  const entrance = entrancePosition(floor);
  assert.notDeepEqual(entrance, preferred);
  assert.equal(floor.entities.some((entity) => entity.x === entrance.x && entity.y === entrance.y), false);
});

test('linked stairs return to the previously visited floor', () => {
  let state = createCampaign(17, 1, 1, { level1TestMode: true });
  for (let step = 0; step < 3; step++) state = applyAction(state, { type: 'move', direction: 'e' }).state;
  assert.equal(state.floor.level, 1);
  assert.equal(state.floor.entities.some((entity) => entity.kind === 'stairs' && entity.x === state.player.x && entity.y === state.player.y), true);
  state = applyAction(state, { type: 'enter-stairs' }).state;
  assert.equal(state.floor.level, 2);
  const returnStair = state.floor.entities.find((entity) => entity.kind === 'stairs' && entity.direction === 'back')!;
  assert.deepEqual({ x: state.player.x, y: state.player.y }, { x: returnStair.x + 1, y: returnStair.y });
  const levelOne = structuredClone(state.floors?.['1']);
  state = applyAction(state, { type: 'move', direction: 'w' }).state;
  state = applyAction(state, { type: 'enter-stairs' }).state;
  assert.equal(state.floor.level, 1);
  assert.deepEqual(state.floor.entities.map(({ id, x, y }) => ({ id, x, y })), levelOne?.entities.map(({ id, x, y }) => ({ id, x, y })));
  assert.deepEqual(state.floor.map, levelOne?.map);
});

test('rejects malformed Tiled repair maps without producing a floor', () => {
  const result = validateTiledRepairMap({ type: 'map', width: 2, height: 2 });
  assert.equal(result.valid, false);
  assert.throws(() => floorFromTiledRepairMap({ type: 'map', width: 2, height: 2 }));
});

test('rejects overlapping Grounds and Walls cells', () => {
  const map = serializeFloorToTiled({ campaign: createCampaign(88) });
  const grounds = map.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Grounds')!; const walls = map.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!;
  const index = grounds.data.findIndex((cell) => cell > 0); walls.data[index] = 1;
  assert.match(validateTiledRepairMap(map).errors.join('; '), /overlap/);
});

test('preserves corrected seed-17 wall faces at corridor joins', () => {
  const map = serializeFloorToTiled({ campaign: createCampaign(17, 1, 1) });
  const walls = map.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!;
  for (const [x, y, gid] of [[53, 41, 7], [67, 41, 9], [53, 42, 54], [81, 46, 49], [31, 60, 1]]) {
    assert.equal(walls.data[y * 100 + x], gid, `wall face at ${x},${y}`);
  }
});

test('generalizes the repaired seed-914 corridor wall faces', () => {
  const map = serializeFloorToTiled({ campaign: createCampaign(914, 1, 1) });
  const walls = map.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!;
  for (const [x, y, gid] of [[26, 9, 7], [26, 16, 35], [26, 17, 22], [26, 18, 22], [26, 19, 22], [26, 20, 22], [26, 21, 60]]) {
    assert.equal(walls.data[y * 100 + x], gid, `wall face at ${x},${y}`);
  }
});

test('resolves previously unmapped seed-13579 masks without diagnostics', () => {
  const campaign = createCampaign(13579, 1, 1);
  const world = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, player: campaign.player });
  assert.equal(world.diagnostics.length, 0);
  assert.equal(world.wallDiagnostics.length, 0);
  assert.ok(world.terrain.every((tile) => tile.frame != null && DUNGEON_FLOOR_TILE_GIDS.includes(tile.frame + 1)));
});

test('compares one repaired scenario against its generated tile layers', () => {
  const campaign = createCampaign(13579, 1, 1); campaign.floor = buildManualTileScenario('corridor-joins', 13579, 1)!;
  const generated = serializeFloorToTiled({ campaign }); const repaired = structuredClone(generated);
  const walls = repaired.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!;
  const index = walls.data.findIndex((cell) => cell > 0); walls.data[index] = Number(walls.data[index]) + 1;
  assert.deepEqual(compareTiledRepairLayers(generated, repaired), [{ layer: 'Walls', index, generated: Number(generated.layers.find((layer): layer is TileLayer => layer.type === 'tilelayer' && layer.name === 'Walls')!.data[index] ?? 0), repaired: Number(walls.data[index] ?? 0) }]);
});

test('generates deterministic width-aware corridors with connected floor paths', () => {
  const narrow = generateFloor(1, 1, 1, { corridorWidth: 1 });
  const wide = generateFloor(1, 1, 1, { corridorWidth: 3 });
  assert.deepEqual(narrow.map, generateFloor(1, 1, 1, { corridorWidth: 1 }).map);
  assert.ok(wide.map!.flat().filter((cell) => cell === 0).length > narrow.map!.flat().filter((cell) => cell === 0).length);
  const exit = wide.entities.find((entity) => entity.kind === 'stairs')!;
  assert.ok(findCardinalPath(wide, wide.start, { x: exit.x, y: exit.y }));
  assert.ok(wide.map!.flat().filter((cell) => cell === 1).length > 0);
});

test('does not place a solid object in the reported level-three passage cell', () => {
  const seed = worldFloorSeed(2818867945, 1, 1, 3);
  const floor = generateFloor(3, seed, 3);
  const solidObject = floor.entities.find((entity) => entity.x === 60 && entity.y === 50 && (entity.kind === 'chest' || entity.kind === 'crate' || entity.kind === 'campfire' || entity.kind === 'enemy'));
  assert.equal(solidObject, undefined);
});

test('rejects chest placements that split adjacent floor paths', () => {
  const corridor = createLevelContext({ worldId: 'test', realmId: 'test', levelId: 1, seed: 1, width: 5, height: 3, start: { x: 0, y: 1 }, exit: { x: 4, y: 1 } });
  for (let x = 0; x < 5; x++) corridor.writeCell(x, 1, { walkable: true });
  assert.equal(isNonBlockingChestPlacementCell(corridor.cells, { x: 2, y: 1 }), false);

  const alcove = createLevelContext({ worldId: 'test', realmId: 'test', levelId: 1, seed: 1, width: 3, height: 3, start: { x: 0, y: 1 }, exit: { x: 2, y: 1 } });
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) alcove.writeCell(x, y, { walkable: true });
  assert.equal(isNonBlockingChestPlacementCell(alcove.cells, { x: 1, y: 1 }), true);
});

test('places seeded dungeon objects on unique walkable cells while preserving the exit route', () => {
  for (const seed of [17, 914]) {
    const floor = generateFloor(1, seed, 1);
    const stairs = floor.entities.find((entity) => entity.kind === 'stairs')!;
    const positions = new Set<string>();
    for (const entity of floor.entities) {
      assert.equal(isWalkable(floor, entity.x, entity.y), true, `${seed}:${entity.id} must be walkable`);
      const key = `${entity.x},${entity.y}`;
      assert.equal(positions.has(key), false, `${seed}:${key} must contain one entity`);
      positions.add(key);
    }
    for (const chest of floor.entities.filter((entity) => entity.kind === 'chest')) {
      assert.equal(isNonBlockingChestPlacementCell(floor.cells, chest), true, `${seed}:${chest.id} must not block floor connectivity`);
    }
    assert.ok(findCardinalPath(floor, floor.start, stairs), `${seed}: exit must remain reachable`);
    const set = floor.objectSets?.[0];
    const sealedExit = set?.regionRole === 'exit' && stairs.x === set.door.x + 2 && stairs.y === set.door.y;
    assert.ok(sealedExit || Math.hypot(stairs.x - floor.start.x, stairs.y - floor.start.y) >= 20, `${seed}: exits are either distant or behind the linked puzzle door`);
    assert.deepEqual(floor.generation?.passes?.map(({ id }) => id), ['structured-dungeon', 'reserve-semantic-cells', 'place-dungeon-objects']);
    assert.equal(floor.generation?.passes?.at(-1)?.diagnostics, 0);
  }
});

test('projects player Health changes and enemy hits into positioned transient text', () => {
  const effects = projectFloatingFeedback([
    { type: 'resource.changed', eventId: 'heal', facts: { resource: 'health', previous: 8, current: 13, position: { x: 4, y: 7 } } },
    { type: 'resource.changed', eventId: 'hurt', facts: { resource: 'health', previous: 13, current: 9, position: { x: 4, y: 7 } } },
    { type: 'resource.changed', eventId: 'mana', facts: { resource: 'mana', previous: 8, current: 4, position: { x: 4, y: 7 } } },
    { type: 'combat.hit', eventId: 'melee', facts: { targetId: 'rat-1', damage: 6, targetPosition: { x: 5, y: 7 } } },
    { type: 'combat.hit', eventId: 'ability', facts: { targetId: 'skeleton-1', damage: 8, targetPosition: { x: 12, y: 3 }, source: 'wand' } },
  ]);
  assert.deepEqual(effects.map(({ id, text, color, x, y }) => ({ id, text, color, x, y })), [
    { id: 'heal', text: '+5', color: 'gain', x: 4, y: 7 },
    { id: 'hurt', text: '−4', color: 'loss', x: 4, y: 7 },
    { id: 'melee', text: '−6', color: 'loss', x: 5, y: 7 },
    { id: 'ability', text: '−8', color: 'loss', x: 12, y: 3 },
  ]);
  assert.ok(effects.every((effect) => effect.duration > 0));
  assert.deepEqual(removeFloatingFeedback(effects, 'heal'), effects.slice(1));
});

test('projects Health changes and Mana gains into transient resource effects', () => {
  const effects = projectResourceChangeEffects([
    { type: 'resource.changed', eventId: 'hurt', facts: { resource: 'health', previous: 13, current: 9 } },
    { type: 'resource.changed', eventId: 'heal', facts: { resource: 'health', previous: 9, current: 13 } },
    { type: 'resource.changed', eventId: 'mana-spent', facts: { resource: 'mana', previous: 8, current: 4 } },
    { type: 'resource.changed', eventId: 'mana-gained', facts: { resource: 'mana', previous: 4, current: 8 } },
    { type: 'resource.changed', eventId: 'stamina', facts: { resource: 'stamina', previous: 8, current: 9 } },
    { type: 'resource.changed', eventId: 'rejected', outcome: 'rejected', facts: { resource: 'health', previous: 8, current: 1 } },
  ]);
  assert.deepEqual(effects.map(({ id, color, duration }) => ({ id, color, duration })), [
    { id: 'hurt', color: 'health-loss', duration: resourceChangeEffectDurationMs },
    { id: 'heal', color: 'health-gain', duration: resourceChangeEffectDurationMs },
    { id: 'mana-gained', color: 'mana', duration: resourceChangeEffectDurationMs },
  ]);
  assert.equal(resourceChangeEffectDurationMs, 1000);
  assert.deepEqual(removeResourceChangeEffect(effects, 'heal'), [effects[0], effects[2]]);
});

test('combat events capture actor positions before enemy removal or player respawn', () => {
  const melee = createCampaign(301); const enemy = legacyEnemy({ id: 'melee-target', kind: 'enemy', name: 'Cave Rat', x: melee.player.x + 1, y: melee.player.y, hp: 50, damage: 0, xp: 1 });
  melee.floor.map![enemy.y][enemy.x] = 0; melee.floor.entities = [enemy];
  const meleeHit = applyAction(melee, { type: 'move', direction: 'e' }).events.find((event) => event.type === 'combat.hit')!;
  assert.equal(meleeHit.facts.targetId, enemy.id); assert.deepEqual(meleeHit.facts.targetPosition, { x: enemy.x, y: enemy.y });

  const ability = createCampaign(302); const target = legacyEnemy({ id: 'wand-target', kind: 'enemy', name: 'Cave Rat', x: ability.player.x + 2, y: ability.player.y, hp: 50, damage: 0, xp: 1 });
  ability.floor.map![target.y][target.x] = 0; ability.floor.entities = [target];
  const cast = applyAction(ability, { type: 'ability', index: 1 });
  assert.equal(cast.state.floor.time, ability.floor.time);
  const abilityHit = applyAction(cast.state, { type: 'resolve-ability', abilityId: 'wand', targetId: target.id }).events.find((event) => event.type === 'combat.hit')!;
  assert.equal(abilityHit.facts.targetId, target.id); assert.deepEqual(abilityHit.facts.targetPosition, { x: target.x, y: target.y });

  const dying = createCampaign(303); dying.player.resources.health.current = 1; const oldPosition = { x: dying.player.x, y: dying.player.y };
  dying.floor.entities = [legacyEnemy({ id: 'killer', kind: 'enemy', x: dying.player.x, y: dying.player.y, hp: 9, damage: 99, xp: 1, actionCooldown: 1, nextActionAt: 1 })];
  const death = applyAction(dying, { type: 'move', direction: 'e' });
  const healthLoss = death.events.find((event) => event.type === 'resource.changed' && event.facts.resource === 'health')!;
  assert.deepEqual(healthLoss.facts.position, { x: oldPosition.x + 1, y: oldPosition.y });
  assert.ok(death.events.some((event) => event.type === 'player.died'));
});

test('abilities commit Mana before their effect and resolve one tactical turn on completion', () => {
  const campaign = createCampaign(911); campaign.player.resources.health.current = 10;
  const mana = campaign.player.resources.mana.current;
  const cast = applyAction(campaign, { type: 'ability', index: 0 });
  assert.equal(cast.accepted, true); assert.equal(cast.ticks, 0);
  assert.equal(cast.state.player.resources.mana.current, mana - 5);
  assert.equal(cast.state.player.resources.health.current, 10);
  const completion = applyAction(cast.state, { type: 'resolve-ability', abilityId: 'heal' });
  assert.equal(completion.ticks, 1); assert.equal(completion.state.floor.time, 2);
  assert.equal(completion.state.player.resources.health.current, 18);
});

test('Wand resolves only its locked target and harmlessly completes when it is gone', () => {
  const campaign = createCampaign(912); const target = legacyEnemy({ id: 'locked-target', kind: 'enemy', name: 'Locked Rat', x: campaign.player.x + 2, y: campaign.player.y, hp: 12, damage: 0, xp: 1 });
  campaign.floor.map![target.y][target.x] = 0; campaign.floor.entities = [target];
  const cast = applyAction(campaign, { type: 'ability', index: 1 });
  cast.state.floor.entities[0].x += 1;
  const movedHit = applyAction(cast.state, { type: 'resolve-ability', abilityId: 'wand', targetId: target.id });
  assert.deepEqual(movedHit.events.find((event) => event.type === 'combat.hit')?.facts.targetPosition, { x: target.x + 1, y: target.y });
  const missing = applyAction(cast.state, { type: 'resolve-ability', abilityId: 'wand', targetId: 'missing-target' });
  assert.equal(missing.events.some((event) => event.type === 'combat.hit'), false);
  assert.equal(missing.ticks, 1);
});

test('enemy damage is deterministic, stamina-scaled, and never reduced below one', () => {
  const campaign = createCampaign(304); campaign.player.resources.stamina.current = 13;
  const enemy = legacyEnemy({ id: 'fractional-hit', kind: 'enemy', name: 'Cave Rat', x: campaign.player.x + 2, y: campaign.player.y, hp: 50, damage: 20, xp: 1, actionCooldown: 1, nextActionAt: 1 });
  campaign.floor.map![enemy.y][enemy.x] = 0; campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0; campaign.floor.entities = [enemy];
  const result = applyAction(campaign, { type: 'move', direction: 'e' });
  const healthEvent = result.events.find((event) => event.type === 'resource.changed' && event.facts.cause === 'enemy-attack')!;
  assert.equal(present(healthEvent.facts.previous) - present(healthEvent.facts.current), 19);
  assert.equal(Number.isInteger(present(healthEvent.facts.previous) - present(healthEvent.facts.current)), true);
});

test('melee enemies move and attack only on cardinal tiles, while ranged attacks may target diagonals', () => {
  const meleeCampaign = createCampaign(3_041); const { x, y } = meleeCampaign.player;
  const melee = legacyEnemy({ id: 'diagonal-melee', kind: 'enemy', name: 'Diagonal Melee', x: x + 1, y: y + 1, hp: 10, damage: 2, xp: 1, actionCooldown: 1, nextActionAt: 1 });
  meleeCampaign.floor.entities = [melee];
  for (const cell of [{ x: x + 1, y }, { x, y: y + 1 }, { x: x + 1, y: y + 1 }]) meleeCampaign.floor.map![cell.y][cell.x] = 0;
  const meleeResult = applyAction(meleeCampaign, { type: 'wait' });
  const movedMelee = present(meleeResult.state.floor.entities.find((entity): entity is Enemy => entity.kind === 'enemy'));
  assert.equal(meleeResult.events.some((event) => event.facts.cause === 'enemy-attack'), false);
  assert.deepEqual({ x: movedMelee.x, y: movedMelee.y }, { x, y: y + 1 });
  assert.equal(movedMelee.heading, 'w');

  const rangedCampaign = createCampaign(3_042); const ranged = legacyEnemy({ id: 'diagonal-ranged', kind: 'enemy', name: 'Diagonal Ranged', x: rangedCampaign.player.x + 1, y: rangedCampaign.player.y + 1, hp: 10, damage: 2, xp: 1, actionCooldown: 1, nextActionAt: 1, attackKind: 'ranged', attackRange: 1 });
  rangedCampaign.floor.entities = [ranged];
  rangedCampaign.floor.map![ranged.y][ranged.x] = 0;
  const rangedResult = applyAction(rangedCampaign, { type: 'wait' });
  assert.ok(rangedResult.events.some((event) => event.facts.cause === 'enemy-attack'));
  assert.equal(present(rangedResult.state.floor.entities.find((entity): entity is Enemy => entity.kind === 'enemy')).heading, 'w');
});

test('starts a v3 campaign with approved deterministic attributes and bindings', () => {
  const campaign = createCampaign(42);
  assert.equal(campaign.version, 3);
  assert.equal(campaign.floor.level, 1); assert.equal(campaign.progression.difficulty, 1);
  assert.deepEqual(campaign.progression.attributes, { health: 30, stamina: 16, offense: 0, defense: 1, mana: 12, vitality: 0, strength: 0, luck: 0, recovery: 0, stealth: 0 });
  assert.deepEqual(campaign.player.abilities, ['heal', 'wand', null]);
  assert.deepEqual(campaign.player.equipment, { weapons: [{ id: 'starter-stick', name: 'Wooden Stick', group: 'weapons' as const, modifiers: { offense: 8 }, isStackable: false }, null], armor: [null, null] });
  assert.deepEqual(campaign.player.resources, {
    health: { current: 30, currentMax: 30 }, stamina: { current: 16, currentMax: 16 },
    offense: { current: 8, currentMax: 8 }, defense: { current: 1, currentMax: 1 },
    mana: { current: 12, currentMax: 12 }, xp: { current: 0, currentMax: 100, level: 1 },
  });
  assert.equal(campaign.player.inventoryCapacity, 10); assert.deepEqual(campaign.player.inventory.map(({ name }) => name), ['Health Potion', 'Mana Potion']); assert.equal(campaign.player.inventory.find((item) => item.name === 'Mana Potion')?.quantity, 2); assert.deepEqual(campaign.player.quickSlots, [null, null]);
  assert.deepEqual(campaign.counters, { keys: 1, gold: 55 });
  assert.equal(campaign.objective, 'Find the exit'); assert.deepEqual(campaign.log, []);
  assert.deepEqual(Object.keys(campaign.progression.attributes), ['health', 'stamina', 'offense', 'defense', 'mana', 'vitality', 'strength', 'luck', 'recovery', 'stealth']);
});

test('accepted move and equipment changes emit events and cost one time unit', () => {
  const campaign = createCampaign(9); campaign.floor.entities = [];
  campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0;
  const move = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(move.accepted, true); assert.equal(move.state.floor.time, 2);
  assert.ok(move.events.some((event) => event.type === 'player.moved'));
  const item = { id: 'sword', name: 'Iron Sword 01', group: 'weapons' as const, modifiers: { offense: 8 } };
  move.state.player.inventory = [item];
  const equip = applyAction(move.state, { type: 'equip', itemId: item.id, group: 'weapons' as const, index: 1 });
  assert.equal(equip.state.floor.time, 3); assert.equal(equip.state.player.inventory.length, 0);
  assert.ok(equip.events.some((event) => event.type === 'equipment.changed'));
});

test('wait advances one turn without moving the player and resolves a due enemy action', () => {
  const campaign = createCampaign(19); const { x, y } = campaign.player;
  campaign.floor.map![y][x + 1] = 0;
  campaign.floor.entities = [legacyEnemy({ id: 'waiting-enemy', kind: 'enemy', name: 'Waiting Enemy', x: x + 1, y, hp: 10, damage: 2, xp: 1, actionCooldown: 1, nextActionAt: 1 })];
  const result = applyAction(campaign, { type: 'wait' });
  assert.equal(result.accepted, true); assert.equal(result.ticks, 1); assert.equal(result.state.floor.time, 2);
  assert.deepEqual({ x: result.state.player.x, y: result.state.player.y }, { x, y });
  assert.ok(result.events.some((event) => event.type === 'time.advanced'));
  assert.ok(result.events.some((event) => event.type === 'resource.changed' && event.facts.cause === 'enemy-attack'));
});

test('drag previews are pure and show equipment attribute changes before commit', () => {
  const campaign = createCampaign(3); const item = { id: 'shield', name: 'Oak Shield 03', group: 'weapons' as const, modifiers: { defense: 6 } };
  const before = effectiveAttributes(campaign); const after = previewEquipment(campaign, item, 'weapons', 1);
  assert.equal(after.defense, before.defense + 6); assert.deepEqual(effectiveAttributes(campaign), before);
});

test('resource maxima and derived offense track current stamina', () => {
  const campaign = createCampaign(4); campaign.player.equipment.weapons[0] = { id: 'stick', name: 'Stick', group: 'weapons' as const, modifiers: { offense: 6 } }; campaign.player.resources.stamina.current = 8;
  upgradeCampaignResources(campaign);
  const resources = resourceState(campaign);
  assert.equal(resources.stamina.currentMax, 16); assert.equal(resources.offense.current, 5); assert.equal(combatReadiness(8, 16), 0.875);
});

test('saved campaigns and preferences remain independent', () => {
  const storage = new MemoryStorage(); const campaign = createCampaign(7);
  writeSlot(storage, '1', campaign); writePreferences(storage, { zoom: 2, camera: 'deadzone', fullscreenDesired: true });
  assert.equal(present(readSlot(storage, '1')).floor.seed, 7);
  assert.deepEqual(readSlotSummary(storage).map((entry) => entry.occupied), [true, false, false]);
  assert.deepEqual(readPreferences(storage), { zoom: 2, camera: 'deadzone', fullscreenDesired: true, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
  assert.deepEqual(writePreferences(storage, { zoom: 0.5, camera: 'screen', fullscreenDesired: false, sfxVolume: 0, musicVolume: 63, muteAll: true, urlArgs: true }), { zoom: 0.5, camera: 'screen', fullscreenDesired: false, sfxVolume: 0, musicVolume: 63, muteAll: true, urlArgs: true });
  assert.deepEqual(readPreferences(storage), { zoom: 0.5, camera: 'screen', fullscreenDesired: false, sfxVolume: 0, musicVolume: 63, muteAll: true, urlArgs: true });
});

test('formats saved-game ages with rounded short units', () => {
  const now = 10_000_000_000;
  assert.equal(formatSavedAgo(now, now), '1 secs ago');
  assert.equal(formatSavedAgo(now - 3_400, now), '3 secs ago');
  assert.equal(formatSavedAgo(now - 10 * 60_000, now), '10 mins ago');
  assert.equal(formatSavedAgo(now - 3 * 3_600_000, now), '3 hours ago');
  assert.equal(formatSavedAgo(now - 6 * 86_400_000, now), '6 days ago');
  assert.equal(formatSavedAgo(now - 8 * 7 * 86_400_000, now), '8 weeks ago');
  assert.equal(formatSavedAgo(now - 2 * 365 * 86_400_000, now), '2 years ago');
});

test('normalizes legacy fourth ability bindings while retaining the first three', () => {
  const campaign = createCampaign(8); Object.assign(campaign.player, { abilities: ['wand', 'heal', null, 'legacy-fourth'] });
  const migrated = migrateCampaign(campaign);
  assert.deepEqual(migrated.player.abilities, ['wand', 'heal', null]);
  assert.notEqual(migrated, campaign);
  const storage = new MemoryStorage(); writeSlot(storage, '1', campaign);
  assert.deepEqual(JSON.parse(present(storage.getItem('rogues-dungeon.slot.1'))).player.abilities, ['wand', 'heal', null]);
});

test('migrates and persists quick-slot stacks without invalid zero quantities', () => {
  const legacy = structuredClone(createCampaign(303)); delete legacy.player.quickSlots; delete legacy.starterConsumablesSeeded;
  const migrated = migrateCampaign(legacy);
  assert.deepEqual(migrated.player.quickSlots, [null, null]);
  assert.deepEqual(migrated.player.inventory.filter((item) => item.category === 'consumable').map((item) => item.name), ['Health Potion', 'Mana Potion']); assert.equal(migrated.player.inventory.find((item) => item.name === 'Mana Potion')?.quantity, 2);
  const potion = createCampaign(304).player.inventory.find((item) => item.name === 'Mana Potion')!;
  migrated.player.quickSlots = [{ item: potion, quantity: 2 }, { item: potion, quantity: 0 }];
  const storage = new MemoryStorage(); writeSlot(storage, '1', migrated);
  const saved = JSON.parse(storage.getItem('rogues-dungeon.slot.1')!);
  assert.equal(saved.player.quickSlots[0].quantity, 4); assert.equal(saved.player.quickSlots[1], null);
  const loaded = readSlot(storage, '1'); assert.equal(loaded?.player.quickSlots?.[0]?.quantity, 4);
});

test('preferences validate malformed, out-of-range, and unavailable storage', () => {
  const storage = new MemoryStorage();
  storage.setItem('rogues-dungeon.preferences.v1', '{broken');
  assert.deepEqual(readPreferences(storage), { zoom: 1, camera: 'center', fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
  storage.setItem('rogues-dungeon.preferences.v1', JSON.stringify({ zoom: 7, camera: 'follow', fullscreenDesired: 'yes' }));
  assert.deepEqual(readPreferences(storage), { zoom: 1, camera: 'center', fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
  storage.setItem('rogues-dungeon.preferences.v1', JSON.stringify({ zoom: 2, camera: 'screen', fullscreenDesired: true, sfxVolume: 101, musicVolume: -1, muteAll: 'yes' }));
  assert.deepEqual(readPreferences(storage), { zoom: 2, camera: 'screen', fullscreenDesired: true, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
  assert.deepEqual(readPreferences(Object.assign(new MemoryStorage(), { getItem: () => { throw new Error('blocked'); } })), { zoom: 1, camera: 'center', fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false });
});

test('migrates legacy campaigns without losing world progress or duplicating equipment', () => {
  const legacy = {
    version: 1, world: 'Two', realm: 'Crypt 4', floor: { seed: 99, depth: 4, time: 31, map: [[0]], start: { x: 2, y: 3 }, entities: [legacyEnemy({ id: 'rat', kind: 'enemy', x: 4, y: 5, hp: 7, xp: 10 })] },
    progression: { level: 3, xp: 45, totalKills: 8, stats: { health: 30, stamina: 18, offense: 12, defense: 6, strength: 999 } },
    player: { x: 8, y: 9, hp: 11, equipment: { weapon: { id: 's1', name: 'Old Sword', slot: 'weapon', attack: 4 }, head: { id: 'a1', name: 'Old Helm', slot: 'head', defense: 2 }, pendingChoice: { id: 's1', name: 'Old Sword', slot: 'weapon', attack: 4 } } },
    pending: { type: 'level-choice', choices: ['strength'] },
  };
  const migrated = migrateCampaign(legacy);
  assert.equal(migrated.realm, 'Crypt 4'); assert.equal(migrated.player.x, 57); assert.equal(migrated.player.y, 58);
  assert.equal(migrated.floor.width, FLOOR_WIDTH); assert.equal(migrated.floor.height, FLOOR_HEIGHT); assert.deepEqual(migrated.floor.start, { x: 51, y: 52 }); assert.equal(migrated.floor.map![49][49], 0);
  assert.equal(migrated.floor.time, 31); assert.equal(migrated.floor.level, 4); assert.equal(migrated.progression.difficulty, 4);
  assert.equal(migrated.version, 3); assert.deepEqual(migrated.floor.entities.map((entity) => ({ id: entity.id, kind: entity.kind, x: entity.x, y: entity.y })), [legacyEnemy({ id: 'rat', kind: 'enemy', x: 53, y: 54 })]);
  assert.equal(present(migrated.floor.entities.find((entity) => entity.kind === 'enemy')).resources.health.current, 7);
  assert.equal(present(migrated.floor.entities.find((entity) => entity.kind === 'enemy')).resources.xp.current, 10);
  assert.equal(migrated.progression.level, 3); assert.equal(migrated.progression.xp, 45);
  assert.equal(migrated.progression.attributes.stealth, 0); assert.equal(migrated.progression.attributes.strength, 999);
  const items = [...migrated.player.equipment.weapons, ...migrated.player.equipment.armor, ...migrated.player.inventory].filter((value) => value != null);
  assert.equal(items.length, 2); assert.equal(new Set(items.map((item) => item.id)).size, 2);
});

test("clears only Rogue's Dungeon local storage records", () => {
  const storage = new MemoryStorage();
  storage.setItem('rogues-dungeon.slot.1', 'save'); storage.setItem('rogues-dungeon.slot.v1-backup.1', 'backup'); storage.setItem('rogues-dungeon.preferences.v1', 'preferences'); storage.setItem('unrelated.preference', 'keep');
  clearRoguesDungeonStorage(storage);
  assert.equal(storage.getItem('rogues-dungeon.slot.1'), null); assert.equal(storage.getItem('rogues-dungeon.slot.v1-backup.1'), null); assert.equal(storage.getItem('rogues-dungeon.preferences.v1'), null); assert.equal(storage.getItem('unrelated.preference'), 'keep');
});

test('a fresh player can defeat three adjacent basic enemies without dying', () => {
  let campaign = createCampaign(305); const { x, y } = campaign.player;
  const enemies = [
    { id: 'east-rat', x: x + 1, y },
    { id: 'north-rat', x, y: y - 1 },
    { id: 'south-rat', x, y: y + 1 },
  ].map((position) => (legacyEnemy({ ...position, kind: 'enemy', name: 'Cave Rat', hp: 12, maxHp: 12, damage: 3, xp: 1, awareness: 6, actionCooldown: 2, nextActionAt: 2 })));
  campaign.floor.entities = enemies;
  for (const enemy of enemies) campaign.floor.map![enemy.y][enemy.x] = 0;

  for (const direction of ['e', 'e', 'n', 'n', 's', 's']) campaign = applyAction(campaign, { type: 'move', direction }).state;

  assert.equal(campaign.floor.entities.filter((entity) => entity.kind === 'enemy').length, 0);
  assert.equal(campaign.player.resources.health.current, 18);
  assert.equal(campaign.log.some((entry) => ('type' in entry ? entry.type : undefined) === 'player.died'), false);
});

test('Skeletons are tougher than Rats on the same floor', () => {
  let pair = null;
  for (let seed = 1; seed <= 30 && !pair; seed++) {
    const enemies = generateFloor(2, seed).entities.filter((entity) => entity.kind === 'enemy');
    const rat = enemies.find((entity) => entity.name === 'Rat')!; const skeleton = enemies.find((entity) => entity.name === 'Skeleton')!;
    if (rat && skeleton) pair = { rat, skeleton };
  }
  assert.ok(pair);
  assert.ok(pair.skeleton.maxHp > pair.rat.maxHp);
  assert.ok(pair.skeleton.damage > pair.rat.damage);
});

test('generates centered 100 by 100 floors and leaves expanded campaigns untouched', () => {
  const floor = generateFloor(101, 99);
  assert.equal(floor.width, FLOOR_WIDTH); assert.equal(floor.height, FLOOR_HEIGHT); assert.deepEqual(floor.start, FLOOR_CENTER); assert.equal(floor.map![FLOOR_CENTER.y][FLOOR_CENTER.x], 0);
  const stairs = floor.entities.find((entity) => entity.kind === 'stairs')!;
  assert.equal(floor.map![stairs.y][stairs.x], 0);
  const visited = new Set([`${floor.start.x},${floor.start.y}`]); const pending = [{ ...floor.start }];
  while (pending.length) {
    const { x, y } = present(pending.shift());
    for (const [nextX, nextY] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (floor.map![nextY]?.[nextX] === 0 && !visited.has(`${nextX},${nextY}`)) { visited.add(`${nextX},${nextY}`); pending.push({ x: nextX, y: nextY }); }
  }
  assert.ok(visited.has(`${stairs.x},${stairs.y}`));
  const campaign = createCampaign(100);
  assert.equal(migrateCampaign(campaign), campaign);
});

test('expands undersized version-2 floors once while preserving world offsets', () => {
  const campaign = createCampaign(102);
  campaign.floor = { ...campaign.floor, width: 40, height: 20, map: Array.from({ length: 20 }, () => Array.from({ length: 40 }, () => 1)), start: { x: 2, y: 3 }, entities: [legacyEnemy({ id: 'kept', kind: 'enemy', name: 'Cave Rat', x: 4, y: 5, hp: 7, maxHp: 7, damage: 2, xp: 1 })] };
  campaign.floor.map![3][2] = 0; campaign.floor.map![5][4] = 0; campaign.player.x = 8; campaign.player.y = 9;
  const migrated = migrateCampaign(campaign);
  assert.equal(migrated.floor.width, 100); assert.equal(migrated.floor.height, 100); assert.deepEqual(migrated.floor.start, { x: 32, y: 43 });
  assert.deepEqual({ x: migrated.player.x, y: migrated.player.y }, { x: 38, y: 49 }); assert.deepEqual({ x: migrated.floor.entities[0].x, y: migrated.floor.entities[0].y }, { x: 34, y: 45 });
  assert.equal(migrated.floor.map![43][32], 0); assert.equal(migrated.floor.map![45][34], 0); assert.equal(migrateCampaign(migrated), migrated);
});

test('backs up legacy bytes before replacing them and leaves invalid records intact', () => {
  const storage = new MemoryStorage();
  const legacy = { version: 1, floor: { seed: 17, depth: 1, time: 6, map: [[0]], start: { x: 0, y: 0 }, entities: [] }, progression: { stats: { strength: 5 } }, player: { x: 0, y: 0, equipment: {} } };
  const raw = JSON.stringify(legacy); storage.setItem('rogues-dungeon.slot.2', raw);
  assert.equal(present(readSlot(storage, '2')).floor.time, 6);
  assert.equal(storage.getItem('rogues-dungeon.slot.v1-backup.2'), raw);
  assert.equal(JSON.parse(present(storage.getItem('rogues-dungeon.slot.2'))).version, 3);
  const bad = '{broken'; storage.setItem('rogues-dungeon.slot.3', bad);
  assert.equal(readSlotSummary(storage)[2].invalid, true); assert.equal(storage.getItem('rogues-dungeon.slot.3'), bad);
  assert.throws(() => readSlot(Object.assign(new MemoryStorage(), { getItem: () => { throw new Error('blocked'); } }), '1'), /blocked/);
  assert.throws(() => writeSlot(Object.assign(new MemoryStorage(), { setItem: () => { throw new Error('quota'); } }), '1', createCampaign(1)), /quota/);
});

test('player and each generated enemy own independent six-resource models', () => {
  const campaign = createCampaign(884);
  const enemies = campaign.floor.entities.filter((entity) => entity.kind === 'enemy');
  assert.ok(enemies.length > 1);
  assert.equal(Object.keys(campaign.player.resources).length, 6);
  for (const [index, enemy] of enemies.entries()) {
    assert.equal(Object.keys(enemy.resources).length, 6);
    assert.equal(enemy.resources.health.currentMax, enemy.maxHp);
    assert.equal(enemy.resources.offense.current, enemy.damage);
    assert.equal(enemy.resources.xp.current, enemy.xp);
    assert.notEqual(enemy.resources, campaign.player.resources);
    if (index > 0) assert.notEqual(enemy.resources.health, enemies[0].resources.health);
  }
  const original = enemies[1].resources.health.current;
  enemies[0].resources.health.current--;
  assert.equal(enemies[1].resources.health.current, original);
});

test('world tooltip placement stays inside its frame and avoids both grid spots', () => {
  const frame = { left: 100, top: 50, right: 700, bottom: 450, width: 600, height: 400 };
  const protectedRects = [{ left: 320, top: 180, width: 40, height: 40 }, { left: 540, top: 320, width: 40, height: 40 }];
  const position = findWorldTooltipPosition(frame, { width: 180, height: 100 }, protectedRects);
  assert.ok(position);
  const panel = { left: frame.left + position.left, top: frame.top + position.top, width: 180, height: 100 };
  assert.ok(panel.left >= frame.left && panel.top >= frame.top && panel.left + panel.width <= frame.right && panel.top + panel.height <= frame.bottom);
  for (const rect of protectedRects) assert.ok(panel.left + panel.width <= rect.left || panel.left >= rect.left + rect.width || panel.top + panel.height <= rect.top || panel.top >= rect.top + rect.height);
  assert.equal(findWorldTooltipPosition({ left: 0, top: 0, right: 80, bottom: 60, width: 80, height: 60 }, { width: 100, height: 70 }, protectedRects), null);
});

test('world tooltip placement honors a full extra grid-cell clearance', () => {
  const frame = { left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400 };
  const protectedRect = { left: 280, top: 180, width: 40, height: 40 };
  const position = findWorldTooltipPosition(frame, { width: 160, height: 80 }, [protectedRect], 48);
  assert.ok(position);
  const panel = { left: position.left, top: position.top, width: 160, height: 80 };
  const horizontalGap = panel.left >= protectedRect.left + protectedRect.width ? panel.left - (protectedRect.left + protectedRect.width) : panel.left + panel.width <= protectedRect.left ? protectedRect.left - (panel.left + panel.width) : 0;
  const verticalGap = panel.top >= protectedRect.top + protectedRect.height ? panel.top - (protectedRect.top + protectedRect.height) : panel.top + panel.height <= protectedRect.top ? protectedRect.top - (panel.top + panel.height) : 0;
  assert.ok(horizontalGap >= 48 || verticalGap >= 48);
});

test('compact world tooltip fits beside protected cells in a narrow game frame', () => {
  const frame = { left: 0, top: 0, right: 421, bottom: 389, width: 421, height: 389 };
  const hovered = { left: 143, top: 82, width: 45, height: 45 };
  const player = { left: 188, top: 172, width: 45, height: 45 };
  const position = findWorldTooltipPosition(frame, { width: 176, height: 164 }, [hovered, player]);
  assert.ok(position);
  const panel = { left: position.left, top: position.top, width: 176, height: 164 };
  assert.ok(panel.left >= frame.left && panel.top >= frame.top && panel.left + panel.width <= frame.right && panel.top + panel.height <= frame.bottom);
  for (const rect of [hovered, player]) assert.ok(panel.left + panel.width <= rect.left || panel.left >= rect.left + rect.width || panel.top + panel.height <= rect.top || panel.top >= rect.top + rect.height);
});

test('adds Dungeon Level and saved Difficulty to existing v2 campaigns without losing progress', () => {
  const storage = new MemoryStorage(); const old = createCampaign(18); old.version = 2; old.floor.depth = 6; Reflect.deleteProperty(old.floor, 'level'); Reflect.deleteProperty(old.progression, 'difficulty'); Object.assign(old.progression.attributes, { agility: 4 }); Reflect.deleteProperty(old.progression.attributes, 'stealth');
  old.floor.time = 41; old.progression.level = 5; old.progression.xp = 33;
  storage.setItem('rogues-dungeon.slot.1', JSON.stringify(old));
  const loaded = present(readSlot(storage, '1'));
  assert.equal(loaded.floor.level, 6); assert.equal(loaded.progression.difficulty, 6);
  assert.equal(loaded.floor.time, 41); assert.equal(loaded.progression.level, 5); assert.equal(loaded.progression.xp, 33);
  assert.equal(loaded.version, 3); assert.equal(loaded.progression.attributes.stealth, 4);
  assert.equal(storage.getItem('rogues-dungeon.slot.v1-backup.1'), null);
});

test('persists hidden Difficulty across exit, death, and save reload while it scales generated enemies', () => {
  const storage = new MemoryStorage(); const campaign = createCampaign(181);
  campaign.floor.entities = [{ id: 'stairs', kind: 'stairs', x: campaign.player.x + 1, y: campaign.player.y }];
  campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0;
  const descended = applyAction(applyAction(campaign, { type: 'move', direction: 'e' }).state, { type: 'enter-stairs' }).state;
  assert.equal(descended.floor.level, 2); assert.equal(descended.progression.difficulty, 2);
  const expectedEnemy = (level: number) => 12 + (level - 1) * 3;
  assert.ok(descended.floor.entities.filter((entity) => entity.kind === 'enemy').every((enemy) => enemy.maxHp >= expectedEnemy(descended.progression.difficulty)));
  writeSlot(storage, '1', descended);
  const reloaded = present(readSlot(storage, '1'));
  assert.equal(reloaded.floor.level, 2); assert.equal(reloaded.progression.difficulty, 2);
  reloaded.floor.level = 7; reloaded.floor.time = 89; reloaded.progression.difficulty = 7;
  reloaded.player.resources.health.current = 1;
  reloaded.floor.entities = [legacyEnemy({ id: 'killer', kind: 'enemy', x: reloaded.player.x + 1, y: reloaded.player.y, hp: 99, damage: 99, xp: 1, actionCooldown: 1, nextActionAt: 1 })];
  reloaded.floor.map![reloaded.player.y][reloaded.player.x + 1] = 0;
  const death = applyAction(reloaded, { type: 'move', direction: 'e' }).state;
  assert.equal(death.floor.level, 1); assert.equal(death.floor.time, 1); assert.equal(death.progression.difficulty, 7);
  assert.ok(death.floor.entities.filter((entity) => entity.kind === 'enemy').every((enemy) => enemy.maxHp >= expectedEnemy(death.progression.difficulty)));
  writeSlot(storage, '1', death);
  const resumed = present(readSlot(storage, '1'));
  assert.equal(resumed.floor.level, 1); assert.equal(resumed.floor.time, 1); assert.equal(resumed.progression.difficulty, 7);
});

test('session serializes committed and rejected actions with unique transaction and event IDs', () => {
  const campaign = createCampaign(24); campaign.floor.entities = [];
  campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0;
  const seen: ActionResult[] = []; const session = createGameSession(campaign); session.subscribe((result) => seen.push(result));
  const move = transaction(session.dispatch({ type: 'move', direction: 'e' }));
  const rejected = transaction(session.dispatch({ type: 'move', direction: 'bad' }));
  const sneak = transaction(session.dispatch({ type: 'toggle-sneak' }));
  assert.equal(move.accepted, true); assert.equal(move.ticks, 1); assert.equal(session.getState().floor.time, 2);
  assert.equal(rejected.accepted, false); assert.equal(rejected.ticks, 0); assert.equal(sneak.ticks, 0);
  assert.notEqual(move.transactionId, rejected.transactionId);
  const eventIds = seen.flatMap((result) => result.events.map((event) => event.eventId));
  assert.equal(new Set(eventIds).size, eventIds.length);
  assert.ok(move.events.some((event) => event.type === 'action.committed'));
  assert.ok(rejected.events.every((event) => event.outcome === 'rejected'));
});

test('Log policy projects selected structured events once and ignores movement without suppressing it', () => {
  const events: Parameters<typeof projectLogEvents>[1] = [
    { type: 'player.moved', facts: { to: { x: 2, y: 3 } }, eventId: 'e1' },
    { type: 'item.collected', facts: { name: 'Wooden Stick' }, eventId: 'e2' },
    { type: 'quick-slot.use.rejected', facts: { item: 'Health Potion', resource: 'health' }, eventId: 'e3' },
  ];
  const once = projectLogEvents([], events);
  assert.deepEqual(once, [{ id: 'e2', text: 'You collect Wooden Stick.' }, { id: 'e3', text: 'Health Potion cannot be used while Health is full.' }]);
  assert.deepEqual(projectLogEvents(once, events), once);
});

test('session finalizes Log projection before autosave and publishes save failures without gameplay', () => {
  const campaign = createCampaign(34); campaign.floor.entities = [];
  campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0;
  let saved: Campaign | null = null; const session = createGameSession(campaign, { onCommit: (result) => { saved = structuredClone(result.state); } });
  session.subscribe((result) => { if (result.accepted) result.state.log = projectLogEvents(result.state.log, result.events); });
  const committed = transaction(session.dispatch({ type: 'move', direction: 'e' }));
  assert.deepEqual(present<Campaign | null>(saved).log, committed.state.log);
  const before = session.getState().floor.time; const failure = session.publish('campaign.save.failed', { reason: 'quota' });
  assert.equal(failure.outcome, 'system'); assert.equal(session.getState().floor.time, before);
});

test('preserves resource fullness when equipment changes maxima and handles zero safely', () => {
  const campaign = createCampaign(35); campaign.floor.entities = [];
  campaign.player.resources.health.current = 20;
  campaign.player.inventory = [{ id: 'vital-armor', name: 'Vital Armor', group: 'armor' as const, modifiers: { health: -15 } }];
  const result = applyAction(campaign, { type: 'equip', itemId: 'vital-armor', group: 'armor' as const, index: 0 });
  assert.equal(result.state.player.resources.health.current, 10);
  assert.equal(effectiveAttributes(result.state).health, 15);
  assert.ok(result.events.some((event) => event.type === 'resource.changed' && event.facts.previousMax === 30 && event.facts.currentMax === 15));
  present(result.state.player.equipment.armor[0]).modifiers.health = -10;
  result.state.player.resources.stamina.current = 20;
  upgradeCampaignResources(result.state);
  assert.equal(resourceState(result.state).stamina.currentMax, 16);
  assert.equal(resourceState(result.state).offense.current, Math.round(resourceState(result.state).offense.currentMax * combatReadiness(16, 16)));
  result.state.progression.attributes.stamina = 0; result.state.player.resources.stamina.current = 0;
  upgradeCampaignResources(result.state);
  assert.equal(resourceState(result.state).offense.current, 6); assert.equal(resourceState(result.state).defense.current, 1);
});

test('potion pickups enter inventory without being spent, including at full resource', () => {
  const campaign = createCampaign(36); campaign.floor.entities = []; campaign.player.inventory = [];
  const target = { x: campaign.player.x + 1, y: campaign.player.y };
  campaign.floor.map![target.y][target.x] = 0;
  campaign.floor.entities = [{ id: 'health-potion-1', kind: 'potion', resource: 'health', x: target.x, y: target.y }];
  campaign.player.resources.health.current = 10;
  const collected = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(collected.state.player.resources.health.current, 10); assert.deepEqual(collected.state.player.inventory.map((item) => item.name), ['Health Potion']);
  assert.equal(collected.state.floor.time, 2); assert.ok(collected.events.some((event) => event.type === 'item.collected' && event.facts.itemId === 'health-potion-1' && event.facts.destination === 'inventory'));
  campaign.floor.entities = [{ id: 'health-potion-2', kind: 'potion', resource: 'health', x: target.x, y: target.y }];
  campaign.player.x = target.x - 1; campaign.player.y = target.y; campaign.player.resources.health.current = 30;
  const full = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(full.state.player.x, target.x); assert.equal(full.state.floor.entities.length, 0); assert.ok(full.state.player.inventory.some((item) => item.name === 'Health Potion')); assert.equal(full.state.floor.time, 2);
});

test('stackable potion pickups merge into the assigned quick slot or inventory stack', () => {
  const campaign = createCampaign(37); campaign.floor.entities = []; campaign.player.inventory = [];
  const health = { id: 'health-stack', name: 'Health Potion', group: 'weapons' as const, modifiers: {}, category: 'consumable' as const, consumableResource: 'health' as const, isStackable: true, quantity: 2 };
  campaign.player.quickSlots = [{ item: health, quantity: 2 }, null];
  const target = { x: campaign.player.x + 1, y: campaign.player.y }; campaign.floor.map![target.y][target.x] = 0;
  campaign.floor.entities = [{ id: 'world-health', kind: 'potion', resource: 'health', ...target }];
  const quickPickup = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(quickPickup.state.player.quickSlots?.[0]?.quantity, 3); assert.equal(quickPickup.state.player.inventory.length, 0);

  const inventoryCampaign = createCampaign(38); inventoryCampaign.floor.entities = []; inventoryCampaign.player.quickSlots = [null, null]; inventoryCampaign.player.inventory = [{ ...health, id: 'inventory-health', quantity: 2 }];
  const inventoryTarget = { x: inventoryCampaign.player.x + 1, y: inventoryCampaign.player.y }; inventoryCampaign.floor.map![inventoryTarget.y][inventoryTarget.x] = 0;
  inventoryCampaign.floor.entities = [{ id: 'world-health-2', kind: 'potion', resource: 'health', ...inventoryTarget }];
  const inventoryPickup = applyAction(inventoryCampaign, { type: 'move', direction: 'e' });
  assert.equal(inventoryPickup.state.player.inventory.length, 1); assert.equal(inventoryPickup.state.player.inventory[0].quantity, 3);
});

test('attacks charge once, award attack and kill XP, and carry threshold overflow', () => {
  const campaign = createCampaign(37); campaign.floor.entities = [];
  const target = { x: campaign.player.x + 1, y: campaign.player.y };
  campaign.floor.map![target.y][target.x] = 0;
  campaign.floor.entities = [legacyEnemy({ id: 'rat', kind: 'enemy', name: 'Cave Rat', x: target.x, y: target.y, hp: 1, damage: 0, xp: 8 })];
  campaign.progression.xp = 95; campaign.player.resources.stamina.current = 16;
  const result = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(result.ticks, 1); assert.equal(result.state.floor.time, 2);
  assert.equal(result.state.player.resources.stamina.current, 12); assert.equal(result.state.progression.level, 2);
  assert.equal(result.state.progression.xp, 4); assert.equal(result.state.progression.nextXp, GAME_TUNING.xpThreshold);
  assert.deepEqual(result.state.progression.pendingUpgrades[0].options, levelUpOptions(2));
  assert.equal(result.events.filter((event) => event.type === 'resource.changed' && event.facts.resource === 'stamina').length, 1);
});

test('persistent ranks deterministically improve resources, loot, recovery, and awareness', () => {
  const campaign = createCampaign(370); campaign.floor.entities = [];
  Object.assign(campaign.progression.attributes, { vitality: 2, strength: 1, luck: 2, recovery: 2, stealth: 2 });
  campaign.player.equipment.weapons[0] = { id: 'stick', name: 'Stick', group: 'weapons' as const, modifiers: { offense: 6 } };
  campaign.player.resources.stamina.current = 0;
  campaign.floor.map![campaign.player.y][campaign.player.x + 1] = 0;
  const moved = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(effectiveAttributes(moved.state).health, 36); assert.equal(effectiveAttributes(moved.state).offense, 7);
  assert.equal(moved.state.player.resources.stamina.current, 4);

  const chest = structuredClone(moved.state); chest.floor.entities = [{ id: 'chest', kind: 'chest', x: chest.player.x + 1, y: chest.player.y, opened: false }]; chest.floor.objectSets = [];
  for (let y = chest.player.y - 1; y <= chest.player.y + 1; y++) for (let x = chest.player.x; x <= chest.player.x + 2; x++) chest.floor.map![y][x] = 0;
  const loot = applyAction(chest, { type: 'move', direction: 'e' });
  assert.equal(loot.events.find((event) => event.type === 'chest.opened')!.facts.lootTier, 1);
  assert.deepEqual({ x: loot.state.player.x, y: loot.state.player.y, heading: loot.state.player.heading }, { x: chest.player.x, y: chest.player.y, heading: 'e' });
  assert.equal(loot.state.floor.entities.find((entity) => entity.id === 'chest')?.kind, 'chest');
  assert.equal((loot.state.floor.entities.find((entity) => entity.id === 'chest') as { opened?: boolean }).opened, true);
  const coins = loot.state.floor.entities.filter((entity) => entity.kind === 'gold' && entity.id.startsWith('chest-gold-'));
  assert.equal(coins.length, 3);
  assert.ok(coins.every((coin) => Math.max(Math.abs(coin.x - (chest.player.x + 1)), Math.abs(coin.y - chest.player.y)) === 1 && (coin.x !== chest.player.x || coin.y !== chest.player.y)));
  const reopened = applyAction(loot.state, { type: 'move', direction: 'e' });
  assert.deepEqual({ x: reopened.state.player.x, y: reopened.state.player.y }, { x: loot.state.player.x, y: loot.state.player.y });
  assert.equal(reopened.state.floor.entities.filter((entity) => entity.kind === 'gold' && entity.id.startsWith('chest-gold-')).length, 3);

  const cautious = structuredClone(moved.state); cautious.floor.entities = [legacyEnemy({ id: 'watcher', kind: 'enemy', x: cautious.player.x + 5, y: cautious.player.y, hp: 12, damage: 11, xp: 1, awareness: 6, actionCooldown: 1, nextActionAt: 1 })];
  for (let offset = 1; offset <= 6; offset++) cautious.floor.map![cautious.player.y][cautious.player.x + offset] = 0;
  const hidden = applyAction(cautious, { type: 'move', direction: 'w' });
  assert.equal(hidden.state.floor.entities[0].x, cautious.floor.entities[0].x);
});

test('a crate takes two bumps to break, then releases three coins', () => {
  const campaign = createCampaign(372); const cratePosition = { x: campaign.player.x + 1, y: campaign.player.y };
  campaign.floor.entities = [{ id: 'crate', kind: 'crate', ...cratePosition, health: 100 }]; campaign.floor.objectSets = [];
  for (let y = campaign.player.y - 1; y <= campaign.player.y + 1; y++) for (let x = campaign.player.x; x <= campaign.player.x + 2; x++) campaign.floor.map![y][x] = 0;

  const damaged = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal((damaged.state.floor.entities.find((entity) => entity.id === 'crate') as { health?: number }).health, 50);
  assert.equal(damaged.events.some((event) => event.type === 'crate.bumped'), true);
  assert.equal(damaged.events.some((event) => event.type === 'crate.opened'), false);

  const opened = applyAction(damaged.state, { type: 'move', direction: 'e' });
  const crate = opened.state.floor.entities.find((entity) => entity.id === 'crate');
  assert.deepEqual(crate && { kind: crate.kind, health: crate.kind === 'crate' ? crate.health : undefined, opened: crate.kind === 'crate' ? crate.opened : undefined }, { kind: 'crate', health: 0, opened: true });
  assert.ok(crate?.kind === 'crate' && [1, 5].includes(crate.openFrame ?? -1));
  const coins = opened.state.floor.entities.filter((entity) => entity.kind === 'gold' && entity.id.startsWith('crate-gold-crate-'));
  assert.equal(coins.length, 3);
  assert.ok(coins.every((coin) => Math.max(Math.abs(coin.x - cratePosition.x), Math.abs(coin.y - cratePosition.y)) === 1));

  const steppedThrough = applyAction(opened.state, { type: 'move', direction: 'e' });
  assert.equal(steppedThrough.accepted, true);
  assert.deepEqual({ x: steppedThrough.state.player.x, y: steppedThrough.state.player.y }, cratePosition);
});

test('level choices are distinct, block tactical actions, and resolve without another turn', () => {
  const campaign = createCampaign(371); const target = { x: campaign.player.x + 1, y: campaign.player.y };
  campaign.player.equipment.weapons[0] = { id: 'stick', name: 'Stick', group: 'weapons' as const, modifiers: { offense: 6 } };
  campaign.floor.map![target.y][target.x] = 0; campaign.floor.entities = [legacyEnemy({ id: 'rat', kind: 'enemy', name: 'Rat', x: target.x, y: target.y, hp: 1, damage: 0, xp: 8 })]; campaign.progression.xp = 95;
  const earned = applyAction(campaign, { type: 'move', direction: 'e' }); const pending = earned.state.progression.pendingUpgrades[0];
  assert.deepEqual(pending.options, levelUpOptions(2)); assert.equal(new Set(pending.options).size, 3);
  assert.equal(applyAction(earned.state, { type: 'toggle-sneak' }).events[0].facts.reason, 'level-up-pending');
  const beforeTime = earned.state.floor.time; const selected = applyAction(earned.state, { type: 'choose-upgrade', stat: pending.options[0] });
  assert.equal(selected.accepted, true); assert.equal(selected.ticks, 0); assert.equal(selected.state.floor.time, beforeTime); assert.equal(selected.state.progression.attributes[pending.options[0]], 1);
});

test('death starts a clean run while preserving persistent progression and bindings', () => {
  const campaign = createCampaign(38); campaign.floor.entities = [];
  campaign.floor.level = 10; campaign.floor.time = 63; campaign.progression.difficulty = 10;
  campaign.player.resources.health.current = 1; campaign.progression.level = 4; campaign.progression.xp = 27;
  campaign.progression.attributes.strength = 14; campaign.player.abilities = ['wand', 'heal', null];
  campaign.player.inventory = [{ id: 'lost-item', name: 'Lost Sword', group: 'weapons' as const, modifiers: { offense: 5 } }];
  campaign.player.equipment.weapons[0] = { id: 'equipped', name: 'Equipped Sword', group: 'weapons' as const, modifiers: { offense: 8 } };
  const target = { x: campaign.player.x + 1, y: campaign.player.y }; campaign.floor.map![target.y][target.x] = 0;
  campaign.floor.entities = [legacyEnemy({ id: 'killer', kind: 'enemy', name: 'Killer', x: target.x + 1, y: target.y, hp: 20, damage: 99, xp: 1, actionCooldown: 1, nextActionAt: 1 })];
  const result = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(result.state.realm, 'Underground 1'); assert.equal(result.state.floor.level, 1); assert.equal(result.state.floor.time, 1); assert.equal(result.state.progression.difficulty, 10);
  assert.equal(result.state.progression.level, 4); assert.equal(result.state.progression.xp, 27);
  assert.equal(result.state.progression.attributes.strength, 14); assert.deepEqual(result.state.player.abilities, ['wand', 'heal', null]);
  assert.deepEqual(result.state.player.inventory.map(({ name }) => name), ['Health Potion', 'Mana Potion']); assert.deepEqual(result.state.player.equipment.weapons, [{ id: 'starter-stick', name: 'Wooden Stick', group: 'weapons' as const, modifiers: { offense: 8, }, isStackable: false }, null]);
  assert.deepEqual(result.state.counters, { keys: 1, gold: 55 });
  assert.ok(result.events.some((event) => event.type === 'player.died'));
});

test('inventory collection is alphabetical, capacity bounded, and equipment commits atomically', () => {
  const campaign = createCampaign(39); campaign.floor.entities = []; campaign.player.inventory = [];
  const x = campaign.player.x + 1; const y = campaign.player.y; campaign.floor.map![y][x] = 0;
  const sword = { id: 'z-sword', name: 'Z Sword', group: 'weapons' as const, modifiers: { offense: 4 } };
  const armor = { id: 'a-armor', name: 'A Armor', group: 'armor' as const, modifiers: { defense: 2 } };
  campaign.floor.entities = [{ id: 'loot-z', kind: 'item', x, y, item: sword }];
  const picked = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.deepEqual(picked.state.player.equipment.weapons, [{ id: 'starter-stick', name: 'Wooden Stick', group: 'weapons' as const, modifiers: { offense: 8 }, isStackable: false }, null]); assert.equal(picked.state.player.inventory[0].id, sword.id);
  picked.state.player.inventory.push(armor); picked.state.player.inventory.sort((a, b) => a.name.localeCompare(b.name));
  const equipped = applyAction(picked.state, { type: 'equip', itemId: armor.id, group: 'armor' as const, index: 1 });
  assert.equal(equipped.state.floor.time, picked.state.floor.time + 1); assert.equal(present(equipped.state.player.equipment.armor[1]).id, armor.id);
  const beforeRejected = equipped.state;
  const invalid = applyAction(beforeRejected, { type: 'equip', itemId: sword.id, group: 'armor' as const, index: 0 });
  assert.equal(invalid.accepted, false); assert.equal(invalid.state, beforeRejected); assert.equal(invalid.state.floor.time, beforeRejected.floor.time);
  const reordered = applyAction(equipped.state, { type: 'reorder-equipment', group: 'armor' as const, index: 0, other: 1 });
  assert.equal(reordered.state.floor.time, equipped.state.floor.time + 1);
  assert.equal(effectiveAttributes(reordered.state).defense, effectiveAttributes(equipped.state).defense);
  reordered.state.player.inventory = Array.from({ length: 10 }, (_, index) => ({ id: `i${index}`, name: `Item ${index}`, group: 'weapons' as const, modifiers: {} }));
  assert.equal(applyAction(reordered.state, { type: 'unequip', group: 'armor' as const, index: 0 }).accepted, false);
  const full = structuredClone(campaign); full.player.inventory = Array.from({ length: full.player.inventoryCapacity }, (_, index) => ({ id: `f${index}`, name: `F${index}`, group: 'weapons' as const, modifiers: {} }));
  const lootPosition = { x: full.player.x + 1, y: full.player.y }; full.floor.map![lootPosition.y][lootPosition.x] = 0;
  full.floor.entities = [{ id: 'blocked-loot', kind: 'item', ...lootPosition, item: { id: 'blocked-item', name: 'Blocked', group: 'weapons' as const, modifiers: {} } }];
  const notPicked = applyAction(full, { type: 'move', direction: 'e' });
  assert.equal(notPicked.state.player.inventory.length, 10); assert.ok(notPicked.state.floor.entities.some((entity) => entity.id === 'blocked-loot'));
});

test('drag resolver previews and commits only relevant compatible destinations', () => {
  const campaign = createCampaign(40); const item = { id: 's1', name: 'Sword', group: 'weapons' as const, modifiers: { offense: 4 } };
  campaign.player.inventory = [item]; const drag = { kind: 'inventory' as const, item };
  assert.ok(previewInventoryDrop(campaign, drag, 'weapons', 0, null));
  assert.equal(previewInventoryDrop(campaign, drag, 'armor', 0, null), null);
  assert.equal(previewInventoryDrop(campaign, drag, 'weapons', 0, { id: 'occupied', name: 'Occupied', group: 'weapons', modifiers: {} }), null);
  assert.deepEqual(resolveInventoryDrop(drag, { kind: 'slot', group: 'weapons' as const, index: 1 }), { type: 'equip', itemId: 's1', group: 'weapons' as const, index: 1 });
  assert.equal(resolveInventoryDrop(drag, { kind: 'slot', group: 'weapons' as const, index: 0 }, { id: 'occupied', name: 'Occupied', group: 'weapons', modifiers: {} }), null);
  assert.equal(resolveInventoryDrop({ kind: 'slot', group: 'weapons' as const, index: 0, item }, { kind: 'slot', group: 'armor' as const, index: 1 }), null);
  assert.deepEqual(resolveInventoryDrop({ kind: 'slot', group: 'weapons' as const, index: 0, item }, { kind: 'slot', group: 'weapons' as const, index: 1 }), { type: 'reorder-equipment', group: 'weapons' as const, index: 0, other: 1 });
  assert.deepEqual(resolveInventoryDrop({ kind: 'slot', group: 'armor' as const, index: 1, item }, { kind: 'inventory' }), { type: 'unequip', group: 'armor' as const, index: 1 });
  const potion = createCampaign(40).player.inventory[0];
  assert.deepEqual(resolveInventoryDrop({ kind: 'inventory', item: potion }, { kind: 'quick-slot', index: 0 }), { type: 'assign-quick-slot', itemId: potion.id, index: 0 });
  assert.deepEqual(resolveInventoryDrop({ kind: 'quick-slot', item: potion, index: 0 }, { kind: 'inventory' }), { type: 'return-quick-slot', index: 0 });
  assert.deepEqual(resolveInventoryDrop({ kind: 'quick-slot', item: potion, index: 0 }, { kind: 'quick-slot', index: 1 }), { type: 'move-quick-slot', from: 0, to: 1 });
  assert.equal(resolveInventoryDrop({ kind: 'inventory', item: potion }, { kind: 'slot', group: 'weapons' as const, index: 0 }), null);
  assert.equal(resolveInventoryDrop({ kind: 'quick-slot', item: potion, index: 0 }, { kind: 'slot', group: 'weapons' as const, index: 0 }), null);
  assert.equal(resolveInventoryDrop({ kind: 'inventory', item }, { kind: 'quick-slot', index: 0 }), null);
});

test('drag descriptions share valid drop actions with transient equip and unequip previews', () => {
  const campaign = createCampaign(401); const stick = { id: 'stick', name: 'Wooden Stick', group: 'weapons' as const, modifiers: { offense: 3 } };
  campaign.player.inventory = [stick]; const baseline = effectiveAttributes(campaign);
  const equip = present(describeInventoryDrop(campaign, { kind: 'inventory', item: stick }, { kind: 'slot', group: 'weapons' as const, index: 1 }));
  assert.deepEqual(equip.action, { type: 'equip', itemId: stick.id, group: 'weapons' as const, index: 1 }); assert.equal(present(equip.preview).offense, baseline.offense + 3);
  assert.equal(describeInventoryDrop(campaign, { kind: 'inventory', item: stick }, { kind: 'slot', group: 'armor' as const, index: 0 }), null);
  assert.equal(describeInventoryDrop(campaign, { kind: 'inventory', item: stick }, { kind: 'slot', group: 'weapons' as const, index: 0 }, { id: 'occupied', name: 'Occupied', group: 'weapons', modifiers: {} }), null);
  const equipped = createCampaign(402); equipped.player.equipment.weapons[0] = stick; const equippedBaseline = effectiveAttributes(equipped);
  const unequip = present(describeInventoryDrop(equipped, { kind: 'slot', item: stick, group: 'weapons' as const, index: 0 }, { kind: 'inventory' }));
  assert.deepEqual(unequip.action, { type: 'unequip', group: 'weapons' as const, index: 0 }); assert.equal(present(unequip.preview).offense, equippedBaseline.offense - 3);
  equipped.player.inventory = Array.from({ length: equipped.player.inventoryCapacity }, (_, index) => ({ id: `full-${index}`, name: `Full ${index}`, group: 'weapons' as const, modifiers: {} }));
  assert.equal(describeInventoryDrop(equipped, { kind: 'slot', item: stick, group: 'weapons' as const, index: 0 }, { kind: 'inventory' }), null);
  assert.equal(equipped.player.equipment.weapons[0], stick);
});

test('abilities reject empty or unaffordable bindings and reassignment updates key positions', () => {
  const campaign = createCampaign(41); campaign.floor.entities = [];
  const insufficient = structuredClone(campaign); insufficient.player.resources.mana.current = 0;
  const rejected = applyAction(insufficient, { type: 'ability', index: 0 });
  assert.equal(rejected.accepted, false); assert.equal(rejected.ticks, 0); assert.equal(rejected.events[0].facts.reason, 'insufficient-mana');
  const empty = applyAction(campaign, { type: 'ability', index: 2 }); assert.equal(empty.accepted, false); assert.equal(empty.state.floor.time, 1);
  const moved = applyAction(campaign, { type: 'assign-ability', from: 0, to: 2 });
  assert.deepEqual(moved.state.player.abilities, [null, 'wand', 'heal']); assert.equal(moved.state.floor.time, 2);
  const invalidSlot = applyAction(campaign, { type: 'assign-ability', from: 0, to: 3 });
  assert.equal(invalidSlot.accepted, false); assert.equal(invalidSlot.events[0].facts.reason, 'invalid-ability-slot'); assert.equal(invalidSlot.state.floor.time, 1);
  const invalidAbility = applyAction(campaign, { type: 'ability', index: 3 });
  assert.equal(invalidAbility.accepted, false); assert.equal(invalidAbility.events[0].facts.reason, 'invalid-ability-slot'); assert.equal(invalidAbility.state.floor.time, 1);
  const noTarget = applyAction(campaign, { type: 'ability', index: 1 });
  assert.equal(noTarget.accepted, false); assert.equal(noTarget.events[0].facts.reason, 'no-valid-target');
});

test('level one generates one sealed floor-trigger door barrel set with every seeded region role', () => {
  const roles = new Set<string>();
  for (let seed = 1; seed < 300 && roles.size < 2; seed++) {
    const floor = generateFloor(1, seed, 1);
    const set = present(floor.objectSets?.[0]);
    roles.add(set.regionRole);
    for (const cell of [set.barrel, set.trigger, set.door]) assert.equal(floor.cells[cell.y][cell.x].walkable, true);
    const coordinates = [set.barrel, set.trigger, set.door];
    assert.ok(Math.max(...coordinates.map(({ x }) => x)) - Math.min(...coordinates.map(({ x }) => x)) < 20);
    assert.ok(Math.max(...coordinates.map(({ y }) => y)) - Math.min(...coordinates.map(({ y }) => y)) < 20);
    const sealedGoal = { x: set.door.x + 2, y: set.door.y };
    assert.ok(findCardinalPath(floor, floor.start, sealedGoal), 'the door route reaches the sealed branch when held open');
    const closedMap = floor.map!.map((row) => row.slice()); closedMap[set.door.y][set.door.x] = 1;
    assert.equal(findCardinalPath({ map: closedMap, entities: [] }, floor.start, sealedGoal), null, 'the door is the only route into the sealed branch');
    if (set.regionRole === 'optional-reward') assert.ok(floor.entities.some((entity) => entity.id === 'sealed-reward' && entity.kind === 'chest'));
    if (set.regionRole === 'exit') assert.ok(floor.entities.some((entity) => entity.kind === 'stairs' && entity.direction === 'forward' && entity.x === sealedGoal.x && entity.y === sealedGoal.y));
  }
  assert.deepEqual([...roles].sort(), ['exit', 'optional-reward']);
  assert.deepEqual(generateFloor(1, 17, 1).objectSets, generateFloor(1, 17, 1).objectSets);
});

test('a barrel push holds and releases its linked door while closed doors block movement', () => {
  const campaign = createCampaign(77); campaign.floor.entities = [];
  campaign.floor.objectSets = [{ id: 'fixture', kind: 'floor-trigger-door-barrel', barrel: { x: 48, y: 50 }, trigger: { x: 49, y: 50 }, door: { x: 54, y: 50 }, regionRole: 'optional-reward' }];
  campaign.player.x = 53; campaign.player.y = 50;
  assert.equal(isObjectSetBlocked(campaign.floor, campaign.player, 54, 50), true);
  assert.equal(applyAction(campaign, { type: 'move', direction: 'e' }).accepted, false);
  const blockedPush = structuredClone(campaign); blockedPush.player.x = 49; blockedPush.floor.objectSets![0].barrel = { x: 50, y: 50 }; blockedPush.floor.cells[50][51].walkable = false; blockedPush.floor.map![50][51] = 1;
  const rejectedPush = applyAction(blockedPush, { type: 'move', direction: 'e' });
  assert.equal(rejectedPush.accepted, false); assert.equal(rejectedPush.ticks, 0); assert.equal(rejectedPush.events[0].facts.reason, 'blocked-barrel');
  campaign.player.x = 47;
  const pushed = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(pushed.accepted, true); assert.deepEqual(present(pushed.state.floor.objectSets)[0].barrel, { x: 49, y: 50 });
  assert.equal(isObjectSetDoorOpen(present(pushed.state.floor.objectSets)[0], pushed.state.player), true);
  const backedUp = applyAction(pushed.state, { type: 'move', direction: 'w' });
  const approached = applyAction(backedUp.state, { type: 'move', direction: 'e' });
  const movedBarrelOffTrigger = applyAction(approached.state, { type: 'move', direction: 'e' });
  assert.equal(movedBarrelOffTrigger.accepted, true);
  const released = applyAction(movedBarrelOffTrigger.state, { type: 'move', direction: 's' });
  assert.equal(released.accepted, true);
  assert.equal(isObjectSetDoorOpen(present(released.state.floor.objectSets)[0], released.state.player), false);
  assert.equal(isObjectSetBlocked(released.state.floor, released.state.player, 54, 50), true);
  const enemyCampaign = createCampaign(91); const enemy = present(enemyCampaign.floor.entities.find((entity): entity is Enemy => entity.kind === 'enemy'));
  enemyCampaign.floor.objectSets = [{ id: 'enemy-fixture', kind: 'floor-trigger-door-barrel', barrel: { x: 48, y: 50 }, trigger: { x: 49, y: 50 }, door: { x: 54, y: 50 }, regionRole: 'optional-reward' }];
  enemyCampaign.player.x = 55; enemyCampaign.player.y = 50; enemy.x = 53; enemy.y = 50; enemy.nextActionAt = 1;
  const enemyBlocked = applyAction(enemyCampaign, { type: 'wait' });
  assert.deepEqual(present(enemyBlocked.state.floor.entities.find((entity): entity is Enemy => entity.kind === 'enemy')).x, 53);
});

test('object sets survive save-shaped campaign normalization and render identically in both world views', () => {
  const campaign = createCampaign(123); const set = present(campaign.floor.objectSets)[0];
  campaign.player.x = set.trigger.x; campaign.player.y = set.trigger.y;
  const restored = upgradeCampaignResources(structuredClone(campaign));
  assert.deepEqual(restored.floor.objectSets, campaign.floor.objectSets);
  const game = WorldRender.Render({ map: restored.floor.map, entities: restored.floor.entities, objectSets: restored.floor.objectSets, player: restored.player, view: 'game' });
  const minimap = WorldRender.Render({ map: restored.floor.map, entities: restored.floor.entities, objectSets: restored.floor.objectSets, player: restored.player, view: 'minimap', detail: 'simplified' });
  assert.deepEqual(game.puzzleObjects, minimap.puzzleObjects);
  assert.deepEqual(game.puzzleObjects.map(({ kind, active }) => [kind, active]), [['trigger', true], ['barrel', false], ['door', true]]);
  const legacy = structuredClone(campaign); delete legacy.floor.objectSets;
  assert.deepEqual(upgradeCampaignResources(legacy).floor.objectSets, []);
  const closed = structuredClone(campaign); closed.player.x = set.door.x; closed.player.y = set.door.y;
  assert.equal(isObjectSetDoorOpen(present(upgradeCampaignResources(closed).floor.objectSets)[0], closed.player), false);
  const returned = structuredClone(restored); returned.floors = { '1': structuredClone(restored.floor) }; returned.floor = generateFloor(2, 902, 2);
  returned.floor = structuredClone(returned.floors['1']);
  assert.deepEqual(upgradeCampaignResources(returned).floor.objectSets, restored.floor.objectSets);
  assert.equal(isObjectSetDoorOpen(present(returned.floor.objectSets)[0], returned.player), true);
});

test('WorldRender shares exact terrain and entity coordinates while camera policies remain presentation-only', () => {
  const campaign = createCampaign(42); const game = WorldRender.Render({ map: campaign.floor.map, entities: campaign.floor.entities, player: campaign.player, view: 'game' });
  const minimap = WorldRender.Render({ map: campaign.floor.map, entities: campaign.floor.entities, player: campaign.player, view: 'minimap', detail: 'simplified' });
  assert.deepEqual(game.terrain.map(({ x, y, frame }) => [x, y, frame]), minimap.terrain.map(({ x, y, frame }) => [x, y, frame]));
  assert.deepEqual(game.actors.map(({ id, x, y }) => [id, x, y]), minimap.actors.map(({ id, x, y }) => [id, x, y]));
  assert.ok(game.actors.every(({ heading }) => heading === 'e'));
  assert.deepEqual(game.markers.player, minimap.markers.player); assert.equal(present(game.markers.exit).id, present(minimap.markers.exit).id);
  const player = { x: 10, y: 10 };
  const initial = getCameraCenter({ mode: 'center', player, visibleWidth: 20, visibleHeight: 10 }); assert.deepEqual(initial, player);
  assert.deepEqual(getCameraCenter({ mode: 'deadzone', player: { x: 11, y: 10 }, previousCenter: player, visibleWidth: 20, visibleHeight: 10 }), player);
  assert.deepEqual(getCameraCenter({ mode: 'deadzone', player: { x: 14, y: 10 }, previousCenter: player, visibleWidth: 20, visibleHeight: 10 }), { x: 11, y: 10 });
  assert.deepEqual(getCameraCenter({ mode: 'deadzone', player: { x: 14, y: 10 }, previousCenter: player, visibleWidth: 40, visibleHeight: 20 }), player);
  const screen = getCameraCenter({ mode: 'screen', player: { x: 20, y: 10 }, visibleWidth: 10, visibleHeight: 8 });
  assert.deepEqual(screen, { x: 20, y: 10 });
  assert.deepEqual(getCameraCenter({ mode: 'screen', player: { x: 24, y: 13 }, previousCenter: screen, visibleWidth: 10, visibleHeight: 8 }), screen);
  assert.deepEqual(getCameraCenter({ mode: 'screen', player: { x: 25, y: 14 }, previousCenter: screen, visibleWidth: 10, visibleHeight: 8 }), { x: 30, y: 18 });
  assert.deepEqual(getCameraCenter({ mode: 'screen', player: { x: 14, y: 5 }, previousCenter: screen, visibleWidth: 10, visibleHeight: 8 }), { x: 10, y: 2 });
  assert.deepEqual(getCameraCenter({ mode: 'center', player: { x: 1, y: 1 }, visibleWidth: 20, visibleHeight: 10, mapWidth: 100, mapHeight: 100 }), { x: 9.5, y: 4.5 });
  assert.deepEqual(getCameraCenter({ mode: 'deadzone', player: { x: 98, y: 99 }, previousCenter: { x: 80, y: 80 }, visibleWidth: 20, visibleHeight: 10, mapWidth: 100, mapHeight: 100 }), { x: 89.5, y: 94.5 });
  assert.deepEqual(getCameraCenter({ mode: 'screen', player: { x: 99, y: 99 }, visibleWidth: 20, visibleHeight: 10, mapWidth: 100, mapHeight: 100 }), { x: 89.5, y: 94.5 });
  assert.deepEqual(getCameraCenter({ mode: 'center', player: { x: 1, y: 1 }, visibleWidth: 120, visibleHeight: 120, mapWidth: 100, mapHeight: 100 }), { x: 1, y: 1 });
  assert.deepEqual(getCameraCenter({ mode: 'center', player: { x: 10.5, y: 10 }, visibleWidth: 20, visibleHeight: 10 }), { x: 10.5, y: 10 });
  assert.deepEqual(getCameraCenter({ mode: 'deadzone', player: { x: 14.5, y: 10 }, previousCenter: player, visibleWidth: 20, visibleHeight: 10 }), { x: 11.5, y: 10 });
  assert.deepEqual(getCameraCenter({ mode: 'screen', player: { x: 20.5, y: 10 }, visibleWidth: 10, visibleHeight: 8 }), { x: 20.5, y: 10 });
  assert.deepEqual({ x: campaign.player.x, y: campaign.player.y }, game.markers.player); // Camera framing never mutates map coordinates.
  assert.ok(game.terrain.length < campaign.floor.map!.length * campaign.floor.map![0].length, 'deep blocked interiors are omitted from sparse terrain');
  assert.ok(game.terrain.every((tile) => campaign.floor.map![tile.y][tile.x] === 0), 'terrain entries are walkable cells only');
  assert.ok(game.terrain.every((tile) => tile.frame != null && DUNGEON_FLOOR_TILE_GIDS.includes(tile.frame + 1)), 'terrain uses only approved walkable-floor IDs');
  assert.equal(game.diagnostics.length, 0, 'unsupported walkable masks resolve to plain ground instead of red diagnostics');
  assert.deepEqual(game.grounds.map(({ x, y }) => [x, y]), game.terrain.map(({ x, y }) => [x, y]));
  assert.ok(game.walls.every((wall) => campaign.floor.map![wall.y][wall.x] === 1), 'wall entries are blocked cells');
  assert.ok(game.walls.some((wall) => wall.frame !== null), 'supported wall boundaries render a Wang face');
  assert.deepEqual(game.diagnostics.map(({ x, y, mask }) => [x, y, mask]), minimap.diagnostics.map(({ x, y, mask }) => [x, y, mask]));
});

test('characters face the direction of movement and bump interactions', () => {
  assert.equal(headingFromMovement(-1, 0), 'w');
  assert.equal(headingFromMovement(1, 0), 'e');
  assert.equal(headingFromMovement(0, -1), 'n');
  assert.equal(headingFromMovement(0, 1), 's');
  const campaign = createCampaign(404);
  assert.equal(campaign.player.heading, 'e');
  const movedWest = applyAction(applyAction(campaign, { type: 'move', direction: 'e' }).state, { type: 'move', direction: 'w' });
  assert.equal(movedWest.accepted, true);
  assert.equal(movedWest.state.player.heading, 'w');
  const enemyToTheLeft = legacyEnemy({ id: 'left-target', kind: 'enemy', x: movedWest.state.player.x - 1, y: movedWest.state.player.y, hp: 10, damage: 0, xp: 1 });
  movedWest.state.floor.entities = [enemyToTheLeft];
  movedWest.state.floor.map![enemyToTheLeft.y][enemyToTheLeft.x] = 0;
  const bumpedLeft = applyAction(movedWest.state, { type: 'move', direction: 'w' });
  assert.equal(bumpedLeft.state.player.heading, 'w');
});
test('WorldRender keeps every authored repaired wall tile, including interior wall cells', () => {
  const campaign = createCampaign(17); const wallTiles = Array(10000).fill(0); wallTiles[0] = 20;
  const world = WorldRender.Render({ map: campaign.floor.map, entities: campaign.floor.entities, player: campaign.player, wallTiles });
  assert.deepEqual(world.walls.find(({ x, y }) => x === 0 && y === 0)!?.frame, 19);
});
test('floating text anchors to the target cell top edge across camera movement and zoom', () => {
  const player = { x: 10, y: 10 }; const target = { x: 11, y: 9 };
  const center = getCameraCenter({ mode: 'center', player, visibleWidth: 10, visibleHeight: 8 });
  assert.deepEqual(getWorldScreenPosition({ ...target, center, viewportWidth: 300, viewportHeight: 200, tileCssSize: 32 }), { left: 182, top: 52 });
  assert.deepEqual(getWorldScreenPosition({ ...target, center, viewportWidth: 300, viewportHeight: 200, tileCssSize: 64 }), { left: 214, top: 4 });
  const movedCenter = getCameraCenter({ mode: 'center', player: { x: 11, y: 9 }, visibleWidth: 10, visibleHeight: 8 });
  assert.deepEqual(getWorldScreenPosition({ ...target, center: movedCenter, viewportWidth: 300, viewportHeight: 200, tileCssSize: 32 }), { left: 150, top: 84 });
});
test('mouse coordinates select the cell centered under the pointer across scale factors', () => {
  const center = { x: 10, y: 20 };
  for (const tileCssSize of [8, 16, 32, 48, 64, 128]) {
    const viewportWidth = tileCssSize * 10, viewportHeight = tileCssSize * 8;
    for (const cell of [{ x: 10, y: 20 }, { x: 9, y: 19 }, { x: 13, y: 22 }]) {
      const point = getWorldCellScreenCenter({ ...cell, center, viewportWidth, viewportHeight, tileCssSize });
      assert.deepEqual(getWorldCellAtScreenPosition({ screenX: point.left, screenY: point.top, center, viewportWidth, viewportHeight, tileCssSize }), cell);
      assert.deepEqual(getWorldCellAtScreenPosition({ screenX: point.left - tileCssSize / 2 + 0.01, screenY: point.top + tileCssSize / 2 - 0.01, center, viewportWidth, viewportHeight, tileCssSize }), cell);
    }
  }
});
test('a held selection remains on its original world cell as the camera scrolls', () => {
  const selected = { x: 14, y: 9 };
  const viewportWidth = 320, viewportHeight = 180, tileCssSize = 32;
  for (const center of [{ x: 10, y: 10 }, { x: 11, y: 10 }, { x: 12, y: 9 }]) {
    const position = getWorldCellScreenCenter({ ...selected, center, viewportWidth, viewportHeight, tileCssSize });
    assert.deepEqual(getWorldCellAtScreenPosition({ screenX: position.left, screenY: position.top, center, viewportWidth, viewportHeight, tileCssSize }), selected);
  }
});
test('cardinal A* routes around terrain, rejects sealed destinations, and honors occupancy', () => {
  const aroundWall = { map: [[0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0]], entities: [] };
  const route = present(findCardinalPath(aroundWall, { x: 0, y: 1 }, { x: 4, y: 1 }));
  assert.deepEqual(route.at(0), { x: 0, y: 1 }); assert.deepEqual(route.at(-1), { x: 4, y: 1 });
  assert.ok(route.every((cell, index) => !index || Math.abs(cell.x - route[index - 1].x) + Math.abs(cell.y - route[index - 1].y) === 1));
  assert.equal(findCardinalPath({ map: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], entities: [] }, { x: 0, y: 0 }, { x: 2, y: 2 }), null);
  assert.equal(findCardinalPath({ map: [[0, 0, 0]], entities: [{ id: 'blocker', x: 1, y: 0 }] }, { x: 0, y: 0 }, { x: 2, y: 0 }), null);
  assert.deepEqual(findCardinalPath({ map: [[0, 0, 0]], entities: [legacyEnemy({ id: 'target', kind: 'enemy', x: 2, y: 0 })] }, { x: 0, y: 0 }, { x: 2, y: 0 }), [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
});

test('selected grid cell follows only the next A* route step', () => {
  const campaign = { player: { x: 0, y: 1 }, floor: { map: [[0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0]], entities: [] } };
  assert.equal(getMouseMovementFromSelectedCell(null, campaign), null);
  assert.equal(getMouseMovementFromSelectedCell({ x: 4, y: 1, pressed: false }, campaign), null);
  const path = present(getMousePathFromSelectedCell({ x: 4, y: 1, pressed: true }, campaign));
  const move = getMouseMovementFromSelectedCell({ x: 4, y: 1, pressed: true }, campaign, path);
  assert.ok(path.length > 2); assert.deepEqual(move, { direction: 'n', sprint: false });
  const moved = applyAction(legacyMapCampaign({ ...campaign, floor: { ...campaign.floor, time: 0, level: 1 }, progression: { attributes: { health: 25, stamina: 25, offense: 10, defense: 8, mana: 20 }, level: 1, xp: 0, nextXp: 100, difficulty: 1 }, player: { ...campaign.player, resources: { health: { current: 25, currentMax: 25 }, stamina: { current: 25, currentMax: 25 }, offense: { current: 10, currentMax: 10 }, defense: { current: 8, currentMax: 8 }, mana: { current: 20, currentMax: 20 }, xp: { current: 0, currentMax: 100, level: 1 } }, equipment: { weapons: [null, null], armor: [null, null] }, inventory: [], inventoryCapacity: 10, abilities: [], sneaking: false }, counters: {}, world: 'One', realm: 'Underground 1', objective: '', log: [] }), { type: 'move', direction: present(move).direction });
  assert.equal(moved.accepted, true); assert.deepEqual({ x: moved.state.player.x, y: moved.state.player.y }, path[1]); assert.equal(moved.state.floor.time, 1);
  assert.equal(getMouseMovementFromSelectedCell({ x: 2, y: 2, pressed: true }, { ...campaign, floor: { ...campaign.floor, map: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] } }), null);
});
test('game Zoom presets map a 32 CSS-pixel tile independently of backing density', () => {
  assert.deepEqual(gameZoomPresets.map((zoom) => getTileCssSize(zoom)), [8, 16, 32, 64, 128]);
  for (const zoom of gameZoomPresets) for (const dpr of [1, 1.5, 2, 3]) assert.equal(getTileCssSize(zoom), 32 * zoom);
});

test('WASD and arrow input track held directions independently and delay held-key repeats', () => {
  for (const [code, direction] of Object.entries({ KeyW: 'n', KeyA: 'w', KeyS: 's', KeyD: 'e', ArrowUp: 'n', ArrowLeft: 'w', ArrowDown: 's', ArrowRight: 'e' })) assert.deepEqual(getMovementKey({ code }), { code, direction });
  const held = new Map<string, { direction: Direction }>(); held.set('KeyW', { direction: 'n' }); held.set('ArrowRight', { direction: 'e' });
  assert.deepEqual(getLatestMovement(held), { direction: 'e', sprint: false }); held.delete('ArrowRight');
  assert.deepEqual(getLatestMovement(held), { direction: 'n', sprint: false }); assert.deepEqual(getLatestMovement(held, true), { direction: 'n', sprint: true });
  assert.equal(present(getMovementKey({ key: 'D' })).direction, 'e');
  assert.equal(WALK_INITIAL_DELAY, 400);
  assert.equal(WALK_REPEAT_DELAY, 200);
  assert.equal(SPRINT_INITIAL_DELAY, 250);
  assert.equal(SPRINT_REPEAT_DELAY, 125);
  assert.equal(getMoveInitialDelay(false), WALK_INITIAL_DELAY);
  assert.equal(getMoveInitialDelay(true), SPRINT_INITIAL_DELAY);
  assert.equal(getMoveRepeatDelay(false), WALK_REPEAT_DELAY);
  assert.equal(getMoveRepeatDelay(true), SPRINT_REPEAT_DELAY);
  assert.equal(getMoveScheduleDelay(false), WALK_INITIAL_DELAY);
  assert.equal(getMoveScheduleDelay(true), SPRINT_INITIAL_DELAY);
  assert.equal(getMoveScheduleDelay(true, true), SPRINT_REPEAT_DELAY);
});

test('the game starts at time tick one, which is safe from enemy actions', () => {
  const campaign = createCampaign(71); const { x, y } = campaign.player;
  assert.equal(campaign.floor.time, 1);
  for (let offset = 1; offset <= 5; offset++) campaign.floor.map![y][x + offset] = 0;
  campaign.floor.entities = [legacyEnemy({ id: 'slow-enemy', kind: 'enemy', name: 'Slow Enemy', x: x + 4, y, hp: 10, damage: 1, xp: 1 })];
  const first = applyAction(campaign, { type: 'move', direction: 'e' });
  assert.equal(first.state.floor.time, 2); assert.equal(first.state.floor.entities[0].x, x + 4);
  const second = applyAction(first.state, { type: 'move', direction: 'e' });
  assert.equal(second.state.floor.time, 3); assert.equal(second.state.floor.entities[0].x, x + 3);
});

test('enemies cannot move or attack on time tick one', () => {
  const campaign = createCampaign(73); const { x, y } = campaign.player;
  campaign.floor.entities = [legacyEnemy({ id: 'adjacent-enemy', kind: 'enemy', name: 'Adjacent Enemy', x: x + 1, y, hp: 10, damage: 99, xp: 1, actionCooldown: 1, nextActionAt: 1 })];
  campaign.floor.map![y][x + 1] = 0;
  const result = applyAction({ ...campaign, floor: { ...campaign.floor, time: 0 } }, { type: 'wait' });
  assert.equal(result.state.floor.time, 1);
  assert.equal(result.state.player.resources.health.current, campaign.player.resources.health.current);
  assert.equal(present(result.state.floor.entities.find((entity): entity is Enemy => entity.kind === 'enemy')).nextActionAt, 1);
});

test('turn presentation tweens ordered enemies, retargets from displayed positions, and resets removed actors', () => {
  const previous = createCampaign(72); const { x, y } = previous.player;
  const first = legacyEnemy({ id: 'first', kind: 'enemy', name: 'First', x: x + 3, y, hp: 10, damage: 1, xp: 1 });
  const second = legacyEnemy({ id: 'second', kind: 'enemy', name: 'Second', x: x + 4, y, hp: 10, damage: 1, xp: 1 });
  const offscreen = legacyEnemy({ id: 'offscreen', kind: 'enemy', name: 'Offscreen', x: x + 20, y, hp: 10, damage: 1, xp: 1 });
  previous.floor.entities = [first, second, offscreen];
  const current = structuredClone(previous); const firstCurrent = current.floor.entities[0] as Enemy; const secondCurrent = current.floor.entities[1] as Enemy; const offscreenCurrent = current.floor.entities[2] as Enemy;
  firstCurrent.x--; secondCurrent.x--; offscreenCurrent.x--;
  const presentation = new TurnPresentationSystem();
  const plan = presentation.begin(previous, current, new Set(['second', 'first']), 0);
  assert.equal(plan.duration, TURN_PLAYBACK_DURATION_MS);
  assert.deepEqual(plan.enemies.map((enemy) => enemy.id), ['first', 'second']);
  assert.equal(plan.enemies[0].startAt, 0); assert.equal(plan.enemies[0].endAt, CHARACTER_MOVEMENT_DURATION_MS);
  assert.equal(plan.enemies[1].startAt, TURN_PLAYBACK_DURATION_MS / 2); assert.equal(plan.enemies[1].endAt, TURN_PLAYBACK_DURATION_MS / 2 + CHARACTER_MOVEMENT_DURATION_MS);
  assert.deepEqual(presentation.positionOf('offscreen', offscreenCurrent), { x: offscreenCurrent.x, y: offscreenCurrent.y });
  assert.equal(presentation.sample(0), true);
  assert.deepEqual(presentation.positionOf('first', firstCurrent), { x: first.x, y: first.y });
  assert.deepEqual(presentation.positionOf('second', secondCurrent), { x: second.x, y: second.y });
  assert.equal(presentation.sample(TURN_PLAYBACK_DURATION_MS / 2), true);
  assert.deepEqual(presentation.positionOf('second', secondCurrent), { x: second.x, y: second.y });
  assert.equal(presentation.sample(TURN_PLAYBACK_DURATION_MS / 2 + CHARACTER_MOVEMENT_DURATION_MS), false);
  assert.deepEqual(presentation.positionOf('second', secondCurrent), { x: secondCurrent.x, y: secondCurrent.y });
  const retargeted = structuredClone(current); retargeted.player.x += 2;
  presentation.begin(current, retargeted, new Set(['first', 'second']), TURN_PLAYBACK_DURATION_MS + CHARACTER_MOVEMENT_DURATION_MS);
  presentation.sample(TURN_PLAYBACK_DURATION_MS + CHARACTER_MOVEMENT_DURATION_MS + CHARACTER_MOVEMENT_DURATION_MS / 2);
  assert.ok(presentation.playerPositionOf(retargeted.player).x > current.player.x);
  assert.ok(presentation.playerPositionOf(retargeted.player).x < retargeted.player.x);
  presentation.flush();
  assert.equal(presentation.isActive, false);
  assert.deepEqual(presentation.positionOf('first', firstCurrent), { x: firstCurrent.x, y: firstCurrent.y });
  const reentered = presentation.begin(current, current, new Set(['second', 'first', 'offscreen']), TURN_PLAYBACK_DURATION_MS);
  assert.equal(reentered.duration, 0);
  assert.ok(presentation.rankOf('first') < presentation.rankOf('second'));
  assert.ok(presentation.rankOf('second') < presentation.rankOf('offscreen'));
  const removed = structuredClone(current); removed.floor.entities = removed.floor.entities.filter((entity) => entity.id !== 'offscreen');
  presentation.begin(current, removed, new Set(['first', 'second']), TURN_PLAYBACK_DURATION_MS);
  assert.equal(presentation.rankOf('offscreen'), Number.MAX_SAFE_INTEGER);
  const nextFloor = structuredClone(removed); nextFloor.floor.seed++;
  presentation.begin(removed, nextFloor, new Set(['second', 'first']), TURN_PLAYBACK_DURATION_MS);
  assert.ok(presentation.rankOf('first') < presentation.rankOf('second'));
});

test('turn presentation can bypass sub-grid movement with its feature boolean', () => {
  const previous = createCampaign(73); const current = structuredClone(previous); current.player.x++;
  const presentation = new TurnPresentationSystem(false);
  presentation.begin(previous, current, new Set(), 0);
  assert.deepEqual(presentation.playerPositionOf(current.player), { x: current.player.x, y: current.player.y });
  assert.equal(presentation.isActive, false);
});

test('turn presentation exposes a hop and shadow pulse only during character movement', () => {
  const previous = createCampaign(731); const current = structuredClone(previous); current.player.x++;
  const presentation = new TurnPresentationSystem();
  presentation.begin(previous, current, new Set(), 0);
  assert.equal(presentation.movementPulseOf('player', 0), 0);
  assert.equal(presentation.movementPulseOf('player', CHARACTER_MOVEMENT_DURATION_MS / 2), 1);
  assert.equal(presentation.movementPulseOf('player', CHARACTER_MOVEMENT_DURATION_MS), 0);
  assert.equal(presentation.movementPulseOf('missing', CHARACTER_MOVEMENT_DURATION_MS / 2), 0);
});

test('turn presentation shrinks the player after any Health loss', () => {
  const previous = createCampaign(731); const current = structuredClone(previous);
  current.player.resources.health.current--;
  const presentation = new TurnPresentationSystem();
  presentation.begin(previous, current, new Set(), 0);
  assert.equal(presentation.damageScaleOf('player', 0), 1);
  assert.equal(presentation.damageScaleOf('player', CHARACTER_MOVEMENT_DURATION_MS / 2), .9);
  assert.equal(presentation.damageScaleOf('player', CHARACTER_MOVEMENT_DURATION_MS), 1);
});

test('turn presentation changes player depth to the destination tile at the movement apex', () => {
  const previous = createCampaign(732); const current = structuredClone(previous); current.player.y++;
  const presentation = new TurnPresentationSystem();
  presentation.begin(previous, current, new Set(), 0);
  assert.equal(presentation.playerDepthPositionOf(current.player, CHARACTER_MOVEMENT_DURATION_MS / 2 - 1).y, previous.player.y);
  assert.equal(presentation.playerDepthPositionOf(current.player, CHARACTER_MOVEMENT_DURATION_MS / 2).y, current.player.y);
  assert.ok(presentation.playerPositionOf(current.player).y < current.player.y);
});

test('turn presentation moves a pushed barrel with the player sub-grid animation', () => {
  const previous = createCampaign(75);
  previous.floor.objectSets = [{ id: 'animated-set', kind: 'floor-trigger-door-barrel', barrel: { x: 48, y: 50 }, trigger: { x: 49, y: 50 }, door: { x: 54, y: 50 }, regionRole: 'optional-reward' }];
  const current = structuredClone(previous);
  current.player.x++;
  current.floor.objectSets![0].barrel.x++;
  const presentation = new TurnPresentationSystem();
  presentation.begin(previous, current, new Set(), 0);
  assert.deepEqual(presentation.positionOf('animated-set-barrel', current.floor.objectSets![0].barrel), { x: 48, y: 50 });
  presentation.sample(CHARACTER_MOVEMENT_DURATION_MS / 2);
  const barrel = presentation.positionOf('animated-set-barrel', current.floor.objectSets![0].barrel);
  const player = presentation.playerPositionOf(current.player);
  assert.ok(barrel.x > 48 && barrel.x < 49);
  assert.ok(player.x > previous.player.x && player.x < current.player.x);
  presentation.sample(CHARACTER_MOVEMENT_DURATION_MS);
  assert.deepEqual(presentation.positionOf('animated-set-barrel', current.floor.objectSets![0].barrel), { x: 49, y: 50 });
});

test('turn presentation accepts a newly visible enemy with no prior position', () => {
  const previous = createCampaign(74); previous.floor.entities = [];
  const current = structuredClone(previous); current.floor.entities = [legacyEnemy({ id: 'late-enemy', kind: 'enemy', x: current.player.x + 1, y: current.player.y, hp: 10, damage: 1, xp: 1 })];
  const presentation = new TurnPresentationSystem();
  assert.doesNotThrow(() => presentation.begin(previous, current, new Set(['late-enemy']), 0));
});

test('turn presentation spaces ten enemy starts and leaves an active tween unchanged for a rejected action', () => {
  const previous = createCampaign(74); const { x, y } = previous.player;
  previous.floor.entities = Array.from({ length: 10 }, (_, index) => legacyEnemy({ id: `enemy-${index}`, kind: 'enemy', name: `Enemy ${index}`, x: x + index + 3, y, hp: 10, damage: 1, xp: 1 }));
  const current = structuredClone(previous);
  for (const entity of current.floor.entities as Enemy[]) entity.x--;
  const presentation = new TurnPresentationSystem();
  const plan = presentation.begin(previous, current, new Set(current.floor.entities.map((entity) => entity.id)), 0);
  assert.deepEqual(plan.enemies.map((enemy) => enemy.startAt), [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]);
  const playerMoved = structuredClone(current); playerMoved.player.x++;
  presentation.begin(current, playerMoved, new Set(current.floor.entities.map((entity) => entity.id)), 1_000);
  presentation.sample(1_100);
  const beforeRejectedAction = presentation.playerPositionOf(playerMoved.player);
  presentation.begin(playerMoved, playerMoved, new Set(current.floor.entities.map((entity) => entity.id)), 1_100);
  presentation.sample(1_100);
  assert.deepEqual(presentation.playerPositionOf(playerMoved.player), beforeRejectedAction);
  assert.ok(beforeRejectedAction.x > current.player.x && beforeRejectedAction.x < playerMoved.player.x);
});

test('integrates collect, equipment preview and reorder, ability, potion, descent, and death events', () => {
  let state = createCampaign(72); state.floor.entities = [];
  const open = (x: number, y: number) => { state.floor.map![y][x] = 0; };
  const loot = { id: 'found-sword', name: 'Found Sword', group: 'weapons' as const, modifiers: { offense: 3 } };
  const x = state.player.x + 1, y = state.player.y; open(x, y);
  state.floor.entities = [{ id: 'world-sword', kind: 'item', x, y, item: loot }];
  const collected = applyAction(state, { type: 'move', direction: 'e' }); state = collected.state;
  assert.ok(collected.events.some((event) => event.type === 'item.collected'));
  state.player.equipment.weapons = [null, null];
  const preview = previewInventoryDrop(state, { kind: 'inventory', item: loot }, 'weapons', 0, null);
  assert.ok(preview); assert.equal(state.player.equipment.weapons[0], null); // Preview/cancel leaves source untouched.
  const equipped = applyAction(state, { type: 'equip', itemId: loot.id, group: 'weapons' as const, index: 0 }); state = equipped.state;
  state.player.inventory.push({ id: 'backup-sword', name: 'Backup Sword', group: 'weapons' as const, modifiers: { offense: 1 } });
  state = applyAction(state, { type: 'equip', itemId: 'backup-sword', group: 'weapons' as const, index: 1 }).state;
  const reordered = applyAction(state, { type: 'reorder-equipment', group: 'weapons' as const, index: 0, other: 1 }); state = reordered.state;
  assert.ok(reordered.events.some((event) => event.type === 'equipment.changed'));
  state.player.resources.health.current = 10;
  const healed = applyAction(state, { type: 'ability', index: 0 }); state = healed.state;
  assert.ok(healed.events.some((event) => event.type === 'ability.used'));
  const px = state.player.x, py = state.player.y + 1; open(px, py);
  state.floor.entities = [{ id: 'health-potion', kind: 'potion', resource: 'health', name: 'Health Potion', x: px, y: py }];
  const potion = applyAction(state, { type: 'move', direction: 's' }); state = potion.state;
  assert.ok(potion.events.some((event) => event.type === 'item.collected' && event.facts.destination === 'inventory')); assert.ok(state.player.inventory.some((item) => item.name === 'Health Potion'));
  const sx = state.player.x + 1, sy = state.player.y; open(sx, sy);
  state.floor.entities = [{ id: 'stairs', kind: 'stairs', x: sx, y: sy }];
  const stairArrival = applyAction(state, { type: 'move', direction: 'e' });
  assert.ok(stairArrival.events.some((event) => event.type === 'stairs.entered'));
  const descent = applyAction(stairArrival.state, { type: 'enter-stairs' }); state = descent.state;
  assert.ok(descent.events.some((event) => event.type === 'realm.entered'));
  assert.ok(!descent.events.some((event) => event.type === 'item.collected'));
  assert.equal(state.floor.level, 2); assert.equal(state.progression.difficulty, 2);
  const oldTime = state.floor.time, oldX = state.player.x, oldY = state.player.y;
  open(oldX + 1, oldY); state.floor.entities = [legacyEnemy({ id: 'fatal', kind: 'enemy', name: 'Fatal Enemy', x: oldX, y: oldY, hp: 10, damage: 999, xp: 1, actionCooldown: 1, nextActionAt: oldTime + 1 })];
  const death = applyAction(state, { type: 'move', direction: 'e' });
  assert.ok(death.events.some((event) => event.type === 'player.died'));
  assert.equal(death.events.filter((event) => event.type === 'time.advanced').length, 1);
  assert.equal(death.events.filter((event) => event.type === 'resource.changed' && event.facts.cause === 'enemy-attack').length, 1);
});

test('quick slots seed, transfer, stack, consume, and reject full resources', () => {
  const campaign = createCampaign(901);
  assert.deepEqual(campaign.player.inventory.map(({ name }) => name), ['Health Potion', 'Mana Potion']); assert.equal(campaign.player.inventory.find((item) => item.name === 'Mana Potion')?.quantity, 2);
  const health = campaign.player.inventory.find((item) => item.name === 'Health Potion')!;
  let result = applyAction(campaign, { type: 'assign-quick-slot', itemId: health.id, index: 0 });
  assert.equal(result.accepted, true); assert.equal(result.ticks, 1); assert.equal(result.state.player.quickSlots?.[0]?.quantity, 1);
  const mana = result.state.player.inventory.find((item) => item.name === 'Mana Potion')!;
  result = applyAction(result.state, { type: 'assign-quick-slot', itemId: mana.id, index: 1 });
  assert.equal(result.state.player.quickSlots?.[1]?.quantity, 2); assert.equal(result.state.player.inventory.length, 0);
  const full = structuredClone(result.state); full.player.resources.health.current = full.player.resources.health.currentMax;
  const rejected = applyAction(full, { type: 'use-quick-slot', index: 0 });
  assert.equal(rejected.accepted, false); assert.equal(rejected.ticks, 0); assert.equal(rejected.state.floor.time, full.floor.time);
  assert.equal(rejected.events[0].type, 'quick-slot.use.rejected'); assert.equal(rejected.events[0].facts.reason, 'resource-full');
  result.state.player.resources.mana.current = 0;
  result = applyAction(result.state, { type: 'use-quick-slot', index: 1 });
  assert.equal(result.accepted, true); assert.equal(result.state.player.quickSlots?.[1]?.quantity, 1); assert.equal(result.state.floor.time, 4);
  result = applyAction(result.state, { type: 'return-quick-slot', index: 1 });
  assert.equal(result.state.player.quickSlots?.[1], null); assert.equal(result.state.player.inventory.filter((item) => item.name === 'Mana Potion').length, 1);
});
