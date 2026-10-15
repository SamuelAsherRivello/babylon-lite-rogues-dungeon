import type { MouseEvent } from "react";
import type { EngineContext, SurfaceContext, Texture2D, DynamicTexture2D, SpriteAtlas, SpriteRenderer, Sprite2DHandle } from "@babylonjs/lite";
import type { Campaign, Enemy, Feedback, Position, Resources, SelectedCell } from "../../game/types.ts";
interface SharedEngine { engine: EngineContext; primaryCanvas: HTMLCanvasElement; started: boolean }
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addSprite2D, centerSprite2DView, createDynamicTexture, createEngine, createGridSpriteAtlas, createSprite2DLayer,
  createSpriteRenderer, createSurface, disposeEngine, disposeSpriteAtlas, disposeSpriteRenderer, disposeSurface,
  loadTexture2D, registerSpriteRenderer, releaseTexture, resizeSurface, startEngine, updateDynamicTexture, updateSprite2D,
} from "@babylonjs/lite";
import { getCameraCenter, getWorldCellAtScreenPosition, getWorldCellScreenCenter, getWorldScreenPosition, WorldRender } from "./world-render-system.ts";
import { getRenderedTileCssSize } from "../../content/world/zoom.ts";
import { pixelPerfectOptions } from "../../content/babylon/config.ts";
import { getInitializationMessage } from "../../content/babylon/initialization.ts";
import { findWorldTooltipPosition } from "../../content/world/tooltip-placement.ts";
import { resourceNames } from "../procedural/world-procedural-system.ts";
import { isWalkable } from "../procedural/level-grid-system.ts";
import { createHeroWarriorAnimationEntity, heroWarriorIdleAnimationForHeading } from "../../content/characters/hero-warrior/hero-warrior-animation.ts";
import { particleBoundsAt, particleBoundsAtTile, particleExpired, particleFrameUrl, type ParticleEffect } from "../animation/particle-effects-system.ts";

const texturePaths = {
  tiles: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/Tilesets/Tileset_Dungeon.png`,
  rat: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/Enemies/Rat/Frames/Idle/00.png`,
  skeleton: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/Enemies/Skeleton warrior/Frames/Idle/Down/00.png`,
  items: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/Tilesets/Items_Static.png`,
};
const clear = { r: 0.06, g: 0.05, b: 0.09, a: 1 };
let sharedEnginePromise: Promise<SharedEngine> | null = null;

export function renderParticle(effect: ParticleEffect, x: number, y: number, width: number, height: number) {
  const bounds = particleBoundsAt(x, y, width, height);
  return <img key={effect.id} className="world_particle" src={particleFrameUrl(effect)} width={bounds.width} height={bounds.height} style={{ left: bounds.x, top: bounds.y }} alt="" aria-hidden="true" />;
}

export function renderParticleAtTile(effect: ParticleEffect, request: Parameters<typeof particleBoundsAtTile>[0]) {
  const bounds = particleBoundsAtTile(request);
  return renderParticle(effect, bounds.x, bounds.y, bounds.width, bounds.height);
}
let sharedEngineRecord: SharedEngine | null = null;
let surfaceReferences = 0;
const sharedTextures = new Map<string, { refs: number; promise: Promise<Texture2D> }>();
const resourceIcons = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★" };

function EnemyResourceRows({ resources }: { resources: Resources }) {
  return <div className="resource_list enemy_tooltip_resources">{resourceNames.map((name) => {
    const value = resources[name]; const fill = value.currentMax > 0 ? Math.max(0, Math.min(100, value.current / value.currentMax * 100)) : 0;
    return <div key={name} className={`resource resource_${name}`} aria-label={`${name}: ${value.current} of ${value.currentMax}`}><span>{resourceIcons[name]}</span><div className="resource_track"><i style={{ width: `${fill}%` }} /><b style={{ left: "100%" }} />{name === "xp" && <em>{String(value.level ?? 1).padStart(2, "0")}</em>}</div></div>;
  })}</div>;
}

async function acquireSharedSurface(canvas: HTMLCanvasElement) {
  if (!sharedEnginePromise) {
    sharedEnginePromise = createEngine(canvas, pixelPerfectOptions.engine).then((engine) => {
      sharedEngineRecord = { engine, primaryCanvas: canvas, started: false };
      return sharedEngineRecord;
    }).catch((error) => { sharedEnginePromise = null; throw error; });
  }
  const record = await sharedEnginePromise;
  const surface = canvas === record.primaryCanvas ? record.engine : createSurface(record.engine, canvas);
  surfaceReferences++;
  return { ...record, surface, isPrimary: surface === record.engine };
}

function releaseSharedSurface(surface: SurfaceContext | null) {
  if (surface && surface !== sharedEngineRecord?.engine) disposeSurface(surface);
  surfaceReferences = Math.max(0, surfaceReferences - 1);
  if (!surfaceReferences && sharedEngineRecord) {
    disposeEngine(sharedEngineRecord.engine);
    sharedEngineRecord = null; sharedEnginePromise = null;
  }
}

async function acquireSharedTexture(engine: EngineContext, path: string) {
  let entry = sharedTextures.get(path);
  if (!entry) { entry = { refs: 0, promise: loadTexture2D(engine, path, pixelPerfectOptions.texture) }; sharedTextures.set(path, entry); }
  entry.refs++;
  try { return await entry.promise; }
  catch (error) { entry.refs--; if (!entry.refs) sharedTextures.delete(path); throw error; }
}

function releaseSharedTexture(path: string) {
  const entry = sharedTextures.get(path); if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) { entry.promise.then(releaseTexture).catch(() => {}); sharedTextures.delete(path); }
}

export function BabylonWorld({ campaign, zoom = 1, minimap = false, camera = "center", mouseInteraction = false, floatingFeedback = [], particleEffects = [], selectedCell = null, selectedCellReachable = null, onSelectedCellChange, onZoom }: { campaign: Campaign; zoom?: number; minimap?: boolean; camera?: string; mouseInteraction?: boolean; floatingFeedback?: Feedback[]; particleEffects?: ParticleEffect[]; selectedCell?: SelectedCell | null; selectedCellReachable?: boolean | null; onSelectedCellChange?(cell: SelectedCell | null): void; onZoom?(step: number): void }) {
  const hostRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const sceneRef = useRef<{ draw(): void } | null>(null); const latestRef = useRef({ campaign, zoom, minimap, camera });
  const cameraCenterRef = useRef<(Position & { key: string }) | null>(null);
  const mouseDownRef = useRef(false);
  const pointerRef = useRef<Position | null>(null);
  const selectedCellRef = useRef(selectedCell);
  const [message, setMessage] = useState("Preparing the crypt…");
  const [, setParticleClock] = useState(0);
  useEffect(() => { if (!particleEffects.length) return undefined; let frame = 0; const tick = () => { setParticleClock(performance.now()); if (particleEffects.some((effect) => !particleExpired(effect))) frame = requestAnimationFrame(tick); }; frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame); }, [particleEffects]);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const tooltipRef = useRef<HTMLElement>(null);
  latestRef.current = { campaign, zoom, minimap, camera };
  selectedCellRef.current = selectedCell;
  const cellSizeAt = (rect: DOMRect, zoomValue = latestRef.current.zoom) => {
    const canvas = canvasRef.current;
    const backingPixelsPerCssPixel = canvas && canvas.width > 0 && rect.width > 0 ? canvas.width / rect.width : window.devicePixelRatio || 1;
    return getRenderedTileCssSize({ zoom: typeof zoomValue === "number" ? zoomValue : 1, devicePixelRatio: window.devicePixelRatio || 1, backingPixelsPerCssPixel });
  };
  const getViewCenter = (rect: DOMRect, state = latestRef.current.campaign) => {
    const { camera: cameraNow, zoom: zoomNow } = latestRef.current;
    const tileCss = cellSizeAt(rect, zoomNow); const visibleWidth = rect.width / tileCss; const visibleHeight = rect.height / tileCss;
    const mapWidth = state.floor.width ?? state.floor.cells?.[0]?.length ?? 0; const mapHeight = state.floor.height ?? state.floor.cells?.length ?? 0;
    const resetKey = [state.floor.seed, mapWidth, mapHeight, cameraNow, zoomNow, rect.width, rect.height, canvasRef.current?.width ?? 0, canvasRef.current?.height ?? 0, window.devicePixelRatio || 1].join(":");
    const previousCenter = cameraCenterRef.current?.key === resetKey ? cameraCenterRef.current : state.player;
    const center = getCameraCenter({ mode: cameraNow, player: state.player, previousCenter, visibleWidth, visibleHeight, mapWidth, mapHeight });
    cameraCenterRef.current = { key: resetKey, ...center };
    return center;
  };
  const targetKindAt = (x: number | undefined, y: number | undefined) => {
    const entity = campaign.floor.entities.find((entry) => entry.x === x && entry.y === y);
    return entity?.kind === "enemy" ? "enemy" : entity && ["item", "potion", "key", "gold", "chest", "stairs"].includes(entity.kind) ? "item" : isWalkable(campaign.floor, x ?? NaN, y ?? NaN) ? "valid" : "invalid";
  };
  const targetAtScreenPosition = (point: Position, rect: DOMRect) => {
    const cellSize = cellSizeAt(rect);
    const center = getViewCenter(rect);
    const { x, y } = getWorldCellAtScreenPosition({ screenX: point.x, screenY: point.y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: cellSize });
    return { x, y, kind: targetKindAt(x, y), ...getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: cellSize }), size: cellSize };
  };
  const targetAt = (event: MouseEvent<HTMLDivElement>) => {
    if (!mouseInteraction) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerRef.current = point;
    return targetAtScreenPosition(point, rect);
  };
  const selectCell = (target: SelectedCell | null, pressed = false, sprint = false) => {
    const next = target && { ...target, pressed, sprint };
    selectedCellRef.current = next;
    onSelectedCellChange?.(next);
  };
  const pointerMove = (event: MouseEvent<HTMLDivElement>) => { if (!mouseDownRef.current) selectCell(targetAt(event)); };
  const pointerDown = (event: MouseEvent<HTMLDivElement>) => { const target = targetAt(event); if (!target) return; event.preventDefault(); mouseDownRef.current = true; selectCell(target, true, event.button === 2); };
  const pointerUp = (event: MouseEvent<HTMLDivElement>) => { mouseDownRef.current = false; selectCell(targetAt(event)); };
  const pointerLeave = () => { if (!mouseDownRef.current) { pointerRef.current = null; selectCell(null); } };

  useEffect(() => {
    const host = hostRef.current!; const canvas = canvasRef.current!;
    let cancelled = false; let engine: EngineContext | null = null; let surface: SurfaceContext | null = null; let renderer: SpriteRenderer | null = null; let atlases: SpriteAtlas[] = []; let textures: Record<string, Texture2D> = {}; let acquiredTexturePaths: string[] = []; let observers: { disconnect(): void }[] = []; let debugTexture: DynamicTexture2D | null = null; let animationFrameId = 0; let heroAnimation: ReturnType<typeof createHeroWarriorAnimationEntity> | null = null;
    const setup = async () => {
      try {
        if (!navigator.gpu) throw new Error("WebGPU is not available in this browser.");
        const acquired = await acquireSharedSurface(canvas); engine = acquired.engine; surface = acquired.surface;
        if (cancelled) { releaseSharedSurface(surface); surface = null; return; }
        heroAnimation = createHeroWarriorAnimationEntity(import.meta.env.BASE_URL);
        const activeHeroAnimation = heroAnimation;
        const heroFrameSources = new Map(activeHeroAnimation.listAnimations().flatMap((animation) => animation.frames.map((frame) => [frame.path, frame] as const)));
        for (const [key, path] of Object.entries(texturePaths)) {
          const texture = await acquireSharedTexture(engine, path); acquiredTexturePaths.push(path);
          if (cancelled) { acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; releaseSharedSurface(surface); surface = null; return; }
          textures[key] = texture;
        }
        const heroTextures = new Map<string, Texture2D>();
        for (const path of heroFrameSources.keys()) {
          const texture = await acquireSharedTexture(engine, path); acquiredTexturePaths.push(path);
          if (cancelled) { acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; releaseSharedSurface(surface); surface = null; return; }
          heroTextures.set(path, texture);
        }
        const tileAtlas = createGridSpriteAtlas(textures.tiles, { cellWidthPx: 32, cellHeightPx: 32, columns: 12, rows: 9, pivot: [0.5, 0.5] });
        const debugCanvas = document.createElement("canvas"); debugCanvas.width = 32; debugCanvas.height = 32;
        const contextGetter = "getContext"; const debugContext = debugCanvas[contextGetter]("2d")!; debugContext.fillStyle = "rgba(235, 35, 45, 0.52)"; debugContext.fillRect(0, 0, 32, 32);
        debugTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, debugTexture, debugCanvas, { invertY: false });
        const debugAtlas = createGridSpriteAtlas(debugTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const actorAtlases: Record<string, SpriteAtlas> = {};
        for (const key of ["rat", "skeleton"]) actorAtlases[key] = createGridSpriteAtlas(textures[key], { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const itemAtlas = createGridSpriteAtlas(textures.items, { cellWidthPx: 32, cellHeightPx: 32, columns: 3, rows: 3, pivot: [0.5, 0.5] });
        activeHeroAnimation.start();
        const heroVisuals = [...heroFrameSources.values()].map((frame) => {
          const texture = heroTextures.get(frame.path)!;
          const atlas = createGridSpriteAtlas(texture, { cellWidthPx: frame.widthPx, cellHeightPx: frame.heightPx, columns: 1, rows: 1, pivot: [0.5, 1] });
          const layer = createSprite2DLayer(atlas, { pivot: [0.5, 1] });
          const handle = addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [frame.widthPx, frame.heightPx], frame: 0 });
          atlases.push(atlas);
          return { frame, layer, handle };
        });
        const terrainLayer = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] });
        const wallLayer = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] });
        const debugLayer = createSprite2DLayer(debugAtlas, { pivot: [0.5, 0.5] });
        const actorLayers = Object.fromEntries(Object.entries(actorAtlases).map(([key, atlas]) => [key, createSprite2DLayer(atlas, { pivot: [0.5, 0.5] })]));
        const itemLayer = createSprite2DLayer(itemAtlas, { pivot: [0.5, 0.5] });
        const model = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, player: campaign.player, start: campaign.floor.start, groundTiles: campaign.floor.tiledGrounds, wallTiles: campaign.floor.tiledWalls, view: minimap ? "minimap" : "game", detail: minimap ? "simplified" : "full" });
        const terrainHandles = model.grounds.map(({ worldX, worldY, frame }) => addSprite2D(terrainLayer, { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const wallHandles = model.walls.map(({ worldX, worldY, frame }) => addSprite2D(wallLayer, { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const debugHandles = [...model.diagnostics, ...model.wallDiagnostics].map(({ worldX, worldY }) => addSprite2D(debugLayer, { positionPx: [worldX, worldY], sizePx: [32, 32], frame: 0 }));
        const actors: Record<string, Sprite2DHandle[]> = { rat: [], skeleton: [] };
        for (const key of Object.keys(actors)) for (let i = 0; i < 40; i++) actors[key].push(addSprite2D(actorLayers[key], { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const items = Array.from({ length: 40 }, (_, i) => addSprite2D(itemLayer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: i % 9 }));
        const viewLayers = [terrainLayer, wallLayer, debugLayer, itemLayer, actorLayers.rat, actorLayers.skeleton, ...heroVisuals.map(({ layer }) => layer)];
        renderer = createSpriteRenderer(surface, { layers: viewLayers, clear: true, clearValue: clear });
        registerSpriteRenderer(renderer);
        const draw = () => {
          const state = latestRef.current.campaign;
          const { zoom: zoomNow, minimap: isMinimap } = latestRef.current;
          const scale = typeof zoomNow === "number" ? zoomNow : 1;
          const renderWidth = canvas.width || canvas.clientWidth || host.clientWidth || 320;
          const renderHeight = canvas.height || canvas.clientHeight || host.clientHeight || 180;
          const world = WorldRender.Render({ cells: state.floor.cells, entities: state.floor.entities, player: state.player, start: state.floor.start, groundTiles: state.floor.tiledGrounds, wallTiles: state.floor.tiledWalls, view: isMinimap ? "minimap" : "game", detail: isMinimap ? "simplified" : "full" });
          const mapWidth = world.width * 32;
          const mapHeight = world.height * 32;
          const mapScale = Math.min(renderWidth / mapWidth, renderHeight / mapHeight) * 0.92;
          const viewScale = isMinimap ? mapScale : scale * (window.devicePixelRatio || 1);
          const rect = host.getBoundingClientRect(); const cameraCenter = isMinimap ? state.player : getViewCenter(rect, state);
          const centerX = cameraCenter.x * 32 + 16;
          const centerY = cameraCenter.y * 32 + 16;
          viewLayers.forEach((layer) => {
            layer.view.zoom = viewScale;
            centerSprite2DView(layer.view, centerX, centerY, renderWidth, renderHeight);
          });
          while (terrainHandles.length < world.grounds.length) terrainHandles.push(addSprite2D(terrainLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
          while (wallHandles.length < world.walls.length) wallHandles.push(addSprite2D(wallLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
          while (debugHandles.length < world.diagnostics.length + world.wallDiagnostics.length) debugHandles.push(addSprite2D(debugLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
          world.grounds.forEach((tile, index) => updateSprite2D(terrainHandles[index], { positionPx: tile.frame === null ? [-10000, -10000] : [tile.worldX, tile.worldY], frame: tile.frame ?? 0 }));
          terrainHandles.slice(world.grounds.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          world.walls.forEach((tile, index) => updateSprite2D(wallHandles[index], { positionPx: tile.frame === null ? [-10000, -10000] : [tile.worldX, tile.worldY], frame: tile.frame ?? 0 }));
          wallHandles.slice(world.walls.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          [...world.diagnostics, ...world.wallDiagnostics].forEach((cell, index) => updateSprite2D(debugHandles[index], { positionPx: [cell.worldX, cell.worldY], frame: 0 }));
          debugHandles.slice(world.diagnostics.length + world.wallDiagnostics.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          heroVisuals.forEach(({ handle }) => updateSprite2D(handle, { positionPx: [-10000, -10000] }));
          const playerHeading = state.player.heading ?? "e";
          const desiredIdleAnimation = heroWarriorIdleAnimationForHeading(playerHeading);
          if (activeHeroAnimation.getState().animation !== desiredIdleAnimation) activeHeroAnimation.selectAnimation(desiredIdleAnimation);
          const activeHeroFrame = heroVisuals.find(({ frame }) => frame.path === activeHeroAnimation.getState().frame.path);
          if (activeHeroFrame) updateSprite2D(activeHeroFrame.handle, { positionPx: [state.player.x * 32 + 16, state.player.y * 32 + 32], flipX: playerHeading === "w" });
          const byKind: Record<string, typeof world.actors> = { rat: world.actors.filter((actor) => actor.kind === "rat"), skeleton: world.actors.filter((actor) => actor.kind === "skeleton") };
          for (const key of Object.keys(actors)) actors[key].forEach((sprite, i) => { const actor = byKind[key][i]; updateSprite2D(sprite, { positionPx: actor ? [actor.worldX, actor.worldY] : [-10000,-10000], flipX: actor?.heading === "w" }); });
          items.forEach((sprite, i) => { const entity = world.objects[i]; const frame = entity?.kind === "item" ? 2 : entity?.kind === "chest" ? 0 : entity?.kind === "stairs" ? 1 : entity?.kind === "key" ? 5 : entity?.kind === "gold" ? 3 : entity?.kind === "potion" ? (entity.resource === "health" ? 6 : 7) : 8; updateSprite2D(sprite, { frame, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000] }); });
        };
        sceneRef.current = { draw };
        resizeSurface(surface); draw();
        if (acquired.isPrimary && sharedEngineRecord && !sharedEngineRecord.started) { await startEngine(engine); sharedEngineRecord.started = true; }
        if (cancelled) return;
        let lastAnimationTime = performance.now();
        const animate = (time: number) => {
          if (cancelled) return;
          activeHeroAnimation.update(Math.max(0, time - lastAnimationTime));
          lastAnimationTime = time;
          draw();
          animationFrameId = requestAnimationFrame(animate);
        };
        animationFrameId = requestAnimationFrame(animate);
        const observer = new ResizeObserver(() => { resizeSurface(surface!); draw(); }); observer.observe(host); observers.push(observer);
        window.addEventListener("resize", draw); observers.push({ disconnect: () => window.removeEventListener("resize", draw) });
        setMessage("");
      } catch (error) {
        console.error("Rogue's Dungeon Babylon Lite initialization failed:", error);
        if (renderer) { disposeSpriteRenderer(renderer); renderer = null; }
        atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); atlases = [];
        if (debugTexture) { releaseTexture(debugTexture); debugTexture = null; }
        heroAnimation?.dispose(); heroAnimation = null;
        acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; textures = {};
        if (surface) { releaseSharedSurface(surface); surface = null; } engine = null;
        if (!cancelled) setMessage(getInitializationMessage(Boolean(navigator.gpu), error));
      }
    };
    queueMicrotask(() => { if (!cancelled) void setup(); });
    return () => {
      cancelled = true; cancelAnimationFrame(animationFrameId); observers.forEach((observer) => observer.disconnect()); sceneRef.current = null;
      if (renderer) disposeSpriteRenderer(renderer); atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); if (debugTexture) releaseTexture(debugTexture); heroAnimation?.dispose(); heroAnimation = null; acquiredTexturePaths.forEach(releaseSharedTexture); if (surface) releaseSharedSurface(surface);
    };
  }, []);
  useEffect(() => {
    if (!mouseInteraction) return undefined;
    const releaseMouse = () => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;
      pointerRef.current = null;
      if (selectedCellRef.current) selectCell(selectedCellRef.current);
    };
    window.addEventListener("mouseup", releaseMouse);
    return () => window.removeEventListener("mouseup", releaseMouse);
  }, [mouseInteraction]);
  useEffect(() => {
    sceneRef.current?.draw();
    const rect = hostRef.current?.getBoundingClientRect();
    if (mouseInteraction && !mouseDownRef.current && pointerRef.current && rect) selectCell(targetAtScreenPosition(pointerRef.current, rect));
  }, [campaign, zoom, minimap, camera, mouseInteraction]);
  const rect = hostRef.current?.getBoundingClientRect();
  const reticleCellSize = rect ? cellSizeAt(rect) : 32;
  const reticleCenter = rect && selectedCell ? getWorldCellScreenCenter({ x: selectedCell.x, y: selectedCell.y, center: getViewCenter(rect), viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: reticleCellSize }) : null;
  const reticleStyle = selectedCell && rect ? {
    left: selectedCell.pressed ? reticleCenter!.left : selectedCell.left,
    top: selectedCell.pressed ? reticleCenter!.top : selectedCell.top,
    width: selectedCell.pressed ? reticleCellSize : selectedCell.size,
    height: selectedCell.pressed ? reticleCellSize : selectedCell.size,
  } : null;
  const feedbackRect = hostRef.current?.getBoundingClientRect();
  const feedbackCenter = feedbackRect && !minimap ? getViewCenter(feedbackRect) : null;
  const feedbackCellSize = feedbackRect ? cellSizeAt(feedbackRect) : 32;
  const hoveredEnemy = mouseInteraction && selectedCell && !selectedCell.pressed ? campaign.floor.entities.find((entry): entry is Enemy => entry.kind === "enemy" && entry.x === selectedCell.x && entry.y === selectedCell.y) : null;
  useLayoutEffect(() => {
    if (!hoveredEnemy || !selectedCell) { setTooltipPosition(null); return undefined; }
    const update = () => {
      const host = hostRef.current; const panel = tooltipRef.current;
      if (!host || !panel) return;
      const rect = host.getBoundingClientRect(); const size = cellSizeAt(rect); const center = getViewCenter(rect);
      const cellRect = (x: number, y: number) => { const point = getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: size }); return { left: rect.left + point.left - size / 2, top: rect.top + point.top - size / 2, width: size, height: size }; };
      const placement = findWorldTooltipPosition(rect, { width: panel.offsetWidth, height: panel.offsetHeight }, [cellRect(hoveredEnemy.x, hoveredEnemy.y), cellRect(campaign.player.x, campaign.player.y)], size + 8);
      setTooltipPosition(placement);
    };
    update(); const observer = new ResizeObserver(update);
    if (hostRef.current) observer.observe(hostRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [hoveredEnemy, selectedCell, campaign.player.x, campaign.player.y, zoom, camera]);
  const offsets = new Map();
  const particleOverlay = !minimap && feedbackCenter && particleEffects.filter((effect) => !particleExpired(effect)).map((effect) => {
    const tileCenter = getWorldCellScreenCenter({ x: effect.x, y: effect.y, center: feedbackCenter, viewportWidth: feedbackRect!.width, viewportHeight: feedbackRect!.height, tileCssSize: feedbackCellSize });
    return renderParticleAtTile(effect, { row: effect.y, column: effect.x, worldZoom: feedbackCellSize / 32, relativeScale: 1, tileCenter: { x: tileCenter.left, y: tileCenter.top } });
  });
  const reticleKind = selectedCellReachable === false ? "invalid" : targetKindAt(selectedCell?.x, selectedCell?.y);
  return <div className={`babylon_world${minimap ? " babylon_world--minimap" : ""}`} ref={hostRef} data-renderer="babylon-lite" data-content-style="2d" onMouseMove={mouseInteraction ? pointerMove : undefined} onMouseLeave={mouseInteraction ? pointerLeave : undefined} onMouseDown={mouseInteraction ? pointerDown : undefined} onMouseUp={mouseInteraction ? pointerUp : undefined} onWheel={mouseInteraction ? (event) => { event.preventDefault(); onZoom?.(event.deltaY < 0 ? 1 : -1); } : undefined} onContextMenu={mouseInteraction ? (event) => event.preventDefault() : undefined}><canvas tabIndex={-1} ref={canvasRef} className="babylon_world_canvas" aria-label={minimap ? "Dungeon minimap" : "Pixel-perfect dungeon map"}/>{particleOverlay}{!minimap && feedbackCenter && floatingFeedback.map((effect) => { const key = `${effect.x},${effect.y}`; const index = offsets.get(key) ?? 0; offsets.set(key, index + 1); const position = getWorldScreenPosition({ x: effect.x, y: effect.y, center: feedbackCenter, viewportWidth: feedbackRect!.width, viewportHeight: feedbackRect!.height, tileCssSize: feedbackCellSize }); const zoomScale = typeof zoom === "number" ? zoom : 1; return <span key={effect.id} className={`world_floating_text world_floating_text--${effect.color}`} style={{ left: position.left, top: position.top - index * 12 * zoomScale, fontSize: `${14 * zoomScale}px`, "--world-floating-travel": `${11 * zoomScale}px` }} aria-hidden="true">{effect.text}</span>; })}{hoveredEnemy && !minimap && <section ref={tooltipRef} className="enemy_world_tooltip" aria-label={`${hoveredEnemy.name} information`} style={{ left: tooltipPosition?.left ?? -10000, top: tooltipPosition?.top ?? -10000, visibility: tooltipPosition ? "visible" : "hidden" }}><div className="enemy_tooltip_section enemy_tooltip_portrait"><h2>ENEMY: {hoveredEnemy.name}</h2><img src={hoveredEnemy.name === "Skeleton" ? texturePaths.skeleton : texturePaths.rat} alt="" /></div><div className="enemy_tooltip_section enemy_tooltip_resource_panel"><h2>RESOURCES</h2><EnemyResourceRows resources={hoveredEnemy.resources} /></div></section>}{mouseInteraction && selectedCell && reticleStyle && <i className={`grid_reticle ${reticleKind}`} style={reticleStyle} />}{message && <div role="status" className="babylon_world_message">{message}</div>}</div>;
}
