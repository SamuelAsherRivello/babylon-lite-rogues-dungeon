import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { contentConfig, getRenderingPolicy, pixelPerfectOptions } from '../src/content/babylon/config.ts';
import { getInitializationMessage } from '../src/content/babylon/initialization.ts';
import { gameZoomPresets, getRenderedTileCssSize, getTileCssSize } from '../src/content/world/zoom.ts';
import { sortGridRenderEntries } from '../src/systems/rendering/grid-render-order-system.ts';

test('sorts grid visuals by layer and then vertical position', () => {
  const entries = sortGridRenderEntries([
    { id: 'player', layer: 1, y: 4 },
    { id: 'lower-particle', layer: 1, y: 5 },
    { id: 'background', layer: 0, y: 99 },
    { id: 'upper-particle', layer: 1, y: 3 },
  ]);
  assert.deepEqual(entries.map(({ id }) => id), ['background', 'upper-particle', 'player', 'lower-particle']);
});

test('keeps Babylon Lite Pixel Perfect settings and WebGPU-only initialization', () => {
  assert.deepEqual(contentConfig, { renderer: 'babylon-lite', style: '2d' });
  assert.equal(getRenderingPolicy(contentConfig), 'pixel-perfect');
  assert.deepEqual(pixelPerfectOptions.engine, { msaaSamples: 1 });
  assert.equal(pixelPerfectOptions.texture.minFilter, 'nearest');
  assert.equal(pixelPerfectOptions.texture.magFilter, 'nearest');
  assert.equal(pixelPerfectOptions.texture.mipMaps, false);
  assert.equal(pixelPerfectOptions.texture.invertY, false, 'Tiled images keep their authored top row at the top of the game world');
  assert.match(getInitializationMessage(false, new Error('unsupported')), /requires WebGPU/);
  assert.match(getInitializationMessage(true, new Error('#47')), /requires WebGPU/);
});

test('uses Zoom presets whose 32-unit tile stays independent of backing density', () => {
  assert.deepEqual(gameZoomPresets, [0.25, 0.5, 1, 2, 4]);
  assert.deepEqual(gameZoomPresets.map((zoom) => getTileCssSize(zoom)), [8, 16, 32, 64, 128]);
  for (const zoom of gameZoomPresets) for (const dpr of [1, 1.5, 2, 3]) assert.equal(getTileCssSize(zoom), 32 * zoom);
});

test('derives CSS tile size from the same backing scale used by the sprite view', () => {
  assert.equal(getRenderedTileCssSize({ zoom: 2, devicePixelRatio: 1, backingPixelsPerCssPixel: 1 }), 64);
  assert.equal(getRenderedTileCssSize({ zoom: 2, devicePixelRatio: 1.5, backingPixelsPerCssPixel: 1.5 }), 64);
  assert.equal(getRenderedTileCssSize({ zoom: 2, devicePixelRatio: 1.5, backingPixelsPerCssPixel: 2 }), 48);
});

test('mounts the dungeon and minimap in Babylon Lite from the same world component', async () => {
  const source = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  assert.match(source, /createEngine\(canvas, pixelPerfectOptions\.engine\)/);
  assert.match(source, /createSurface\(record\.engine, canvas\)/);
  assert.match(source, /createSpriteRenderer\(surface/);
  assert.match(source, /sharedTextures/);
  assert.match(source, /registerSpriteRenderer\(renderer\)/);
  assert.match(source, /await startEngine\(engine\)/);
  assert.match(source, /resizeSurface\(surface\)/);
  assert.match(source, /disposeSurface\(surface\)/);
  assert.match(source, /minimap = false/);
  assert.match(source, /centerSprite2DView\(layer\.view, centerX, centerY/);
  assert.match(source, /disposeSpriteRenderer\(renderer\)/);
  assert.match(source, /createDynamicTexture\(engine, 32, 32/);
  assert.match(source, /updateDynamicTexture\(engine, debugTexture/);
  assert.match(source, /const debugLayer = createSprite2DLayer/);
  assert.match(source, /world\.diagnostics/);
  assert.match(source, /while \(terrainHandles\.length < world\.grounds\.length\)/);
  assert.match(source, /while \(wallHandles\.length < world\.walls\.length\)/);
  assert.match(source, /terrainHandles\.slice\(world\.grounds\.length\)/);
  assert.match(source, /wallHandles\.slice\(world\.walls\.length\)/);
  assert.match(source, /debugHandles\.slice\(world\.diagnostics\.length \+ world\.wallDiagnostics\.length\)/);
  assert.match(source, /getInitializationMessage\(Boolean\(navigator\.gpu\), error\)/);
  assert.doesNotMatch(source, /shouldRenderWorld/, 'the main renderer mounts immediately behind the loading iris');
  assert.match(source, /irisPhase === "closed" && rendererLoaded/, 'the iris reveals only after the mounted renderer is ready');
  assert.doesNotMatch(source, /getContext\(["'](?:2d|webgl2?)["']/i);
});

test('uses controller-derived path availability to render an unreachable mouse reticle as black', async () => {
  const world = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /getMousePathFromSelectedCell\(selectedGridSpot, campaign\)/);
  assert.match(game, /selectedCellReachable=\{selectedCellReachable\}/);
  assert.match(world, /selectedCellReachable === false \? "invalid"/);
  assert.match(world, /grid_reticle \$\{reticleKind\}/);
});

test('uses current camera state and reconfiguration inputs when framing the main world', async () => {
  const source = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  assert.match(source, /const \{ camera: cameraNow, zoom: zoomNow \} = latestRef\.current/);
  assert.match(source, /mapWidth, mapHeight/);
  assert.match(source, /const resetKey = \[/);
  assert.match(source, /window\.devicePixelRatio/);
  assert.match(source, /resizeSurface\(surface\); draw\(\)/);
});

test('declares and retains the provided 32-pixel Tiled dungeon assets', async () => {
  const tileset = await readFile(new URL('../public/assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx', import.meta.url), 'utf8');
  const world = await readFile(new URL('../src/systems/rendering/babylon-render-system.tsx', import.meta.url), 'utf8');
  assert.match(tileset, /tilewidth="32" tileheight="32"/);
  assert.match(tileset, /tileset-dungeon\.png/);
  assert.match(world, /cellWidthPx: 32, cellHeightPx: 32, columns: 12, rows: 9/);
  for (const path of [
    '../public/assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png',
    '../public/assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/frames/idle/down/00.png',
    '../public/assets/art/vendors/dungeons-and-pixels-v1.4/enemies/rat/frames/idle/00.png',
  ]) {
    const bytes = await readFile(new URL(path, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  }
});
