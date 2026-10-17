import type { MouseEvent } from "react";
import type { EngineContext, SurfaceContext, Texture2D, DynamicTexture2D, SpriteAtlas, SpriteRenderer, Sprite2DHandle, Sprite2DLayer } from "@babylonjs/lite";
import type { Campaign, Enemy, Feedback, Position, Resources, SelectedCell } from "../../game/types.ts";
import type { ResourceChangeEffect } from "../../game/resource-change-effects.ts";
interface SharedEngine { engine: EngineContext; primaryCanvas: HTMLCanvasElement; started: boolean }
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addSprite2D, centerSprite2DView, createDynamicTexture, createEngine, createGridSpriteAtlas, createSprite2DCustomShader, createSpriteAtlasFromFrames, createSprite2DLayer,
  createSpriteRenderer, createSurface, disposeEngine, disposeSpriteAtlas, disposeSpriteRenderer, disposeSurface,
  enableSprite2DYSort, loadTexture2D, registerSpriteRenderer, releaseTexture, resizeSurface, setSprite2DShaderParams, startEngine, updateDynamicTexture, updateSprite2D,
} from "@babylonjs/lite";
import { getCameraCenter, getWorldCellAtScreenPosition, getWorldCellScreenCenter, getWorldScreenPosition, WorldRender } from "./world-render-system.ts";
import { getRenderedTileCssSize } from "../../content/world/zoom.ts";
import { pixelPerfectOptions } from "../../content/babylon/config.ts";
import { getInitializationMessage } from "../../content/babylon/initialization.ts";
import { findWorldTooltipPosition } from "../../content/world/tooltip-placement.ts";
import { isBarrelAdjacentToWall, resourceNames } from "../procedural/world-procedural-system.ts";
import { isWalkable } from "../procedural/level-grid-system.ts";
import { createHeroWarriorAnimationEntity, heroWarriorIdleAnimationForHeading } from "../../content/characters/hero-warrior/hero-warrior-animation.ts";
import { loadSpriteAtlasFrame } from "../../content/characters/hero-warrior/hero-warrior-atlas.ts";
import { createEnemyIdleAnimationEntities, type EnemyIdleAnimationName } from "../../content/enemies/enemy-idle-animation.ts";
import { createFloorTriggerAnimationEntity } from "../../content/world/floor-trigger-animation.ts";
import { particleBoundsAt, particleBoundsAtTile, particleExpired, particleFrame, particleFrameUrl, particleOpacity, particlePosition, particleProgress, particleSizePx, type ParticleEffect } from "../animation/particle-effects-system.ts";
import { UiIrisTransition, useUiMotion, type UiIrisPhase } from "../../ui/ui-transition-system.tsx";
import { easeInCubic, easeOutCubic } from "../animation/tween-animation-system.ts";
import { GRID_RENDER_PASS, orderWorldRenderEntries, type GridRenderEntry } from "./grid-render-order-system.ts";
import { CHEST_MAIN_ART_ANCHOR_OFFSET_PX, DUNGEON_STAIR_UP_FRAME, doorMainArtAnchorOffset, itemSpriteFrame, OBJECTS_OVERLAY_CRATE_CLOSED_FRAME, pickupMainArtPresentation, puzzleObjectSpriteFrame } from "./world-object-sprite-system.ts";
import { pickupOscillationOffset, pickupShadowWidthScale } from "../animation/pickup-oscillation-system.ts";
import { CHARACTER_MOVEMENT_DURATION_MS, TurnPresentationSystem } from "../animation/turn-presentation-system.ts";
import { STAIR_DESCENT_DURATION_MS, STAIR_DESCENT_STEP_COUNT, STAIR_DESCENT_STEP_DURATION_MS, STAIR_DESCENT_STEP_INTERVAL_MS, stairDescentHeading, stairDescentIsMasked, stairDescentOffset } from "../animation/stair-descent-animation-system.ts";
import { CameraAnimationSystem, PLAYER_TAKE_DAMAGE_ANIMATION } from "../animation/camera-animation-system.ts";
import { trapFrameAt } from "../procedural/world-hazards-system.ts";
import { createCharacterSprite, hideCharacterSprite, PLAYER_HOP_HEIGHT_PX, setCharacterSpriteOrder, updateCharacterSprite, type CharacterSprite } from "./character-sprite-system.ts";
import { itemThrowExpired, itemThrowPosition, type ItemThrow } from "../animation/item-throw-animation-system.ts";

export function isPositionOffscreen(position: Position, center: Position, halfWidth: number, halfHeight: number) {
  return position.x < center.x - halfWidth || position.x > center.x + halfWidth || position.y < center.y - halfHeight || position.y > center.y + halfHeight;
}

const texturePaths = {
  tiles: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png`,
  rat: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/rat/frames/idle/00.png`,
  skeleton: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/skeleton-warrior/frames/idle/down/00.png`,
  items: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/items-static.png`,
  goldCoin: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/items/animated/gold-coin.png`,
  propsAnimated: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/props-animated.png`,
  propsStatic: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/props-static.png`,
  objectsOverlay: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/objects-overlay.png`,
};

export type DungeonTheme = 1 | 2;

function dungeonTileTexturePath(theme: DungeonTheme) {
  return theme === 2
    ? `${import.meta.env.BASE_URL}assets/art/custom/tilesets/tileset-dungeon-theme-2.png`
    : texturePaths.tiles;
}

const goldCoinFramePaths = Array.from({ length: 4 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/items/animated/frames/gold-coin/${String(index).padStart(2, "0")}.png`);
const torchFramePaths = Array.from({ length: 3 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/animated/frames/torch/${String(index).padStart(2, "0")}.png`);
const trapFramePaths = Array.from({ length: 7 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/animated/frames/trap1/${String(index).padStart(2, "0")}.png`);
const campfirePath = `${import.meta.env.BASE_URL}assets/art/custom/campfire.png`;
const smokePuffFramePaths = Array.from({ length: 9 }, (_, index) => `${import.meta.env.BASE_URL}assets/art/custom/particles/smoke-poff/smoke-poff-${index + 1}.png`);
const heroShadowPath = `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/characters/hero-warrior/shadow.png`;
const chestFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/bronze-chest-closed.png`,
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/bronze-chest-open.png`,
];
const doorFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/front-door-closed.png`,
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/front-door-open.png`,
];
const barrelFramePaths = [
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/barrel.png`,
  `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/props/static/barrel-shadow.png`,
];
const enemyShadowPaths = {
  rat: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/rat/shadow.png`,
  skeleton: `${import.meta.env.BASE_URL}assets/art/vendors/dungeons-and-pixels-v1.4/enemies/skeleton-warrior/shadow.png`,
} as const;

const clear = { r: 0.06, g: 0.05, b: 0.09, a: 1 };
const TERRAIN_RENDER_ORDER = 0;
const FLOOR_DECAL_RENDER_ORDER = 10;
const FLOOR_TRAP_RENDER_ORDER = FLOOR_DECAL_RENDER_ORDER + 1;
const OVERLAY_RENDER_ORDER = 1_000_000;
const WORLD_TIE_BREAK = { wall: 0, decoration: 10, stair: 20, prop: 30, pickup: 40, entity: 50, effect: 60 } as const;
const LANDED_DAMAGE_PARTICLE_RENDER_ORDER = FLOOR_TRAP_RENDER_ORDER + 1;
let sharedEnginePromise: Promise<SharedEngine> | null = null;

interface WorldDepthEntry extends GridRenderEntry {
  applyOrder(order: number): void;
}

function applyWorldDepth(entries: readonly WorldDepthEntry[]) {
  for (const { entry, order } of orderWorldRenderEntries(entries)) entry.applyOrder(order);
}

function groundContactY({ y }: Position) { return y * 32 + 32; }

const PIVOT_MARKER_FRAMES = { grid: 0, main: 1, shadow: 2 } as const;

function updatePivotMarkers(markers: readonly Sprite2DHandle[], character: CharacterSprite, positionPx: readonly [number, number], visible: boolean) {
  if (!visible) {
    markers.forEach((marker) => updateSprite2D(marker, { positionPx: [-10000, -10000] }));
    return;
  }
  const [x, y] = positionPx;
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.grid], { positionPx: [x, y] });
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.main], { positionPx: [x + character.main.offsetPx[0], y + character.main.offsetPx[1]] });
  updateSprite2D(markers[PIVOT_MARKER_FRAMES.shadow], { positionPx: [x + character.shadow.offsetPx[0], y + character.shadow.offsetPx[1]] });
}

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
  mainSizePx: number;
  mainOffsetPx: Position;
  target: string;
  destination: "row" | "counter";
}
export const STAIR_DEPARTURE_DURATION_MS = STAIR_DESCENT_DURATION_MS;

function visibleTarget(selector: string) {
  return [...document.querySelectorAll<HTMLElement>(`${selector}, [data-ui-pickup-fallback]`)].find((element) => {
    const rect = element.getBoundingClientRect();
    return getComputedStyle(element).display !== "none" && rect.width > 0 && rect.height > 0;
  });
}

export function BabylonWorld({ campaign, theme = 1, zoom = 1, minimap = false, camera = "center", cameraAnimationToken = 0, stairDepartureStartedAt = null, mouseInteraction = false, showPivotPoints = false, floatingFeedback = [], resourceChangeEffects = [], particleEffects = [], itemThrows = [], uiAnimations = [], selectedCell = null, selectedCellReachable = null, turnPresentation, onSelectedCellChange, onWorldAliveChange, onStairDepartureComplete, onStairDescentStep, onWallAdjacentBarrelOffscreen, onUiAnimationComplete, onFpsChange, onZoom }: { campaign: Campaign; theme?: DungeonTheme; zoom?: number; minimap?: boolean; camera?: string; cameraAnimationToken?: number; stairDepartureStartedAt?: number | null; mouseInteraction?: boolean; showPivotPoints?: boolean; floatingFeedback?: Feedback[]; resourceChangeEffects?: ResourceChangeEffect[]; particleEffects?: ParticleEffect[]; itemThrows?: ItemThrow[]; uiAnimations?: GameViewToUiAnimation[]; selectedCell?: SelectedCell | null; selectedCellReachable?: boolean | null; turnPresentation?: TurnPresentationSystem; onSelectedCellChange?(cell: SelectedCell | null): void; onWorldAliveChange?(alive: boolean): void; onStairDepartureComplete?(): void; onStairDescentStep?(): void; onWallAdjacentBarrelOffscreen?(setId: string): boolean; onUiAnimationComplete?(id: string): void; onFpsChange?(fps: number | null): void; onZoom?(step: number): void }) {
  const [presentedCampaign, setPresentedCampaign] = useState(campaign);
  const hostRef = useRef<HTMLDivElement>(null); const canvasRef = useRef<HTMLCanvasElement>(null); const sceneRef = useRef<{ draw(): void; activate(): void; beginStairClip(origin: Position): void; clearStairClip(): void; setTheme(theme: DungeonTheme): void } | null>(null); const latestRef = useRef({ campaign: presentedCampaign, zoom, minimap, camera, showPivotPoints, particleEffects, itemThrows, stairDepartureStartedAt });
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
  const cameraAnimation = useRef(new CameraAnimationSystem()).current;
  const cameraTransformRef = useRef({ positionPx: [0, 0] as [number, number], scale: 1 });
  const [message, setMessage] = useState(`Entering Level: ${campaign.floor.level}`);
  const [irisPhase, setIrisPhase] = useState<UiIrisPhase>("open");
  const [irisMounted, setIrisMounted] = useState(false);
  const [irisRequested, setIrisRequested] = useState(false);
  const stairDepartureAwaitingIrisRef = useRef(false);
  const [rendererLoaded, setRendererLoaded] = useState(minimap);
  const [worldAlive, setWorldAlive] = useState(minimap);
  const [tooltipPosition, setTooltipPosition] = useState<{ left: number; top: number } | null>(null);
  const [tooltipEnemy, setTooltipEnemy] = useState<Enemy | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLElement>(null);
  const recoveredBarrelIdsRef = useRef(new Set<string>());
  latestRef.current = { campaign: presentedCampaign, zoom, minimap, camera, showPivotPoints, particleEffects, itemThrows, stairDepartureStartedAt };
  selectedCellRef.current = selectedCell;
  onFpsChangeRef.current = onFpsChange;
  useEffect(() => {
    if (!irisRequested || irisPhase !== "open") return undefined;
    // Mount in its open state, then close on the next frame. This keeps the
    // mask absent before a transition while preserving its closing animation.
    setIrisMounted(true);
    const frame = requestAnimationFrame(() => setIrisPhase("closing"));
    return () => cancelAnimationFrame(frame);
  }, [irisPhase, irisRequested]);
  useEffect(() => {
    // Initial renderer startup has no iris. The mask is reserved for a stair
    // handoff, which requests it from the floor-change layout effect below.
    if (!minimap && rendererLoaded && !irisRequested && irisPhase === "open") setWorldAlive(true);
  }, [irisPhase, irisRequested, minimap, rendererLoaded]);
  useEffect(() => {
    if (!minimap && irisPhase === "closed" && rendererLoaded) {
      // A level is only installed after the iris covers the old scene. Resetting
      // this cache makes every camera policy start from the player's position.
      if (presentedCampaign.floor.seed !== campaign.floor.seed || presentedCampaign.floor.level !== campaign.floor.level) {
        // The destination player must be placed, never interpolated from the
        // departed floor. Do this while the iris still covers the renderer.
        turnPresentation?.reset(campaign);
        previousCampaignRef.current = campaign;
        setPresentedCampaign(campaign);
        return undefined;
      }
      cameraCenterRef.current = null;
      sceneRef.current?.draw();
      const frame = requestAnimationFrame(() => setIrisPhase("opening"));
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [campaign, irisPhase, minimap, presentedCampaign, rendererLoaded]);
  useLayoutEffect(() => {
    if (minimap || (campaign.floor.seed === presentedCampaign.floor.seed && campaign.floor.level === presentedCampaign.floor.level)) {
      if (campaign !== presentedCampaign) setPresentedCampaign(campaign);
      return;
    }
    // Stop all world input before the new floor can be drawn. The old floor
    // remains presented until the closed-iris effect above installs this one.
    setWorldAlive(false);
    selectCell(null);
    setMessage(`Entering Level: ${campaign.floor.level}`);
    setIrisRequested(true);
  }, [campaign, minimap, presentedCampaign]);
  useEffect(() => { onWorldAliveChange?.(worldAlive); if (worldAlive) sceneRef.current?.activate(); }, [onWorldAliveChange, worldAlive]);
  useEffect(() => {
    if (!stairDepartureStartedAt || minimap) return undefined;
    setWorldAlive(false);
    const stairOrigin = { x: campaign.player.x, y: campaign.player.y };
    const maskStartAt = stairDepartureStartedAt + CHARACTER_MOVEMENT_DURATION_MS;
    const clipTimer = window.setTimeout(() => sceneRef.current?.beginStairClip(stairOrigin), Math.max(0, maskStartAt - performance.now()));
    let animationFrame = 0;
    const completeWhenMasked = () => {
      const elapsed = performance.now() - stairDepartureStartedAt - CHARACTER_MOVEMENT_DURATION_MS;
      if (stairDescentIsMasked(elapsed)) {
        stairDepartureAwaitingIrisRef.current = true;
        setIrisRequested(true);
      }
      else animationFrame = requestAnimationFrame(completeWhenMasked);
    };
    animationFrame = requestAnimationFrame(completeWhenMasked);
    const footstepTimers = Array.from({ length: STAIR_DESCENT_STEP_COUNT }, (_, index) => window.setTimeout(() => onStairDescentStep?.(), Math.max(0, stairDepartureStartedAt + CHARACTER_MOVEMENT_DURATION_MS + index * STAIR_DESCENT_STEP_INTERVAL_MS + STAIR_DESCENT_STEP_DURATION_MS - performance.now())));
    return () => { window.clearTimeout(clipTimer); cancelAnimationFrame(animationFrame); footstepTimers.forEach(window.clearTimeout); if (!stairDepartureAwaitingIrisRef.current) sceneRef.current?.clearStairClip(); };
  }, [minimap, onStairDepartureComplete, onStairDescentStep, stairDepartureStartedAt]);
  useEffect(() => { sceneRef.current?.setTheme(theme); }, [theme]);
  useEffect(() => {
    if (!cameraAnimationToken || minimap || !worldAlive) return;
    cameraAnimation.play(PLAYER_TAKE_DAMAGE_ANIMATION, { transform: cameraTransformRef.current, render: () => sceneRef.current?.draw() });
  }, [cameraAnimation, cameraAnimationToken, minimap, worldAlive]);
  useEffect(() => () => cameraAnimation.dispose(), [cameraAnimation]);
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
      const cellOrigin = getWorldCellScreenCenter({ ...flight, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize });
      const pixelScale = tileCssSize / 32;
      const origin = { left: cellOrigin.left + flight.mainOffsetPx.x * pixelScale, top: cellOrigin.top + flight.mainOffsetPx.y * pixelScale };
      const target = visibleTarget(flight.target);
      const destinationLayer = target?.closest<HTMLElement>(flight.destination === "counter" ? ".game-screen" : ".game-screen__middle");
      if (!target || !destinationLayer) { onUiAnimationComplete?.(flight.id); continue; }
      launchedFlightsRef.current.add(flight.id);
      const transfer = document.createElement("span"); transfer.className = "world-view__ui-animation"; transfer.setAttribute("aria-hidden", "true");
      const goldCoin = flight.kind === "gold";
      const image = document.createElement("img"); image.className = `world-view__ui-animation-sprite${goldCoin ? " world-view__ui-animation-sprite--gold" : ""}`; image.src = goldCoin ? texturePaths.goldCoin : texturePaths.items; image.alt = ""; if (!goldCoin) image.style.transform = `translate(${-100 * (flight.frame % 3) / 3}%, ${-100 * Math.floor(flight.frame / 3) / 3}%)`; transfer.append(image);
      const mainSize = flight.mainSizePx * pixelScale;
      Object.assign(transfer.style, { left: `${rect.left + origin.left}px`, top: `${rect.top + origin.top}px`, width: `${mainSize}px`, height: `${mainSize}px`, transform: "translate(-50%, -50%)" });
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
    const playerPosition = turnPresentation?.playerPositionOf(state.player) ?? state.player;
    const previousCenter = cameraCenterRef.current?.key === resetKey ? cameraCenterRef.current : playerPosition;
    const center = getCameraCenter({ mode: cameraNow, player: playerPosition, previousCenter, visibleWidth, visibleHeight, mapWidth, mapHeight });
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
    let cancelled = false; let engine: EngineContext | null = null; let surface: SurfaceContext | null = null; let renderer: SpriteRenderer | null = null; let atlases: SpriteAtlas[] = []; let textures: Record<string, Texture2D> = {}; let acquiredTexturePaths: string[] = []; let observers: { disconnect(): void }[] = []; let tileTexture: DynamicTexture2D | null = null; const tileThemeImages = new Map<DungeonTheme, ImageBitmap>(); let debugTexture: DynamicTexture2D | null = null; let pivotTexture: DynamicTexture2D | null = null; let pickupShadowTexture: DynamicTexture2D | null = null; let animationFrameId = 0; let fpsSampleStartedAt = 0; let fpsFrameCount = 0; let heroAnimation: ReturnType<typeof createHeroWarriorAnimationEntity> | null = null; let enemyAnimations: ReturnType<typeof createEnemyIdleAnimationEntities> | null = null; const triggerAnimations = new Map<string, ReturnType<typeof createFloorTriggerAnimationEntity>>();
    const setup = async () => {
      try {
        if (!navigator.gpu) throw new Error("WebGPU is not available in this browser.");
        const acquired = await acquireSharedSurface(canvas); engine = acquired.engine; surface = acquired.surface;
        if (cancelled) { releaseSharedSurface(surface); surface = null; return; }
        heroAnimation = createHeroWarriorAnimationEntity(import.meta.env.BASE_URL);
        const activeHeroAnimation = heroAnimation;
        enemyAnimations = createEnemyIdleAnimationEntities(import.meta.env.BASE_URL);
        const activeEnemyAnimations = enemyAnimations;
        for (const [key, path] of Object.entries(texturePaths).filter(([key]) => key !== "tiles")) {
          const texture = await acquireSharedTexture(engine, path); acquiredTexturePaths.push(path);
          if (cancelled) { acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; releaseSharedSurface(surface); surface = null; return; }
          textures[key] = texture;
        }
        const loadedTileThemes = await Promise.all(([1, 2] as const).map(async (tileTheme) => {
          const response = await fetch(dungeonTileTexturePath(tileTheme));
          if (!response.ok) throw new Error(`Could not load dungeon theme ${tileTheme}.`);
          return [tileTheme, await createImageBitmap(await response.blob())] as const;
        }));
        loadedTileThemes.forEach(([tileTheme, image]) => tileThemeImages.set(tileTheme, image));
        if (cancelled) { tileThemeImages.forEach((image) => image.close()); tileThemeImages.clear(); acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; releaseSharedSurface(surface); surface = null; return; }
        tileTexture = createDynamicTexture(engine, 384, 288, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, tileTexture, tileThemeImages.get(theme)!, { invertY: false });
        const tileAtlas = createGridSpriteAtlas(tileTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 12, rows: 9, pivot: [0.5, 0.5] });
        const debugCanvas = document.createElement("canvas"); debugCanvas.width = 32; debugCanvas.height = 32;
        const contextGetter = "getContext"; const debugContext = debugCanvas[contextGetter]("2d")!; debugContext.strokeStyle = "#ff3b3b"; debugContext.lineWidth = 3; debugContext.strokeRect(1.5, 1.5, 29, 29);
        debugTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, debugTexture, debugCanvas, { invertY: false });
        const debugAtlas = createGridSpriteAtlas(debugTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const pivotCanvas = document.createElement("canvas"); pivotCanvas.width = 15; pivotCanvas.height = 5;
        const pivotContext = pivotCanvas[contextGetter]("2d")!;
        ["#ff3b3b", "#3b8cff", "#56d364"].forEach((color, index) => { pivotContext.fillStyle = "#101014"; pivotContext.fillRect(index * 5, 0, 5, 5); pivotContext.fillStyle = color; pivotContext.fillRect(index * 5 + 1, 1, 3, 3); });
        pivotTexture = createDynamicTexture(engine, 15, 5, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, pivotTexture, pivotCanvas, { invertY: false });
        const pivotAtlas = createGridSpriteAtlas(pivotTexture, { cellWidthPx: 5, cellHeightPx: 5, columns: 3, rows: 1, pivot: [0.5, 0.5] });
        const pickupShadowCanvas = document.createElement("canvas"); pickupShadowCanvas.width = 32; pickupShadowCanvas.height = 32;
        const pickupShadowContext = pickupShadowCanvas[contextGetter]("2d")!;
        pickupShadowContext.fillStyle = "rgba(0, 0, 0, 0.38)"; pickupShadowContext.beginPath(); pickupShadowContext.ellipse(16, 23, 10, 3, 0, 0, Math.PI * 2); pickupShadowContext.fill();
        pickupShadowTexture = createDynamicTexture(engine, 32, 32, { minFilter: "nearest", magFilter: "nearest", mipMaps: false });
        updateDynamicTexture(engine, pickupShadowTexture, pickupShadowCanvas, { invertY: false });
        const pickupShadowAtlas = createGridSpriteAtlas(pickupShadowTexture, { cellWidthPx: 32, cellHeightPx: 32, columns: 1, rows: 1, pivot: [0.5, 0.5] });
        const enemyFramePaths = [...new Set(Object.values(activeEnemyAnimations).flatMap((animation) => animation.listAnimations().flatMap(({ frames }) => frames.map(({ path }) => path))))];
        const enemyAtlasPaths = [...enemyFramePaths, ...Object.values(enemyShadowPaths)];
        const enemyAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(enemyAtlasPaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(enemyAtlas);
        const itemAtlas = createGridSpriteAtlas(textures.items, { cellWidthPx: 32, cellHeightPx: 32, columns: 3, rows: 3, pivot: [0.5, 0.5] });
        const propsAnimatedAtlas = createGridSpriteAtlas(textures.propsAnimated, { cellWidthPx: 32, cellHeightPx: 32, columns: 7, rows: 5, pivot: [0.5, 1] });
        const propsStaticAtlas = createGridSpriteAtlas(textures.propsStatic, { cellWidthPx: 32, cellHeightPx: 32, columns: 4, rows: 2, pivot: [0.5, 1] });
        const objectsOverlayAtlas = createGridSpriteAtlas(textures.objectsOverlay, { cellWidthPx: 32, cellHeightPx: 32, columns: 7, rows: 6, pivot: [0.5, 1] });
        const heroFramePaths = [...new Set(activeHeroAnimation.listAnimations().flatMap((animation) => animation.frames.map((frame) => frame.path)))];
        const heroAtlasPaths = [...heroFramePaths, heroShadowPath];
        const heroAtlas = minimap ? null : createSpriteAtlasFromFrames(engine, await Promise.all(heroAtlasPaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        if (heroAtlas) atlases.push(heroAtlas);
        const goldCoinAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(goldCoinFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(goldCoinAtlas);
        const chestAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(chestFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(chestAtlas);
        const doorAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(doorFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(doorAtlas);
        const barrelAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(barrelFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        atlases.push(barrelAtlas);
        const torchAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(torchFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        const trapAtlas = createSpriteAtlasFromFrames(engine, await Promise.all(trapFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        const campfireAtlas = createSpriteAtlasFromFrames(engine, [await loadSpriteAtlasFrame(campfirePath)], { paddingPx: 1, sampling: "nearest" });
        atlases.push(torchAtlas, trapAtlas, campfireAtlas);
        const particleAtlas = minimap ? null : createSpriteAtlasFromFrames(engine, await Promise.all(smokePuffFramePaths.map(loadSpriteAtlasFrame)), { paddingPx: 1, sampling: "nearest" });
        if (particleAtlas) atlases.push(particleAtlas);
        const heroFrameIndexes = new Map(heroAtlasPaths.map((path, index) => [path, index]));
        const enemyFrameIndexes = new Map(enemyAtlasPaths.map((path, index) => [path, index]));
        const model = WorldRender.Render({ cells: campaign.floor.cells, entities: campaign.floor.entities, decorations: campaign.floor.decorations, objectSets: campaign.floor.objectSets, player: campaign.player, start: campaign.floor.start, groundTiles: campaign.floor.tiledGrounds, wallTiles: campaign.floor.tiledWalls, view: minimap ? "minimap" : "game", detail: minimap ? "simplified" : "full" });
        const terrainLayer = createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5], order: TERRAIN_RENDER_ORDER });
        const wallLayers = Array.from({ length: model.height }, () => createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] }));
        const debugLayer = createSprite2DLayer(debugAtlas, { pivot: [0.5, 0.5] });
        const pivotMarkerLayer = createSprite2DLayer(pivotAtlas, { pivot: [0.5, 0.5] });
        debugLayer.order = OVERLAY_RENDER_ORDER;
        pivotMarkerLayer.order = OVERLAY_RENDER_ORDER + 1;
        const actorLayers = { rat: Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(enemyAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(enemyAtlas, { pivot: [0.5, 0.5] }) })), skeleton: Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(enemyAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(enemyAtlas, { pivot: [0.5, 1] }) })) };
        const itemLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(itemAtlas, { pivot: [0.5, 0.5] }) }));
        const chestShadowLayer = createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] });
        const chestLayer = createSprite2DLayer(chestAtlas, { pivot: [0.5, 1] });
        const closedCrateLayers = Array.from({ length: 40 }, () => createSprite2DLayer(objectsOverlayAtlas, { pivot: [0.5, 1] }));
        const openCrateLayers = Array.from({ length: 40 }, () => createSprite2DLayer(propsStaticAtlas, { pivot: [0.5, 1] }));
        const doorLayers = Array.from({ length: 4 }, () => createSprite2DLayer(doorAtlas, { pivot: [0.5, 1] }));
        const barrelLayers = Array.from({ length: 4 }, () => ({ shadow: createSprite2DLayer(barrelAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(barrelAtlas, { pivot: [0.5, 1] }) }));
        const triggerLayers = Array.from({ length: 4 }, () => createSprite2DLayer(propsAnimatedAtlas, { pivot: [0.5, 1] }));
        const goldCoinLayers = Array.from({ length: 40 }, () => ({ shadow: createSprite2DLayer(pickupShadowAtlas, { pivot: [0.5, 0.5] }), main: createSprite2DLayer(goldCoinAtlas, { pivot: [0.5, 0.5] }) }));
        const torchLayers = Array.from({ length: 40 }, () => createSprite2DLayer(torchAtlas, { pivot: [0.5, 0.5] }));
        const trapLayers = Array.from({ length: 20 }, () => createSprite2DLayer(trapAtlas, { pivot: [0.5, 0.5] }));
        const campfireLayers = Array.from({ length: 20 }, () => createSprite2DLayer(campfireAtlas, { pivot: [0.5, 0.5] }));
        const stairLayers = Array.from({ length: 4 }, () => createSprite2DLayer(tileAtlas, { pivot: [0.5, 0.5] }));
        const particleLayers = particleAtlas ? Array.from({ length: 64 }, () => createSprite2DLayer(particleAtlas, { pivot: [0.5, 0.5] })) : [];
        const stairClipShader = createSprite2DCustomShader({ fragment: "if (fx.params.z > 0.5 && in.p.y >= fx.params.x) { discard; } return textureSample(atlasTex, atlasSamp, in.uv) * in.tint * L.opacityMul;" });
        const playerLayers = heroAtlas ? { shadow: createSprite2DLayer(heroAtlas, { pivot: [0.5, 0.5], customShader: stairClipShader }), main: createSprite2DLayer(heroAtlas, { pivot: [0.5, 1], customShader: stairClipShader }) } : null;
        const playerSprite = playerLayers ? createCharacterSprite(
          { handle: addSprite2D(playerLayers.main, { positionPx: [-10000, -10000], sizePx: [32, 48], frame: 0 }), offsetPx: [-1, 6] },
          { handle: addSprite2D(playerLayers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: heroFrameIndexes.get(heroShadowPath) ?? 0 }), offsetPx: [0, -5] },
        ) : null;
        const terrainHandles = model.grounds.map(({ worldX, worldY, frame }) => addSprite2D(terrainLayer, { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const wallHandles = model.walls.map(({ y, worldX, worldY, frame }) => addSprite2D(wallLayers[y], { positionPx: frame === null ? [-10000, -10000] : [worldX, worldY], sizePx: [32, 32], frame: frame ?? 0 }));
        const debugHandles = [...model.diagnostics, ...model.wallDiagnostics].map(({ worldX, worldY }) => addSprite2D(debugLayer, { positionPx: [worldX, worldY], sizePx: [32, 32], frame: 0 }));
        const actors: Record<EnemyIdleAnimationName, CharacterSprite[]> = { rat: [], skeleton: [] };
        const actorPivotMarkers: Record<EnemyIdleAnimationName, Sprite2DHandle[][]> = { rat: [], skeleton: [] };
        for (const key of Object.keys(actors) as EnemyIdleAnimationName[]) for (let i = 0; i < 40; i++) {
          const mainHeight = key === "skeleton" ? 48 : 32;
          actors[key].push(createCharacterSprite(
            { handle: addSprite2D(actorLayers[key][i].main, { positionPx: [-10000, -10000], sizePx: [32, mainHeight], frame: 0 }), offsetPx: [0, key === "rat" ? -5 : 6] },
            { handle: addSprite2D(actorLayers[key][i].shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: enemyFrameIndexes.get(enemyShadowPaths[key]) ?? 0 }), offsetPx: [0, -5] },
          ));
          actorPivotMarkers[key].push(Object.values(PIVOT_MARKER_FRAMES).map((frame) => addSprite2D(pivotMarkerLayer, { positionPx: [-10000, -10000], sizePx: [5, 5], frame })));
        }
        const playerPivotMarkers = Object.values(PIVOT_MARKER_FRAMES).map((frame) => addSprite2D(pivotMarkerLayer, { positionPx: [-10000, -10000], sizePx: [5, 5], frame }));
        const items = itemLayers.map((layers, i) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: i % 9 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const chestShadow = addSprite2D(chestShadowLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 });
        const chest = addSprite2D(chestLayer, { positionPx: [-10000, -10000], sizePx: [32, 48], frame: 0 });
        const closedCrates = closedCrateLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: OBJECTS_OVERLAY_CRATE_CLOSED_FRAME }));
        const openCrates = openCrateLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 1 }));
        const doors = doorLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const barrels = barrelLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 11] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 1 }), offsetPx: [0, -5] },
        ));
        const triggers = triggerLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        let previousTriggerDrawAt = performance.now();
        const goldCoins = goldCoinLayers.map((layers) => createCharacterSprite(
          { handle: addSprite2D(layers.main, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
          { handle: addSprite2D(layers.shadow, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }), offsetPx: [0, 0] },
        ));
        const chestCoinLayers = Array.from({ length: 3 }, () => createSprite2DLayer(goldCoinAtlas, { pivot: [0.5, 0.5] }));
        const chestCoins = chestCoinLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
        const torches = torchLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const traps = trapLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const campfires = campfireLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [30,30], frame: 0 }));
        const stairs = stairLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: DUNGEON_STAIR_UP_FRAME }));
        const particles = particleLayers.map((layer) => addSprite2D(layer, { positionPx: [-10000,-10000], sizePx: [32,32], frame: 0 }));
        const viewLayers = [terrainLayer, ...triggerLayers, ...wallLayers, debugLayer, ...itemLayers.flatMap((layers) => [layers.shadow, layers.main]), chestShadowLayer, chestLayer, ...closedCrateLayers, ...openCrateLayers, ...doorLayers, ...barrelLayers.flatMap((layers) => [layers.shadow, layers.main]), ...goldCoinLayers.flatMap((layers) => [layers.shadow, layers.main]), ...chestCoinLayers, ...torchLayers, ...trapLayers, ...campfireLayers, ...stairLayers, ...particleLayers, ...actorLayers.rat.flatMap((layers) => [layers.shadow, layers.main]), ...actorLayers.skeleton.flatMap((layers) => [layers.shadow, layers.main]), ...(playerLayers ? [playerLayers.shadow, playerLayers.main] : []), pivotMarkerLayer];
        // Terrain and overlays use fixed passes. Every participating world layer
        // receives a shared order below, while its own sprites retain stable Y sort.
        viewLayers.filter((layer) => layer !== terrainLayer && layer !== debugLayer && layer !== pivotMarkerLayer).forEach((layer) => enableSprite2DYSort(layer));
        renderer = createSpriteRenderer(surface, { layers: viewLayers, clear: true, clearValue: clear });
        registerSpriteRenderer(renderer);
        let stairClipTopWorldY: number | null = null;
        const clearStairClip = () => { stairClipTopWorldY = null; };
        const beginStairClip = (origin: Position) => { stairClipTopWorldY = origin.y * 32 + 32; };
        const draw = () => {
          const now = performance.now();
          const triggerDeltaMs = now - previousTriggerDrawAt;
          previousTriggerDrawAt = now;
          if (!minimap) turnPresentation?.sample(performance.now());
          const state = latestRef.current.campaign;
          const { zoom: zoomNow, minimap: isMinimap, showPivotPoints: pivotsVisible } = latestRef.current;
          const scale = typeof zoomNow === "number" ? zoomNow : 1;
          const renderWidth = canvas.width || canvas.clientWidth || host.clientWidth || 320;
          const renderHeight = canvas.height || canvas.clientHeight || host.clientHeight || 180;
          const world = WorldRender.Render({ cells: state.floor.cells, entities: state.floor.entities, decorations: state.floor.decorations, objectSets: state.floor.objectSets, player: state.player, start: state.floor.start, groundTiles: state.floor.tiledGrounds, wallTiles: state.floor.tiledWalls, view: isMinimap ? "minimap" : "game", detail: isMinimap ? "simplified" : "full" });
          const mapWidth = world.width * 32;
          const mapHeight = world.height * 32;
          const mapScale = Math.min(renderWidth / mapWidth, renderHeight / mapHeight) * 0.92;
          const cameraTransform = cameraTransformRef.current;
          const viewScale = isMinimap ? mapScale : scale * cameraTransform.scale * (window.devicePixelRatio || 1);
          const rect = host.getBoundingClientRect(); const cameraCenter = isMinimap ? state.player : getViewCenter(rect, state); if (!isMinimap) { renderedCameraCenterRef.current = cameraCenter; renderedProjectionRef.current = { rect, center: cameraCenter, tileCssSize: cellSizeAt(rect) }; }
          if (!isMinimap && onWallAdjacentBarrelOffscreen) {
            const tileCss = cellSizeAt(rect); const halfWidth = rect.width / tileCss / 2; const halfHeight = rect.height / tileCss / 2;
            for (const set of state.floor.objectSets ?? []) {
              const barrelOffscreen = isPositionOffscreen(set.barrel, cameraCenter, halfWidth, halfHeight);
              const startOffscreen = Boolean(set.barrelStart && isPositionOffscreen(set.barrelStart, cameraCenter, halfWidth, halfHeight));
              if (barrelOffscreen && startOffscreen && isBarrelAdjacentToWall(state.floor, set.barrel) && !recoveredBarrelIdsRef.current.has(set.id) && onWallAdjacentBarrelOffscreen(set.id)) recoveredBarrelIdsRef.current.add(set.id);
            }
          }
          const centerX = cameraCenter.x * 32 + 16;
          const centerY = cameraCenter.y * 32 + 16;
          cameraTransform.positionPx = [centerX, centerY];
          viewLayers.forEach((layer) => {
            layer.view.zoom = viewScale;
            centerSprite2DView(layer.view, cameraTransform.positionPx[0], cameraTransform.positionPx[1], renderWidth, renderHeight);
          });
          if (playerLayers) {
            const clipY = stairClipTopWorldY === null ? -10000 : (stairClipTopWorldY - playerLayers.main.view.positionPx[1]) * playerLayers.main.view.zoom;
            const clipActive = stairClipTopWorldY === null ? 0 : 1;
            setSprite2DShaderParams(playerLayers.main, [clipY, 0, clipActive, 0]);
            setSprite2DShaderParams(playerLayers.shadow, [clipY, 0, clipActive, 0]);
          }
          terrainLayer.order = TERRAIN_RENDER_ORDER;
          debugLayer.order = OVERLAY_RENDER_ORDER;
          pivotMarkerLayer.order = OVERLAY_RENDER_ORDER + 1;
          const worldDepthEntries: WorldDepthEntry[] = [];
          const addLayerDepth = (id: string, y: number, tieBreak: number, layer: Sprite2DLayer) => worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak, applyOrder: (order) => { layer.order = order; } });
          const addLayerPairDepth = (id: string, y: number, tieBreak: number, shadow: Sprite2DLayer, main: Sprite2DLayer) => worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak, applyOrder: (order) => { shadow.order = order; main.order = order + 1; } });
          const addCharacterDepth = (id: string, y: number, character: CharacterSprite, bumpTieBreak = 0) => worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak: WORLD_TIE_BREAK.entity + bumpTieBreak, applyOrder: (order) => setCharacterSpriteOrder(character, order) });
          const addPickupDepth = (id: string, y: number, pickup: CharacterSprite) => worldDepthEntries.push({ id, pass: GRID_RENDER_PASS.world, y, tieBreak: WORLD_TIE_BREAK.pickup, applyOrder: (order) => setCharacterSpriteOrder(pickup, order) });
          while (terrainHandles.length < world.grounds.length) terrainHandles.push(addSprite2D(terrainLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
          while (wallHandles.length < world.walls.length) { const wall = world.walls[wallHandles.length]!; wallHandles.push(addSprite2D(wallLayers[wall.y]!, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 })); }
          while (debugHandles.length < world.diagnostics.length + world.wallDiagnostics.length) debugHandles.push(addSprite2D(debugLayer, { positionPx: [-10000, -10000], sizePx: [32, 32], frame: 0 }));
          world.grounds.forEach((tile, index) => updateSprite2D(terrainHandles[index], { positionPx: tile.frame === null ? [-10000, -10000] : [tile.worldX, tile.worldY], frame: tile.frame ?? 0 }));
          terrainHandles.slice(world.grounds.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          world.walls.forEach((tile, index) => updateSprite2D(wallHandles[index], { positionPx: tile.frame === null ? [-10000, -10000] : [tile.worldX, tile.worldY], frame: tile.frame ?? 0 }));
          wallHandles.slice(world.walls.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          for (const y of new Set(world.walls.map((wall) => wall.y))) addLayerDepth(`wall-row-${y}`, (y + 1) * 32, WORLD_TIE_BREAK.wall, wallLayers[y]!);
          [...world.diagnostics, ...world.wallDiagnostics].forEach((cell, index) => updateSprite2D(debugHandles[index], { positionPx: [cell.worldX, cell.worldY], frame: 0 }));
          debugHandles.slice(world.diagnostics.length + world.wallDiagnostics.length).forEach((sprite) => updateSprite2D(sprite, { positionPx: [-10000, -10000] }));
          const basePlayerHeading = turnPresentation?.headingOf("player", state.player.heading ?? "e") ?? state.player.heading ?? "e";
          const playerHeading = latestRef.current.stairDepartureStartedAt !== null ? stairDescentHeading(basePlayerHeading) : basePlayerHeading;
          const desiredIdleAnimation = heroWarriorIdleAnimationForHeading(playerHeading);
          if (activeHeroAnimation.getState().animation !== desiredIdleAnimation) activeHeroAnimation.selectAnimation(desiredIdleAnimation);
          const activeHeroFrame = activeHeroAnimation.getState().frame;
          const playerPosition = turnPresentation?.playerPositionOf(state.player) ?? state.player;
          const departureElapsed = latestRef.current.stairDepartureStartedAt === null ? 0 : now - latestRef.current.stairDepartureStartedAt - CHARACTER_MOVEMENT_DURATION_MS;
          const departureProgress = Math.max(0, Math.min(1, departureElapsed / STAIR_DEPARTURE_DURATION_MS));
          const departureOffsetY = departureElapsed > 0 ? stairDescentOffset(departureElapsed) : 0;
          const playerDepthPosition = turnPresentation?.playerDepthPositionOf(state.player, now) ?? state.player;
          const playerMovementPulse = isMinimap ? 0 : turnPresentation?.movementPulseOf("player", now) ?? 0;
          if (playerSprite) { const positionPx: [number, number] = [playerPosition.x * 32 + 16, playerPosition.y * 32 + 16 + departureOffsetY]; const damageScale = (isMinimap ? 1 : turnPresentation?.damageScaleOf("player", now) ?? 1) * (1 - departureProgress * .15); updateCharacterSprite(playerSprite, positionPx, 0, { sizePx: [activeHeroFrame.widthPx * damageScale, activeHeroFrame.heightPx * damageScale], frame: heroFrameIndexes.get(activeHeroFrame.path) ?? 0, flipX: playerHeading === "w", color: [1, 1, 1, 1] }, playerMovementPulse, PLAYER_HOP_HEIGHT_PX, 1); addCharacterDepth("player", groundContactY(playerDepthPosition), playerSprite, turnPresentation?.bumpDepthTieBreakOf("player", now) ?? 0); updatePivotMarkers(playerPivotMarkers, playerSprite, positionPx, pivotsVisible); }
          const byKind: Record<string, typeof world.actors> = { rat: world.actors.filter((actor) => actor.kind === "rat"), skeleton: world.actors.filter((actor) => actor.kind === "skeleton") };
          for (const key of Object.keys(actors) as EnemyIdleAnimationName[]) { const frame = activeEnemyAnimations[key].getState().frame; actors[key].forEach((character, i) => { const actor = byKind[key][i]; const position = actor && turnPresentation?.positionOf(actor.id, actor); if (!position) { hideCharacterSprite(character); updatePivotMarkers(actorPivotMarkers[key][i], character, [-10000, -10000], false); return; } const positionPx: [number, number] = [position.x * 32 + 16, position.y * 32 + 16]; const movementPulse = isMinimap ? 0 : turnPresentation?.movementPulseOf(actor.id, now) ?? 0; const damageScale = isMinimap ? 1 : turnPresentation?.damageScaleOf(actor.id, now) ?? 1; updateCharacterSprite(character, positionPx, 0, { sizePx: [frame.widthPx * damageScale, frame.heightPx * damageScale], frame: enemyFrameIndexes.get(frame.path) ?? 0, flipX: actor?.heading === "w" }, movementPulse); addCharacterDepth(actor.id, groundContactY(position), character, turnPresentation?.bumpDepthTieBreakOf(actor.id, now) ?? 0); updatePivotMarkers(actorPivotMarkers[key][i], character, positionPx, pivotsVisible); }); }
          const itemObjects = world.objects.filter((entity) => entity.kind === "item" || entity.kind === "potion" || entity.kind === "key" || entity.kind === "discovery");
          const chestObjects = world.objects.filter((entity) => entity.kind === "chest");
          const closedCrateObjects = world.objects.filter((entity) => entity.kind === "crate" && !entity.opened);
          const openCrateObjects = world.objects.filter((entity) => entity.kind === "crate" && entity.opened);
          const chestObject = chestObjects[0];
          updateSprite2D(chestShadow, { positionPx: chestObject ? [chestObject.worldX, chestObject.worldY] : [-10000, -10000] });
          updateSprite2D(chest, { positionPx: chestObject ? [chestObject.worldX, chestObject.worldY + CHEST_MAIN_ART_ANCHOR_OFFSET_PX] : [-10000, -10000], sizePx: [32, chestObject?.opened ? 48 : 32], frame: chestObject?.opened ? 1 : 0 });
          if (chestObject) addLayerPairDepth(chestObject.id, groundContactY(chestObject), WORLD_TIE_BREAK.pickup, chestShadowLayer, chestLayer);
          closedCrates.forEach((sprite, i) => { const crate = closedCrateObjects[i]; updateSprite2D(sprite, { frame: OBJECTS_OVERLAY_CRATE_CLOSED_FRAME, positionPx: crate ? [crate.worldX, crate.worldY + 16] : [-10000, -10000] }); if (crate) addLayerDepth(crate.id, groundContactY(crate), WORLD_TIE_BREAK.prop, closedCrateLayers[i]); });
          openCrates.forEach((sprite, i) => { const crate = openCrateObjects[i]; updateSprite2D(sprite, { frame: crate?.openFrame ?? 1, positionPx: crate ? [crate.worldX, crate.worldY + 16] : [-10000, -10000] }); if (crate) addLayerDepth(crate.id, groundContactY(crate), WORLD_TIE_BREAK.prop, openCrateLayers[i]); });
          const activeItemThrows = latestRef.current.itemThrows.filter((throwItem) => !itemThrowExpired(throwItem, performance.now()));
          const flightIds = new Set(activeItemThrows.map((throwItem) => throwItem.id));
          const goldObjects = world.objects.filter((entity) => entity.kind === "gold" && !flightIds.has(entity.id));
          const stairObjects = world.objects.filter((entity) => entity.kind === "stairs");
          items.forEach((pickup, i) => { const entity = itemObjects[i]; if (!entity) { hideCharacterSprite(pickup); return; } const presentation = pickupMainArtPresentation(entity.kind, entity.resource); const oscillationPx = isMinimap ? 0 : pickupOscillationOffset(now, presentation.oscillationAmplitudePx); const shadowWidthScale = presentation.shadowWidthScale * (isMinimap ? 1 : pickupShadowWidthScale(oscillationPx, presentation.oscillationAmplitudePx)); updateCharacterSprite(pickup, [entity.worldX, entity.worldY], 0, { frame: itemSpriteFrame(entity.kind, entity.resource), sizePx: entity.kind === "key" ? [16, 16] : [32, 32] }, 0, 0); updateSprite2D(pickup.shadow.handle, { sizePx: [32 * shadowWidthScale, 32 * presentation.shadowHeightScale] }); updateSprite2D(pickup.main.handle, { positionPx: [entity.worldX, entity.worldY + presentation.mainOffsetPx + oscillationPx] }); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          const doorObjects = world.puzzleObjects.filter((entity) => entity.kind === "door");
          doors.forEach((sprite, i) => {
            const door = doorObjects[i];
            updateSprite2D(sprite, { frame: door ? puzzleObjectSpriteFrame(door.kind, door.active) : 0, positionPx: door ? [door.x * 32 + 16, door.y * 32 + 16 + doorMainArtAnchorOffset(door.active)] : [-10000,-10000], sizePx: [32, door ? 48 : 32] });
            if (door) addLayerDepth(door.id, groundContactY(door), WORLD_TIE_BREAK.prop, doorLayers[i]);
          });
          const barrelObjects = world.puzzleObjects.filter((entity) => entity.kind === "barrel");
          barrels.forEach((barrel, i) => { const entity = barrelObjects[i]; const position = entity && (turnPresentation?.positionOf(entity.id, entity) ?? entity); if (!position) { hideCharacterSprite(barrel); return; } const positionPx: [number, number] = [position.x * 32 + 16, position.y * 32 + 16]; updateCharacterSprite(barrel, positionPx, 0, { sizePx: [32, 32], frame: 0 }); addCharacterDepth(entity.id, groundContactY(position), barrel); });
          const triggerObjects = world.puzzleObjects.filter((entity) => entity.kind === "trigger");
          const liveTriggerIds = new Set(triggerObjects.map((trigger) => trigger.id));
          for (const [id, animation] of triggerAnimations) if (!liveTriggerIds.has(id)) { animation.dispose(); triggerAnimations.delete(id); }
          triggers.forEach((sprite, i) => {
            const trigger = triggerObjects[i];
            if (!trigger) { updateSprite2D(sprite, { positionPx: [-10000, -10000] }); return; }
            const animation = triggerAnimations.get(trigger.id) ?? createFloorTriggerAnimationEntity(import.meta.env.BASE_URL);
            triggerAnimations.set(trigger.id, animation);
            const state = animation.getState();
            if (trigger.active && state.animation !== "activate") { animation.selectAnimation("activate"); animation.start(); }
            else if (!trigger.active && state.animation !== "off") { animation.selectAnimation("off"); animation.stop(); }
            animation.update(triggerDeltaMs);
            const frame = animation.getState().frame.sheetFrame ?? 0;
            triggerLayers[i].order = FLOOR_DECAL_RENDER_ORDER;
            updateSprite2D(sprite, { frame, positionPx: [trigger.worldX, trigger.worldY + 16], sizePx: [32, 32] });
          });
          const goldCoinFrame = Math.floor(performance.now() / 120) % goldCoinFramePaths.length;
          goldCoins.forEach((pickup, i) => { const entity = goldObjects[i]; if (!entity) { hideCharacterSprite(pickup); return; } updateCharacterSprite(pickup, [entity.worldX, entity.worldY - 10], 0, { frame: goldCoinFrame }, 0, 0); updateSprite2D(pickup.shadow.handle, { positionPx: [entity.worldX, entity.worldY], sizePx: [16, 16], color: [1, 1, 1, 0.5] }); addPickupDepth(entity.id, groundContactY(entity), pickup); });
          chestCoins.forEach((sprite, i) => { const throwItem = activeItemThrows[i]; const position = throwItem ? itemThrowPosition(throwItem, performance.now()) : null; updateSprite2D(sprite, { frame: goldCoinFrame, positionPx: position ? [position.x * 32 + 16, position.y * 32 + 16] : [-10000, -10000] }); if (position) addLayerDepth(throwItem!.id, groundContactY(position), WORLD_TIE_BREAK.effect, chestCoinLayers[i]); });
          const torchFrame = Math.floor(performance.now() / 200) % torchFramePaths.length;
          const wallTorches = world.wallDecorations.filter((decoration) => decoration.kind === "torch");
          const wallTraps = world.wallDecorations.filter((decoration) => decoration.kind === "trap");
          torches.forEach((sprite, i) => { const decoration = wallTorches[i]; updateSprite2D(sprite, { frame: torchFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); if (decoration) addLayerDepth(decoration.id, groundContactY(decoration), WORLD_TIE_BREAK.decoration, torchLayers[i]); });
          const trapFrame = trapFrameAt(performance.now());
          traps.forEach((sprite, i) => { const decoration = wallTraps[i]; trapLayers[i].order = FLOOR_TRAP_RENDER_ORDER; updateSprite2D(sprite, { frame: trapFrame, positionPx: decoration ? [decoration.worldX, decoration.worldY] : [-10000,-10000] }); });
          const campfireObjects = world.objects.filter((entity) => entity.kind === "campfire");
          campfires.forEach((sprite, i) => { const campfire = campfireObjects[i]; campfireLayers[i].order = FLOOR_TRAP_RENDER_ORDER; updateSprite2D(sprite, { positionPx: campfire ? [campfire.worldX, campfire.worldY] : [-10000, -10000] }); });
          stairs.forEach((sprite, i) => { const entity = stairObjects[i]; updateSprite2D(sprite, { frame: DUNGEON_STAIR_UP_FRAME, positionPx: entity ? [entity.worldX, entity.worldY] : [-10000,-10000], flipY: entity?.direction === "back" }); if (entity) addLayerDepth(entity.id, groundContactY(entity), WORLD_TIE_BREAK.stair, stairLayers[i]); });
          const activeParticles = latestRef.current.particleEffects.filter((effect) => !particleExpired(effect)).slice(-particleLayers.length);
          particles.forEach((sprite, i) => { const effect = activeParticles[i]; const now = performance.now(); const progress = effect ? particleProgress(effect, now) : 0; const ramp = effect?.kind === "damage" ? particleOpacity(effect, now) : progress < .25 ? progress / .25 : progress > .75 ? (1 - progress) / .25 : 1; const target = effect?.targetId ? world.actors.find((actor) => actor.id === effect.targetId) ?? null : null; const position = effect ? particlePosition(effect, target, now) : null; const sizePx = effect ? particleSizePx(effect, now) : 32; const purple = effect?.kind === "heal" || effect?.kind === "wand"; const damage = effect?.kind === "damage"; if (effect?.kind === "heal" || (damage && progress < 1)) particleLayers[i].order = OVERLAY_RENDER_ORDER - 1; else if (damage) particleLayers[i].order = LANDED_DAMAGE_PARTICLE_RENDER_ORDER; else if (effect && position) addLayerDepth(effect.id, groundContactY(position), WORLD_TIE_BREAK.effect, particleLayers[i]); updateSprite2D(sprite, { positionPx: position ? [position.x * 32 + 16, position.y * 32 + 16] : [-10000, -10000], sizePx: [sizePx, sizePx], frame: effect ? particleFrame(effect, now) : 0, rotation: effect?.rotation, color: purple ? [.72, .48, 1, ramp] : damage ? [1, .16, .08, ramp] : [1, 1, 1, ramp] }); });
          applyWorldDepth(worldDepthEntries);
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
            if (acquired.isPrimary && onFpsChangeRef.current) {
              if (!fpsSampleStartedAt) fpsSampleStartedAt = time;
              fpsFrameCount++;
              const elapsedMs = time - fpsSampleStartedAt;
              if (elapsedMs >= 1000) {
                onFpsChangeRef.current(Math.round(fpsFrameCount * 1000 / elapsedMs));
                fpsSampleStartedAt = time;
                fpsFrameCount = 0;
              }
            }
            animationFrameId = requestAnimationFrame(animate);
          };
          animationFrameId = requestAnimationFrame(animate);
        };
        const setTheme = (nextTheme: DungeonTheme) => {
          const image = tileThemeImages.get(nextTheme);
          if (!image || !engine || !tileTexture || cancelled) return;
          updateDynamicTexture(engine, tileTexture, image, { invertY: false });
          draw();
        };
        sceneRef.current = { draw, activate, beginStairClip, clearStairClip, setTheme };
        resizeSurface(surface); draw();
        if (acquired.isPrimary && sharedEngineRecord && !sharedEngineRecord.started) { await startEngine(engine); sharedEngineRecord.started = true; }
        if (cancelled) return;
        const observer = new ResizeObserver(() => { resizeSurface(surface!); draw(); }); observer.observe(host); observers.push(observer);
        window.addEventListener("resize", draw); observers.push({ disconnect: () => window.removeEventListener("resize", draw) });
        if (minimap) { setRendererLoaded(true); setWorldAlive(true); setMessage(""); }
        else setRendererLoaded(true);
      } catch (error) {
        console.error("Rogue's Dungeon Babylon Lite initialization failed:", error);
        if (renderer) { disposeSpriteRenderer(renderer); renderer = null; }
        atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); atlases = [];
        if (tileTexture) { releaseTexture(tileTexture); tileTexture = null; }
        tileThemeImages.forEach((image) => image.close()); tileThemeImages.clear();
        if (debugTexture) { releaseTexture(debugTexture); debugTexture = null; }
        if (pivotTexture) { releaseTexture(pivotTexture); pivotTexture = null; }
        if (pickupShadowTexture) { releaseTexture(pickupShadowTexture); pickupShadowTexture = null; }
        heroAnimation?.dispose(); heroAnimation = null; Object.values(enemyAnimations ?? {}).forEach((animation) => animation.dispose()); enemyAnimations = null; triggerAnimations.forEach((animation) => animation.dispose()); triggerAnimations.clear();
        acquiredTexturePaths.forEach(releaseSharedTexture); acquiredTexturePaths = []; textures = {};
        if (surface) { releaseSharedSurface(surface); surface = null; } engine = null;
        if (!cancelled) setMessage(getInitializationMessage(Boolean(navigator.gpu), error));
      }
    };
    queueMicrotask(() => { if (!cancelled) void setup(); });
    return () => {
      cancelled = true; cancelAnimationFrame(animationFrameId); observers.forEach((observer) => observer.disconnect()); sceneRef.current = null;
      if (renderer) disposeSpriteRenderer(renderer); atlases.forEach((atlas) => disposeSpriteAtlas(atlas)); if (tileTexture) releaseTexture(tileTexture); tileThemeImages.forEach((image) => image.close()); tileThemeImages.clear(); if (debugTexture) releaseTexture(debugTexture); if (pivotTexture) releaseTexture(pivotTexture); if (pickupShadowTexture) releaseTexture(pickupShadowTexture); heroAnimation?.dispose(); heroAnimation = null; Object.values(enemyAnimations ?? {}).forEach((animation) => animation.dispose()); enemyAnimations = null; triggerAnimations.forEach((animation) => animation.dispose()); triggerAnimations.clear(); acquiredTexturePaths.forEach(releaseSharedTexture); if (surface) releaseSharedSurface(surface);
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
  useEffect(() => {
    if (hoveredEnemy) {
      setTooltipEnemy(hoveredEnemy);
      setTooltipVisible(false);
      const frame = requestAnimationFrame(() => setTooltipVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setTooltipVisible(false);
    if (!tooltipEnemy) return undefined;
    const timer = window.setTimeout(() => setTooltipEnemy(null), 100);
    return () => window.clearTimeout(timer);
  }, [hoveredEnemy, tooltipEnemy]);
  const tooltipMotion = useUiMotion("enemy-tooltip", { xOffsetPx: tooltipVisible ? 0 : 3, opacity: tooltipVisible ? 1 : 0, depth: 8 }, 100, tooltipVisible ? easeInCubic : easeOutCubic);
  useLayoutEffect(() => {
    if (!tooltipEnemy) return undefined;
    const update = () => {
      const host = hostRef.current; const panel = tooltipRef.current;
      if (!host || !panel) return;
      const rect = host.getBoundingClientRect(); const size = cellSizeAt(rect); const center = getViewCenter(rect);
      const cellRect = (x: number, y: number) => { const point = getWorldCellScreenCenter({ x, y, center, viewportWidth: rect.width, viewportHeight: rect.height, tileCssSize: size }); return { left: rect.left + point.left - size / 2, top: rect.top + point.top - size / 2, width: size, height: size }; };
      const placement = findWorldTooltipPosition(rect, { width: panel.offsetWidth, height: panel.offsetHeight }, [cellRect(tooltipEnemy.x, tooltipEnemy.y), cellRect(campaign.player.x, campaign.player.y)], size + 8);
      setTooltipPosition(placement);
    };
    update(); const observer = new ResizeObserver(update);
    if (hostRef.current) observer.observe(hostRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [tooltipEnemy, campaign.player.x, campaign.player.y, zoom, camera]);
  const offsets = new Map();
  const chestSprites = null;
  const reticleKind = selectedCellReachable === false ? "invalid" : targetKindAt(selectedCell?.x, selectedCell?.y);
  const finishIrisPhase = (phase: UiIrisPhase) => {
    if (phase === "closing") {
      setIrisPhase("closed");
      if (stairDepartureAwaitingIrisRef.current) {
        // The iris is now fully closed, so the old player can be released
        // before the game installs the next floor.
        sceneRef.current?.clearStairClip();
        stairDepartureAwaitingIrisRef.current = false;
        onStairDepartureComplete?.();
      }
    }
    if (phase === "opening") { setIrisPhase("open"); setIrisMounted(false); setIrisRequested(false); if (rendererLoaded) setWorldAlive(true); }
  };
  return <div tabIndex={-1} className={minimap ? "minimap-view" : "world-view"} ref={hostRef} data-renderer="babylon-lite" data-content-style="2d" onMouseMove={mouseInteraction && worldAlive ? pointerMove : undefined} onMouseLeave={mouseInteraction && worldAlive ? pointerLeave : undefined} onMouseDown={mouseInteraction && worldAlive ? pointerDown : undefined} onMouseUp={mouseInteraction && worldAlive ? pointerUp : undefined} onWheel={mouseInteraction && worldAlive ? (event) => { event.preventDefault(); onZoom?.(event.deltaY < 0 ? 1 : -1); } : undefined} onContextMenu={mouseInteraction && worldAlive ? (event) => event.preventDefault() : undefined}><canvas tabIndex={-1} ref={canvasRef} className={minimap ? "minimap-view__canvas" : "world-view__canvas"} aria-label={minimap ? "Dungeon minimap" : "Pixel-perfect dungeon map"}/>{!minimap && resourceChangeEffects.map((effect) => <i key={effect.id} className={`world-view__resource-change-effect world-view__resource-change-effect--${effect.color}`} aria-hidden="true" />)}{chestSprites}{worldAlive && !minimap && feedbackCenter && floatingFeedback.map((effect) => { const key = `${effect.x},${effect.y}`; const index = offsets.get(key) ?? 0; offsets.set(key, index + 1); const position = getWorldScreenPosition({ x: effect.x, y: effect.y, center: feedbackCenter, viewportWidth: feedbackRect!.width, viewportHeight: feedbackRect!.height, tileCssSize: feedbackCellSize }); const zoomScale = typeof zoom === "number" ? zoom : 1; return <span key={effect.id} className={`world-view__floating-text world-view__floating-text--${effect.color}`} style={{ left: position.left, top: position.top - index * 12 * zoomScale, fontSize: `${14 * zoomScale}px`, "--world-floating-travel": `${11 * zoomScale}px` }} aria-hidden="true">{effect.text}</span>; })}{tooltipEnemy && !minimap && <section ref={tooltipRef} className="world-view__enemy-tooltip" aria-label={`${tooltipEnemy.name} information`} style={{ left: tooltipPosition?.left ?? -10000, top: tooltipPosition?.top ?? -10000, visibility: tooltipPosition ? "visible" : "hidden", ...tooltipMotion }}><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--portrait"><h2>Enemy: {tooltipEnemy.name}</h2><div className={`world-view__enemy-tooltip-portrait-box world-view__enemy-tooltip-portrait-box--${tooltipEnemy.name.toLowerCase()}`}><img src={tooltipEnemy.name === "Skeleton" ? texturePaths.skeleton : texturePaths.rat} alt="" /></div></div><div className="world-view__enemy-tooltip-section world-view__enemy-tooltip-section--resource-panel"><h2>RESOURCES</h2><EnemyResourceRows resources={tooltipEnemy.resources} /></div></section>}{mouseInteraction && worldAlive && selectedCell && reticleStyle && <i className={`world-view__grid-reticle world-view__grid-reticle--${reticleKind}`} style={reticleStyle}>{showPivotPoints && <span className="world-view__grid-reticle-code" aria-hidden="true">({String(selectedCell.y).padStart(2, "0")},{String(selectedCell.x).padStart(2, "0")})</span>}</i>}{!minimap && irisMounted && <UiIrisTransition phase={irisPhase} label={message} onPhaseComplete={finishIrisPhase} />}{!minimap && irisPhase === "open" && !rendererLoaded && message && <div role="status" className={minimap ? "minimap-view__message" : "world-view__message"}>{message}</div>}</div>;
}
