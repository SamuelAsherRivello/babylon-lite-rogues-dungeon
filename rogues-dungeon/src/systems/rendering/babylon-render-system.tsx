import type { MouseEvent } from "react";
import type { EngineContext, SurfaceContext, Texture2D, DynamicTexture2D, SpriteAtlas, SpriteRenderer, Sprite2DHandle, Sprite2DLayer } from "@babylonjs/lite";
import type { Campaign, Enemy, Feedback, Position, Resources, SelectedCell } from "../../game/types.ts";
interface SharedEngine { engine: EngineContext; primaryCanvas: HTMLCanvasElement; started: boolean }
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addSprite2D, centerSprite2DView, createDynamicTexture, createEngine, createGridSpriteAtlas, createSpriteAtlasFromFrames, createSprite2DLayer,
  createSpriteRenderer, createSurface, disposeEngine, disposeSpriteAtlas, disposeSpriteRenderer, disposeSurface,
  enableSprite2DYSort, loadTexture2D, registerSpriteRenderer, releaseTexture, resizeSurface, setGpuTimingEnabled, startEngine, updateDynamicTexture, updateSprite2D,
} from "@babylonjs/lite";
import { getCameraCenter, getWorldCellAtScreenPosition, getWorldCellScreenCenter, getWorldScreenPosition, WorldRender } from "./world-render-system.ts";
import { getRenderedTileCssSize } from "../../content/world/zoom.ts";
import { pixelPerfectOptions } from "../../content/babylon/config.ts";
import { getInitializationMessage } from "../../content/babylon/initialization.ts";
import { findWorldTooltipPosition } from "../../content/world/tooltip-placement.ts";
import { resourceNames } from "../procedural/world-procedural-system.ts";
import { isWalkable } from "../procedural/level-grid-system.ts";
import { createHeroWarriorAnimationEntity, heroWarriorIdleAnimationForHeading } from "../../content/characters/hero-warrior/hero-warrior-animation.ts";
import { loadSpriteAtlasFrame } from "../../content/characters/hero-warrior/hero-warrior-atlas.ts";
import { createEnemyIdleAnimationEntities, type EnemyIdleAnimationName } from "../../content/enemies/enemy-idle-animation.ts";
import { particleBoundsAt, particleBoundsAtTile, particleExpired, particleFrame, particleFrameUrl, type ParticleEffect } from "../animation/particle-effects-system.ts";
import { UiIrisTransition, type UiIrisPhase } from "../../ui/ui-transition-system.tsx";
import { sortGridRenderEntries } from "./grid-render-order-system.ts";
import { DUNGEON_STAIR_UP_FRAME, itemSpriteFrame } from "./world-object-sprite-system.ts";
import { TurnPresentationSystem } from "../animation/turn-presentation-system.ts";
import { trapFrameAt } from "../procedural/world-hazards-system.ts";

const texturePaths = {
  tiles: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png`,
  rat: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/rat/frames/idle/00.png`,
  skeleton: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/skeleton-warrior/frames/idle/down/00.png`,
  items: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/items-static.png`,
  goldCoin: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/items/animated/gold-coin.png`,
};

const goldCoinFramePaths = Array.from({ length: 4 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/items/animated/frames/gold-coin/${String(index).padStart(2, "0")}.png`);
const torchFramePaths = Array.from({ length: 3 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/animated/frames/torch/${String(index).padStart(2, "0")}.png`);
const trapFramePaths = Array.from({ length: 7 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/animated/frames/trap1/${String(index).padStart(2, "0")}.png`);
const smokePuffFramePaths = Array.from({ length: 9 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/custom/particles/smoke-poff/smoke-poff-${index + 1}.png`);

const clear = { r: 0.06, g: 0.05, b: 0.09, a: 1 };
let sharedEnginePromise: Promise<SharedEngine> | null = null;

export function renderParticle(effect: ParticleEffect, x: number, y: number, width: number, height: number, zIndex: number) {
  const bounds = particleBoundsAt(x, y, width, height);
  return <img key={effect.id} className="world-view__particle" src={particleFrameUrl(effect)} width={bounds.width} height={bounds.height} style={{ left: bounds.x, top: bounds.y, zIndex }} alt="" aria-hidden="true" />;
}

export function renderParticleAtTile(effect: ParticleEffect, request: Parameters<typeof particleBoundsAtTile>[0], zIndex: number) {
  const bounds = particleBoundsAtTile(request);
  return renderParticle(effect, bounds.x, bounds.y, bounds.width, bounds.height, zIndex);
}
let sharedEngineRecord: SharedEngine | null = null;
let surfaceReferences = 0;
const sharedTextures = new Map<string, { refs: number; promise: Promise<Texture2D> }>();
const resourceIcons = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★" };

function EnemyResourceRows({ resources }: { resources: Resources }) {
  // <h2>ENEMY: {hoveredEnemy.name}</h2>
  return <div className="resource_list world-view__enemy-tooltip-resources">{resourceNames.map((name) => {
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

/** A visual transfer from a world cell to the UI element that receives it. */
export interface GameViewToUiAnimation extends Position {
  id: string;
  kind: "item" | "potion" | "key" | "gold" | "chest" | "discovery" | "enemy" | "stairs";
  frame: number;
  target: string;
  destination: "row" | "counter";
}

export function BabylonWorld({ campaign, zoom = 1, minimap = false, camera = "center", mouseInteraction = false, floatingFeedback = [], particleEffects = [], uiAnimations = [], selectedCell = null, selectedCellReachable = null, turnPresentation, onSelectedCellChange, onWorldAliveChange, onUiAnimationComplete, onFpsChange, onZoom }: { campaign: Campaign; zoom?: number; minimap?: boolean; camera?: string; mouseInteraction?: boolean; floatingFeedback?: Feedback[]; particleEffects?: ParticleEffect[]; uiAnimations?: GameViewToUiAnimation[]; selectedCell?: SelectedCell | null; selectedCellReachable?: boolean | null; turnPresentation?: TurnPresentationSystem; onSelectedCellChange?(cell: SelectedCell | null): void; onWorldAliveChange?(alive: boolean): void; onUiAnimationComplete?(id: string): void; onFpsChange?(fps: number | null): void; onZoom?(step: number): void }) {
  const hostRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const sceneRef = useRef<{ draw(): void; activate(): void } | null>(null); const latestRef = useRef({ campaign, zoom, minimap, camera, particleEffects });
  const cameraCenterRef = useRef<(Position & { key: string }) | null>(null);
  // This is updated only by the completed world draw, so pickup flights can
  // launch from the camera framing the player actually saw before a move.
  const renderedCameraCenterRef = useRef<Position | null>(null);
  const renderedProjectionRef = useRef<{ rect: DOMRect; center: Position; tileCssSize: number } | null>(null);
  const launchedFlightsRef = useRef(new Set<string>());
  const mouseDownRef = useRef(false);
  const pointerRef = useRef<Position | null>(null);
  const selectedCellRef = useRef(selectedCell);
  const onFpsChangeRef = useRef(onFpsChange);
  const previousCampaignRef = useRef(campaign);
  const [message, setMessage] = useState("Preparing the crypt…");
  const [irisPhase, setIrisPhase] = useState<UiIrisPhase>("open");
  const [rendererLoaded, setRendererLoaded] = useState(minimap);
  const [worldAlive, setWorldAlive] = useState(minimap);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const tooltipRef = useRef<HTMLElement>(null);
  latestRef.current = { campaign, zoom, minimap, camera, particleEffects };
  selectedCellRef.current = selectedCell;
  onFpsChangeRef.current = onFpsChange;
  useEffect(() => { if (minimap) return undefined; const frame = requestAnimationFrame(() => setIrisPhase("closing")); return () => cancelAnimationFrame(frame); }, [minimap]);
  useEffect(() => {
    if (!minimap && irisPhase === "closed" && rendererLoaded) setIrisPhase("opening");
  }, [irisPhase, minimap, rendererLoaded]);
  useEffect(() => { onWorldAliveChange?.(worldAlive); if (worldAlive) sceneRef.current?.activate(); }, [onWorldAliveChange, worldAlive]);
  useEffect(() => {
    if (minimap || !worldAlive || !turnPresentation) return;
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const center = getViewCenter(rect, campaign);
    const cellSize = cellSizeAt(rect);
    const visibleEnemyIds = new Set(campaign.floor.entities.filter((entity): entity is Enemy => entity.kind === "enemy" && Math.abs(entity.x - center.x) <= rect.width / cellSize / 2 + 1 && Math.abs(entity.y - center.y) <= rect.height / cellSize / 2 + 1).map((enemy) => enemy.id));
    turnPresentation.begin(previousCampaignRef.current, campaign, visibleEnemyIds, performance.now());
    previousCampaignRef.current = campaign;
  }, [campaign, minimap, turnPresentation, worldAlive]);
  useEffect(() => {
    if (!worldAlive || minimap || !uiAnimations.length || !hostRef.current) return undefined;
    const host = hostRef.current; const fallbackRect = host.getBoundingClientRect();
    const projection = renderedProjectionRef.current ?? { rect: fallbackRect, center: renderedCameraCenterRef.current ?? getViewCenter(fallbackRect), tileCssSize: cellSizeAt(fallbackRect) };
    for (const flight of uiAnimations) {
      if (launchedFlightsRef.current.has(flight.id)) continue;
      const { rect, center, tileCssSize } = projection;
      const origin = getWorldCellScreenCenter({ ...flight, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize });
      const target = document.querySelector<HTMLElement>(flight.target);
      const destinationLayer = target?.closest<HTMLElement>(flight.destination === "counter" ? ".game-screen" : ".game-screen__middle");
      if (!target || !destinationLayer) continue;
      launchedFlightsRef.current.add(flight.id);
      const transfer = document.createElement("span"); transfer.className = "world-view__ui-animation"; transfer.setAttribute("aria-hidden", "true");
      const goldCoin = flight.kind === "gold";
      const image = document.createElement("img"); image.className = `world-view__ui-animation-sprite${goldCoin ? " world-view__ui-animation-sprite--gold" : ""}`; image.src = goldCoin ? texturePaths.goldCoin : texturePaths.items; image.alt = ""; if (!goldCoin) image.style.transform = `translate(${-100 * (flight.frame % 3) / 3}%, ${-100 * Math.floor(flight.frame / 3) / 3}%)`; transfer.append(image);
      Object.assign(transfer.style, { left: `${rect.left + origin.left}px`, top: `${rect.top + origin.top}px`, width: `${tileCssSize}px`, height: `${tileCssSize}px`, transform: "translate(-50%, -50%)" });
      destinationLayer.append(transfer);
      requestAnimationFrame(() => {
        const targetRect = target.getBoundingClientRect();
        const counter = flight.destination === "counter";
        Object.assign(transfer.style, counter ? { left: `${targetRect.left + targetRect.width / 2}px`, top: `${targetRect.top + targetRect.height / 2}px`, width: `${Math.min(targetRect.width, targetRect.height)}px`, height: `${Math.min(targetRect.width, targetRect.height)}px`, transform: "translate(-50%, -50%)" } : { left: `${targetRect.left}px`, top: `${targetRect.top + targetRect.height / 2}px`, transform: "translate(-50%, -50%)" });
      });
      // The transfer reaches its target at 500ms, pauses for 500ms, then credits it.
      window.setTimeout(() => { transfer.remove(); launchedFlightsRef.current.delete(flight.id); onUiAnimationComplete?.(flight.id); }, 1000);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiAnimations, worldAlive, minimap]);
  const cellSizeAt = (rect: DOMRect, zoomValue = latestRef.current.zoom) => {
    const canvas = canvasRef.current;
    const backingPixelsPerCssPixel = canvas && canvas.width > 0 && rect.width > 0 ? canvas.width / rect.width : window.devicePixelRatio || 1;
    return getRenderedTileCssSize({ zoom: typeof zoomValue === "number" ? zoomValue : 1, devicePixelRatio: window.devicePixelRatio || 1, backingPixelsPerCssPixel });
  };
  const getViewCenter = (rect: DOMRect, state = latestRef.current.campaign) => {
    const { camera: cameraNow, zoom: zoomNow } = latestRef.current;
    const tileCss = cellSizeAt(rect, zoomNow); const visibleWidth = rect.width / tileCss; const visibleHeight = rect.height / tileCss;
    const mapWidth = state.floor.width ?? state.floor.cells?.[0]?.length ?? 0; const mapHeight = state.floor.height ?? state.floor.cells?.length ?? 0;
    // Viewport dimensions deliberately do not reset camera history: the resize
    // observer redraws on every animated game-view width, and dead-zone mode
    // must keep its current camera position while adapting its bounds. Center
    // and screen modes derive their centers directly from the new dimensions.
    const resetKey = [state.floor.seed, mapWidth, mapHeight, cameraNow, zoomNow].join(":");
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
    if (!mouseInteraction || !worldAlive) return null;
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
    let cancelled = false; let engine: EngineContext | null = null; let surface: SurfaceContext | null = null; let renderer: SpriteRenderer | null = null; let atlases: SpriteAtlas[] = []; let textures: Record<string, Texture2D> = {}; let acquiredTexturePaths: string[] = []; let observers: { disconnect(): void }[] = []; let debugTexture: DynamicTexture2D | null = null; let animationFrameId = 0; let fpsIntervalId = 0; let heroAnimation: ReturnType<typeof createHeroWarriorAnimationEntity> | null = null; let enemyAnimations: ReturnType<typeof createEnemyIdleAnimationEntities> | null = null;
    const setup = async () => {
      try {
        if (!navigator.gpu) throw new Error("WebGPU is not available in this browser.");
        const acquired = await acquireSharedSurface(canvas); engine = acquired.engine; surface = acquired.surface;
        if (cancelled) { releaseSharedSurface(surface); surface = null; return; }
        heroAnimation = createHeroWarriorAnimationEntity(import.meta.env.BASE_URL);
        const activeHeroAnimation = heroAnimation;
        enemyAnimations = createEnemyIdleAnimationEntities(import.meta.env.BASE_URL);
        const activeEnemyAnimations = enemyAnimations;
        for (const [key, path] of Object.entries(texturePaths)) {
          const texture = await acquireSharedTexture(engine, path); acquiredTexturePaths.push(path);
          if (cancelled) { acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; releaseSharedSurface(surface); surface = null; return; }
          textures[key] = texture;
        }
        const tileAtlas = createGridSpriteAtlas(textures.tiles, { cellWidthPx: 32, cellHeightPx: 32, columns: 12, rows: 9, pivot: [0.5, 0.5] });
        const debugCanvas = document.createElement("canvas"); debugCanvas.width = 32; debugCanvas.height = 32;
        const contextGetter = "getContext"; const debugContext = debugCanvas[contextGetter]("2d")!; debugContext.fillStyle = "rgba(235, 35, 45, 0.52)"; debugContext.fillRect(0, 0, 32, 32);
        debugTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, debugTexture, debugCanvas, { invertY: false });
        const debugAtlas = createGridSpriteAtlas(debugTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const enemyFramePaths = [...new Set(Object.values(activeEnemyAnimations).flatMap((animation) => animation.listAnimations().flatMap(({ frames }) => frames.map(({ path }) => path))))];
        const enemyAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(enemyFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(enemyAtlas);
        const itemAtlas = createGridSpriteAtlas(textures.items, { cellWidthPx: 32, cellHeightPx: 32, columns: 3, rows: 3, pivot: [0.5, 0.5] });
        const heroFramePaths = [...new Set(activeHeroAnimation.listAnimations().flatMap((animation) => animation.frames.map((frame) => frame.path)))];
        const heroAtlas = minimap ? null : createSpriteAtlasFromFrames(engine, await Promise.all(heroFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        if (heroAtlas) atlases.push(heroAtlas);
        const goldCoinAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(goldCoinFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(goldCoinAtlas);
        const torchAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(torchFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        const trapAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(trapFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(torchAtlas, trapAtlas);
        const particleAtlas = minimap ? null : createSpriteAtlasFromFrames(engine, await Promise.all(smokePuffFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        if (particleAtlas) atlases.push(particleAtlas);
        const heroFrameIndexes = new Map(heroFramePaths.map((path, index) => [path, index]));
        const enemyFrameIndexes = new Map(enemyFramePaths.map((path, index) => [path, index]));
        const terrainLayer = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] });
        const wallLayer = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] });
        const debugLayer = createSprite2DLayer(debugAtlas, { pivot: [0.5, 0.5] });
        const actorLayers = { rat: Array.from({ length: 40 }, () => createSprite2DLayer(enemyAtlas, { pivot: [0.5, 0.5] })), skeleton: Array.from({ length: 40 }, () => createSprite2DLayer(enemyAtlas, { pivot: [0.5, 1] })) };
        const itemLayers = Array.from({ length: 40 }, () => createSprite2DLayer(itemAtlas, { pivot: [0.5, 0.5] }));
        const goldCoinLayers = Array.from({ length: 40 }, () => createSprite2DLayer(goldCoinAtlas, { pivot: [0.5, 0.5] }));
        const torchLayers = Array.from({ length: 40 }, () => createSprite2DLayer(torchAtlas, { pivot: [0.5, 0.5] }));
        const trapLayers = Array.from({ length: 20 }, () => createSprite2DLayer(trapAtlas, { pivot: [0.5, 0.5] }));
        const stairLayers = Array.from({ length: 4 }, () => createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] }));
        const particleLayers = particleAtlas ? Array.from({ length: 16 }, () => createSprite2DLayer(particleAtlas, { pivot: [0.5, 0.5] })) : [];
        const playerLayer = heroAtlas ? createSprite2DLayer(heroAtlas, { pivot: [0.5, 1] }) : null;
        const playerSprite = playerLayer ? addSprite2D(playerLayer, { positionPx: [-10000, -10000], sizePx: [32, 48], frame: 0 }) : null;
        const model = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, decorations: campaign.floor.decorations, player: campaign.player, start: campaign.floor.start, groundTiles: campaign.floor.tiledGrounds, wallTiles: campaign.floor.tiledWalls, view: minimap ? "minimap" : "game", detail: minimap ? "simplified" : "full" });
        const terrainHandles = model.grounds.map(({ worldX, worldY, frame }) => addSprite2D(terrainLayer, { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const wallHandles = model.walls.map(({ worldX, worldY, frame }) => addSprite2D(wallLayer, { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const debugHandles = [...model.diagnostics, ...model.wallDiagnostics].map(({ worldX, worldY }) => addSprite2D(debugLayer, { positionPx: [worldX, worldY], sizePx: [32, 32], frame: 0 }));
        const actors: Record<string, Sprite2DHandle[]> = { rat: [], skeleton: [] };
        for (const key of Object.keys(actors) as EnemyIdleAnimationName[]) for (let i = 0; i < 40; i++) actors[key].push(addSprite2D(actorLayers[key][i], { positionPx: [-10000,-10000], sizePx: [32, key === "skeleton" ? 48 : 32], frame: 0 }));
        const items = itemLayers.map((layer, i) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: i % 9 }));
        const goldCoins = goldCoinLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const torches = torchLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const traps = trapLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const stairs = stairLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: DUNGEON_STAIR_UP_FRAME }));
        const particles = particleLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const viewLayers = [terrainLayer, wallLayer, debugLayer, ...itemLayers, ...goldCoinLayers, ...torchLayers, ...trapLayers, ...stairLayers, ...particleLayers, ...actorLayers.rat, ...actorLayers.skeleton, ...(playerLayer ? [playerLayer] : [])];
        // Every world layer uses the same ascending +Y draw rule.  This keeps
        // entities in a layer stable while their shared layer order handles the
        // cross-atlas tie-breaking below.
        viewLayers.forEach((layer) => enableSprite2DYSort(layer));
        renderer = createSpriteRenderer(surface, { layers: viewLayers, clear: true, clearValue: clear });
        registerSpriteRenderer(renderer);
        const draw = () => {
          if (!minimap) turnPresentation?.sample(performance.now());
          const state = latestRef.current.campaign;
          const { zoom: zoomNow, minimap: isMinimap } = latestRef.current;
          const scale = typeof zoomNow === "number" ? zoomNow : 1;
          const renderWidth = canvas.width || canvas.clientWidth || host.clientWidth || 320;
          const renderHeight = canvas.height || canvas.clientHeight || host.clientHeight || 180;
          const world = WorldRender.Render({ cells: state.floor.cells, entities: state.floor.entities, decorations: state.floor.decorations, player: state.player, start: state.floor.start, groundTiles: state.floor.tiledGrounds, wallTiles: state.floor.tiledWalls, view: isMinimap ? "minimap" : "game", detail: isMinimap ? "simplified" : "full" });
          const mapWidth = world.width * 32;
          const mapHeight = world.height * 32;
          const mapScale = Math.min(renderWidth / mapWidth, renderHeight / mapHeight) * 0.92;
          const viewScale = isMinimap ? mapScale : scale * (window.devicePixelRatio || 1);
          const rect = host.getBoundingClientRect(); const cameraCenter = isMinimap ? state.player : getViewCenter(rect, state); if (!isMinimap) { renderedCameraCenterRef.current = cameraCenter; renderedProjectionRef.current = { rect, center: cameraCenter, tileCssSize: cellSizeAt(rect) }; }
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
          const playerHeading = state.player.heading ?? "e";
          const desiredIdleAnimation = heroWarriorIdleAnimationForHeading(playerHeading);
          if (activeHeroAnimation.getState().animation !== desiredIdleAnimation) activeHeroAnimation.selectAnimation(desiredIdleAnimation);
          const activeHeroFrame = activeHeroAnimation.getState().frame;
          if (playerSprite) { playerLayer!.order = state.player.y * 100 + 50; updateSprite2D(playerSprite, { positionPx: [state.player.x * 32 + 16, state.player.y * 32 + 32], sizePx: [activeHeroFrame.widthPx, activeHeroFrame.heightPx], frame: heroFrameIndexes.get(activeHeroFrame.path) ?? 0, flipX: state.player.heading === "w" }); }
          const byKind: Record<string, typeof world.actors> = { rat: world.actors.filter((actor) => actor.kind === "rat"), skeleton: world.actors.filter((actor) => actor.kind === "skeleton") };
          for (const key of Object.keys(actors) as EnemyIdleAnimationName[]) { const frame = activeEnemyAnimations[key].getState().frame; const footOffset = key === "skeleton" ? 32 : 16; actors[key].forEach((sprite, i) => { const actor = byKind[key][i]; const position = actor && turnPresentation?.positionOf(actor.id, actor); actorLayers[key][i].order = (position?.y ?? -10000) * 100 + 40; updateSprite2D(sprite, { positionPx: position ? [position.x * 32 + 16, position.y * 32 + footOffset] : [-10000,-10000], sizePx: [frame.widthPx, frame.heightPx], frame: enemyFrameIndexes.get(frame.path) ?? 0, flipX: actor?.heading === "w" }); }); }
          const itemObjects = world.objects.filter((entity) => entity.kind !== "stairs" && entity.kind !== "gold");
          const goldObjects = world.objects.filter((entity) => entity.kind === "gold");
          const stairObjects = world.objects.filter((entity) => entity.kind === "stairs");
          items.forEach((sprite, i) => { const entity = itemObjects[i]; itemLayers[i].order = (entity?.y ?? -10000) * 100 + 20; updateSprite2D(sprite, { frame: itemSpriteFrame(entity?.kind, entity?.resource), positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000] }); });
          const goldCoinFrame = Math.floor(performance.now() / 120) % goldCoinFramePaths.length;
          goldCoins.forEach((sprite, i) => { const entity = goldObjects[i]; goldCoinLayers[i].order = (entity?.y ?? -10000) * 100 + 20; updateSprite2D(sprite, { frame: goldCoinFrame, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000] }); });
          const torchFrame = Math.floor(performance.now() / 200) % torchFramePaths.length;
          const wallTorches = world.wallDecorations.filter((decoration) => decoration.kind === "torch");
          const wallTraps = world.wallDecorations.filter((decoration) => decoration.kind === "trap");
          torches.forEach((sprite, i) => { const decoration = wallTorches[i]; torchLayers[i].order = (decoration?.y ?? -10000) * 100 + 15; updateSprite2D(sprite, { frame: torchFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); });
          const trapFrame = trapFrameAt(performance.now());
          traps.forEach((sprite, i) => { const decoration = wallTraps[i]; trapLayers[i].order = (decoration?.y ?? -10000) * 100 + 15; updateSprite2D(sprite, { frame: trapFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); });
          stairs.forEach((sprite, i) => { const entity = stairObjects[i]; stairLayers[i].order = (entity?.y ?? -10000) * 100 + 10; updateSprite2D(sprite, { frame: DUNGEON_STAIR_UP_FRAME, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000], flipY: entity?.direction === "back" }); });
          const activeParticles = latestRef.current.particleEffects.filter((effect) => !particleExpired(effect));
          particles.forEach((sprite, i) => { const effect = activeParticles[i]; const progress = effect ? Math.max(0, Math.min(1, (performance.now() - effect.startedAt) / 720)) : 0; const ramp = progress < .25 ? progress / .25 : progress > .75 ? (1 - progress) / .25 : 1; const scale = .25 + .25 * ramp; particleLayers[i].order = (effect?.y ?? -10000) * 100 + 30; updateSprite2D(sprite, { positionPx: effect ? [effect.x * 32 + 16, effect.y * 32 + 16] : [-10000, -10000], sizePx: [32 * scale, 32 * scale], frame: effect ? particleFrame(effect) : 0, color: [1, 1, 1, ramp] }); });
        };
        let animationStarted = false;
        const activate = () => {
          if (animationStarted || cancelled) return;
          animationStarted = true;
          activeHeroAnimation.start();
          Object.values(activeEnemyAnimations).forEach((animation) => animation.start());
          let lastAnimationTime = performance.now();
          const animate = (time: number) => {
            if (cancelled) return;
            activeHeroAnimation.update(Math.max(0, time - lastAnimationTime));
            Object.values(activeEnemyAnimations).forEach((animation) => animation.update(Math.max(0, time - lastAnimationTime)));
            lastAnimationTime = time;
            draw();
            animationFrameId = requestAnimationFrame(animate);
          };
          animationFrameId = requestAnimationFrame(animate);
        };
        sceneRef.current = { draw, activate };
        resizeSurface(surface); draw();
        if (acquired.isPrimary && sharedEngineRecord && !sharedEngineRecord.started) { await startEngine(engine); sharedEngineRecord.started = true; }
        if (acquired.isPrimary && onFpsChangeRef.current) {
          setGpuTimingEnabled(engine, true);
          fpsIntervalId = window.setInterval(() => {
          const frameTimeMs = engine?.gpuFrameTimeMs ?? 0;
          onFpsChangeRef.current?.(frameTimeMs > 0 ? Math.round(1000 / frameTimeMs) : null);
          }, 1000);
        }
        if (cancelled) return;
        const observer = new ResizeObserver(() => { resizeSurface(surface!); draw(); }); observer.observe(host); observers.push(observer);
        window.addEventListener("resize", draw); observers.push({ disconnect: () => window.removeEventListener("resize", draw) });
        if (minimap) { setRendererLoaded(true); setWorldAlive(true); setMessage(""); }
        else setRendererLoaded(true);
      } catch (error) {
        console.error("Rogue's Dungeon Babylon Lite initialization failed:", error);
        if (renderer) { disposeSpriteRenderer(renderer); renderer = null; }
        atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); atlases = [];
        if (debugTexture) { releaseTexture(debugTexture); debugTexture = null; }
        heroAnimation?.dispose(); heroAnimation = null; Object.values(enemyAnimations ?? {}).forEach((animation) => animation.dispose()); enemyAnimations = null;
        acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; textures = {};
        if (surface) { releaseSharedSurface(surface); surface = null; } engine = null;
        if (!cancelled) { setMessage(getInitializationMessage(Boolean(navigator.gpu), error)); if (!minimap) setIrisPhase("opening"); }
      }
    };
    queueMicrotask(() => { if (!cancelled) void setup(); });
    return () => {
      cancelled = true; cancelAnimationFrame(animationFrameId); window.clearInterval(fpsIntervalId); observers.forEach((observer) => observer.disconnect()); sceneRef.current = null;
      if (renderer) disposeSpriteRenderer(renderer); atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); if (debugTexture) releaseTexture(debugTexture); heroAnimation?.dispose(); heroAnimation = null; Object.values(enemyAnimations ?? {}).forEach((animation) => animation.dispose()); enemyAnimations = null; acquiredTexturePaths.forEach(releaseSharedTexture); if (surface) releaseSharedSurface(surface);
    };
  }, [minimap]);
  useEffect(() => {
    if (!mouseInteraction || !worldAlive) return undefined;
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
    if (!worldAlive) return;
    sceneRef.current?.draw();
    const rect = hostRef.current?.getBoundingClientRect();
    if (mouseInteraction && !mouseDownRef.current && pointerRef.current && rect) selectCell(targetAtScreenPosition(pointerRef.current, rect));
  }, [campaign, zoom, minimap, camera, mouseInteraction, turnPresentation, worldAlive]);
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
  const reticleKind = selectedCellReachable === false ? "invalid" : targetKindAt(selectedCell?.x, selectedCell?.y);
  const finishIrisPhase = (phase: UiIrisPhase) => {
    if (phase === "closing") setIrisPhase("closed");
    if (phase === "opening") { setIrisPhase("open"); if (rendererLoaded) setWorldAlive(true); }
  };
  return <div className={minimap ? "minimap-view" : "world-view"} ref={hostRef} data-renderer="babylon-lite" data-content-style="2d" onMouseMove={mouseInteraction && worldAlive ? pointerMove : undefined} onMouseLeave={mouseInteraction && worldAlive ? pointerLeave : undefined} onMouseDown={mouseInteraction && worldAlive ? pointerDown : undefined} onMouseUp={mouseInteraction && worldAlive ? pointerUp : undefined} onWheel={mouseInteraction && worldAlive ? (event) => { event.preventDefault(); onZoom?.(event.deltaY < 0 ? 1 : -1); } : undefined} onContextMenu={mouseInteraction && worldAlive ? (event) => event.preventDefault() : undefined}><canvas tabIndex={-1} ref={canvasRef} className={minimap ? "minimap-view__canvas" : "world-view__canvas"} aria-label={minimap ? "Dungeon minimap" : "Pixel-perfect dungeon map"}/>{worldAlive && !minimap && feedbackCenter && floatingFeedback.map((effect) => { const key = `${effect.x},${effect.y}`; const index = offsets.get(key) ?? 0; offsets.set(key, index + 1); const position = getWorldScreenPosition({ x: effect.x, y: effect.y, center: feedbackCenter, viewportWidth: feedbackRect!.width, viewportHeight: feedbackRect!.height, tileCssSize: feedbackCellSize }); const zoomScale = typeof zoom === "number" ? zoom : 1; return <span key={effect.id} className={`world-view__floating-text world-view__floating-text--${effect.color}`} style={{ left: position.left, top: position.top - index * 12 * zoomScale, fontSize: `${14 * zoomScale}px`, "--world-floating-travel": `${11 * zoomScale}px` }} aria-hidden="true">{effect.text}</span>; })}{hoveredEnemy && !minimap && <section ref={tooltipRef} className="world-view__enemy-tooltip" aria-label={`${hoveredEnemy.name} information`} style={{ left: tooltipPosition?.left ?? -10000, top: tooltipPosition?.top ?? -10000, visibility: tooltipPosition ? "visible" : "hidden" }}><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--portrait"><h2>ENEMY: {hoveredEnemy.name} information</h2><img src={hoveredEnemy.name === "Skeleton" ? texturePaths.skeleton : texturePaths.rat} alt="" /></div><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--resource-panel"><h2>RESOURCES</h2><EnemyResourceRows resources={hoveredEnemy.resources} /></div></section>}{mouseInteraction && worldAlive && selectedCell && reticleStyle && <i className={`world-view__grid-reticle world-view__grid-reticle--${reticleKind}`} style={reticleStyle} />}{!minimap && <UiIrisTransition phase={irisPhase} label={message} onPhaseComplete={finishIrisPhase} />}{!minimap && irisPhase === "open" && !rendererLoaded && message && <div role="status" className={minimap ? "minimap-view__message" : "world-view__message"}>{message}</div>}</div>;
}
