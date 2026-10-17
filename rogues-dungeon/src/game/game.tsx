import type { CSSProperties, PointerEvent as ReactPointerEvent, PointerEventHandler } from "react";
import type { Orientation } from "../ui/layout.ts";
import type { AbilityId, Action, Attributes, AttributeName, Campaign, Direction, DragSource, DropDestination, EquipmentGroup, Feedback, Floor, Item, Position, Preferences, QuickSlot, Resource, ResourceName, SelectedCell } from "./types.ts";
type Ability = typeof abilityCatalog[AbilityId];
interface Gain { from: number; to: number; max: number }
export type Gains = Partial<Record<ResourceName, Gain>>;
interface WithDispatch { campaign: Campaign; dispatch(action: Action): unknown }
interface PreferenceProps { preferences: Preferences; setPreference(value: Partial<Preferences>): void }
type PointerSource = DragSource | { kind: "ability"; item: { abilityId: AbilityId | null }; index: number };
export interface DragPresentation { source: PointerSource; item: PointerSource["item"]; x: number; y: number; destination: DropDestination | null }
interface PointerDrag { pointerId: number; source: PointerSource; startX: number; startY: number; active: boolean }
interface Movement { direction: string; sprint: boolean; source?: string }
interface SlotItemProps { type?: string; slotType?: "ability" | "quickslot" | "equipment" | "inventory"; slotSubtype?: EquipmentGroup; number?: number; hotkey?: string; text?: string; icon?: string; cost?: string | number; details?: string; accentColor?: string; disabled?: boolean; unavailable?: boolean; onClick?: () => void; onDoubleClick?: () => void; className?: string; dragSource?: Record<string, string | number>; dropTarget?: Record<string, string | number | boolean>; empty?: boolean; tooltip?: string }
interface InventoryStack { item: Item; quantity: number }
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { abilityCatalog, attributeLabels, createRunCampaign, directions, effectiveAttributes, isQuickSlottableItem, resourceState, rollStartingAttributes } from "../systems/procedural/world-procedural-system.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";
import { TRAP_CYCLE_MS, trapFrameAt, trapIsDangerous } from "../systems/procedural/world-hazards-system.ts";
import { describeInventoryDrop } from "./inventory-drag.ts";
import { gameZoomPresets } from "../content/world/zoom.ts";
import { projectLogEvents } from "./log-policy.ts";
import { createAudioManager } from "../systems/audio/audio-system.ts";
import { createAbilityParticle, createLevelUpSparkles, createSmokePuff, particleDurationMs, particleExpired, smokePuffDurationMs, type ParticleEffect } from "../systems/animation/particle-effects-system.ts";
import { projectDamageParticles } from "./damage-particle-projection.ts";
import { parseGameUrlOptions } from "./url-options.ts";
import { floorFromTiledRepairMap, serializeFloorToTiled } from "../systems/rendering/tile-map-system.ts";
import { buildManualTileScenario, getManualTileScenario } from "../systems/procedural/manual-tile-scenarios.ts";
import { createStoredZip } from "./zip.ts";
import { projectFloatingFeedback, removeFloatingFeedback } from "./floating-feedback.ts";
import { projectResourceChangeEffects, removeResourceChangeEffect, type ResourceChangeEffect } from "./resource-change-effects.ts";
import { getLatestMovement, getMovementKey, getMoveRepeatDelay, getMoveScheduleDelay } from "./keyboard-input.ts";
import { ControlsArea } from "../ui/ControlsArea.tsx";
import { useUiMotion, type UiMotionStyle } from "../ui/ui-transition-system.tsx";
import { getMouseMovementFromSelectedCell, getMousePathFromSelectedCell } from "./mouse-selection.ts";
import { clearRoguesDungeonStorage, formatSavedAgo, readPreferences, readSlot, readSlotSummary, readWorldSeed, writePreferences, writeSlot } from "../systems/persistence/save-system.ts";
import { runUrlForCampaign } from "./run-url-system.ts";
import { BabylonWorld, type DungeonTheme, type GameViewToUiAnimation } from "../systems/rendering/babylon-render-system.tsx";
import { ITEM_THROW_DURATION_MS, throwItems, type ItemThrow } from "../systems/animation/item-throw-animation-system.ts";
import { INTERACTIVE_BUMP_APEX_MS, TurnPresentationSystem } from "../systems/animation/turn-presentation-system.ts";
import { createQuestGameSession as createGameSession } from "../systems/quests/quest-progression-system.ts";
import { Tooltip } from "../ui/Tooltip.tsx";
import { LayoutContext } from "../ui/layout-context.ts";
import { dialogBounds, type DialogBounds, type DialogCenter } from "../ui/Dialog.tsx";
import { GameScreen } from "./screens/game-screen.tsx";
import { MenuScreen } from "./screens/menu-screen.tsx";
import { MainMenuWindow } from "./windows/main-menu-window.tsx";
import { SettingsWindow } from "./windows/settings-window.tsx";
import { HowToPlayWindow } from "./windows/how-to-play-window.tsx";
import { ProgressionWindow } from "./windows/progression-window.tsx";
import { CreateCharacterWindow } from "./windows/create-character-window.tsx";
import { MobileControls } from "./controls/mobile-controls.tsx";
import { ItemDragPreview } from "./controls/item-drag-preview.tsx";
import { TitleBar } from "./panels/title-bar.tsx";
import { StatusBar } from "./panels/status-bar.tsx";
import { InformationPanels, MobileInformationPanels } from "./panels/information-panels.tsx";
import { WorldViewRegion } from "./views/world-view-region.tsx";
import { ScrollArea } from "../ui/ScrollArea.tsx";
import { statusCapMarker } from "./status-cap-marker.ts";
import { AttributePanel, attributeHelp } from "./panels/attribute-panel.tsx";

export { DeltaValue } from "./panels/attribute-panel.tsx";

const icons: Partial<Record<string, string>> = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★" };
const resourceHelp: Record<ResourceName, string> = { health: "Health remaining; potions restore it.", stamina: "Low Stamina lowers damage.", offense: "Attack power after Stamina readiness.", defense: "Defense reduces incoming damage.", mana: "Mana is spent on abilities.", xp: "Experience toward next level." };
function ResourceBar({ name, value, gain, rank }: { name: ResourceName; value: Resource; gain?: Gain; rank?: number }) { const cap = name === "xp" ? Math.max(0, Math.min(100, value.currentMax ?? 100)) : statusCapMarker(rank ?? 1); const fill = Math.max(0, Math.min(cap, value.currentMax > 0 ? value.current / value.currentMax * cap : 0)); const gainStart = gain ? Math.min(cap, Math.max(0, gain.from / value.currentMax * cap)) : 0; const gainEnd = gain ? Math.min(cap, Math.max(0, gain.to / value.currentMax * cap)) : 0; const levelText = `LVL ${String(value.level).padStart(2, "0")}`; return <div className={"resource resource_" + name} aria-label={name + ": " + value.current + " of " + value.currentMax}><span>{icons[name]}</span><div className="resource_track"><i style={{ width: fill + "%" }} />{gain && <strong className="resource_gain" style={{ left: gainStart + "%", width: Math.max(0, gainEnd - gainStart) + "%" }} />}<b style={{ left: cap + "%" }} />{name === "xp" && <><em className="resource_level resource_level--empty">{levelText}</em><em className="resource_level resource_level--filled" style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}>{levelText}</em></>}</div></div>; }
export function ResourceList({ campaign, gains = {} }: { campaign: Campaign; gains?: Gains }) { const resources = resourceState(campaign); return <div className="resource_list">{(["health", "stamina", "offense", "defense", "mana", "xp"] as const).map((name) => { const value = resources[name]; const prefix = name === "xp" ? `Level ${String(value.level).padStart(2, "0")}. ${value.current} / ${value.currentMax} XP.` : `${value.current} / ${value.currentMax}.`; return <Tooltip key={name} content={`${prefix} ${resourceHelp[name]}`}><button tabIndex={-1} type="button" className="resource_tooltip_trigger" aria-label={`${name}: ${value.current} of ${value.currentMax}`}><ResourceBar name={name} value={value} gain={gains[name]} rank={name === "xp" ? undefined : campaign.progression.attributes[name]} /></button></Tooltip>; })}</div>; }
/** Renders an attribute number that pulses only when its color changes to a delta. */
export function AttributeViewItemList({ campaign, preview = null }: { campaign: Campaign; preview?: Attributes | null }) { return <AttributePanel attributes={campaign.progression.attributes} preview={preview} help={attributeHelp} />; }
export function itemPresentation(item: Item | null) { const [attribute, amount] = Object.entries(item?.modifiers ?? {})[0] ?? []; return { icon: icons[attribute] ?? "◆", cost: Number.isFinite(amount) ? `${amount! >= 0 ? "+" : ""}${amount}` : "" }; }
export function SlotItem({ type = "equipment", slotType, slotSubtype, number, hotkey, text = "", icon = "", cost = "", details = "", accentColor = "", disabled = false, unavailable = false, onClick, onDoubleClick, className = "", dragSource = {}, dropTarget = {}, empty = false, tooltip = "" }: SlotItemProps) { const classes = ["slot_item", `slot_item--${type}`, disabled && "disabled", unavailable && "unavailable", className].filter(Boolean).join(" "); const button = <button tabIndex={-1} type="button" className={classes} data-slot-type={slotType ?? type} data-slot-subtype={slotSubtype} data-slot-empty={empty} aria-disabled={unavailable || undefined} style={accentColor ? { "--slot-accent-color": accentColor } as CSSProperties : undefined} disabled={disabled} onClick={onClick} onDoubleClick={onDoubleClick} {...dropTarget} {...dragSource}>{type === "ability" && <strong className="slot_item_number">[{(number ?? 0) + 1}]</strong>}{type === "quick" && hotkey && <kbd className="slot_item_hotkey">[{hotkey}]</kbd>}{empty ? <span className="empty_slot" aria-label={type === "ability" ? "Empty ability slot" : type === "quick" ? "Empty quick slot" : type === "inventory" ? "Empty inventory slot" : "Empty equipment slot"}>+</span> : <><span className="slot_item_text">{text}</span><i className="slot_item_icon">{icon}</i><em className="slot_item_cost">{cost}</em>{details && <small className="slot_item_details">{details}</small>}<b className="drag_handle" aria-hidden="true">⠿</b></>}</button>; return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button; }
function abilityHelp(ability: Ability | null | undefined) { if (!ability) return "Assign an ability to fill this slot."; return ability.kind === "heal" ? `Heal: +${ability.amount} Health; costs ${ability.manaCost} Mana.` : `Wand: ${ability.damage} damage within ${ability.range} tiles; ${ability.manaCost} Mana.`; }
export function AbilityViewItem({ index, ability, disabled, onUse }: { index: number; ability?: Ability | null; disabled: boolean; onUse(): void }) { const available = Boolean(ability && !disabled); return <SlotItem type="ability" slotType="ability" number={index} text={ability?.title} icon={ability?.icon} cost={ability?.manaCost} accentColor="#c0aaff" disabled={!ability} unavailable={!available} onClick={available ? onUse : undefined} className="ability_row" dropTarget={{ "data-drop-ability": index }} dragSource={ability ? { "data-drag-kind": "ability", "data-drag-index": index, "aria-label": `Drag ${ability.title}` } : {}} empty={!ability} tooltip={abilityHelp(ability)} />; }
export function AbilityViewItemList({ campaign, dispatch, cooldowns = {} }: WithDispatch & { cooldowns?: Partial<Record<AbilityId, number>> }) { const mana = campaign.player.resources.mana.current; const now = performance.now(); return <div className="view_list">{campaign.player.abilities.slice(0, 3).map((id, index) => { const ability = id ? abilityCatalog[id] : null; return <AbilityViewItem key={index} index={index} ability={ability} disabled={Boolean(ability && (mana < ability.manaCost || (cooldowns[ability.id] ?? 0) > now))} onUse={() => dispatch({ type: "ability", index })} />; })}</div>; }
function modifierSummary(item: Item | null) { if (!item) return ""; const modifiers = Object.entries(item.modifiers ?? {}).map(([name, value]) => `${attributeLabels[name as AttributeName] ?? name} ${value >= 0 ? "+" : ""}${value}`); if (Number.isFinite(item.hitChance)) modifiers.push(`HIT ${item.hitChance}%`); if (Number.isFinite(item.critChance)) modifiers.push(`CRIT ${item.critChance}%`); if (item.perks?.length) modifiers.push(item.perks.join(", ")); return modifiers.join(", "); }
function equipmentSlotHelp(item: Item | null) { const effect = modifierSummary(item); return item ? `${effect || "No stat change"}${item.slotSpan === 2 ? ". Uses both positions." : ""} Double-click to replace.` : "Equipping changes your attributes."; }
function inventoryItemHelp(item: Item) { const effect = modifierSummary(item); return effect ? `${effect}${item.slotSpan === 2 ? ". Uses both positions." : ""} Double-click to equip.` : "No stats · Double-click to equip."; }
export function stackInventoryItems(inventory: Item[]): InventoryStack[] {
  const stacks: InventoryStack[] = [];
  const indexes = new Map<string, number>();
  for (const item of inventory) {
    const key = isQuickSlottableItem(item) ? `quick:${item.consumableResource}` : null;
    if (key && indexes.has(key)) stacks[indexes.get(key)!].quantity += item.quantity ?? 1;
    else {
      if (key) indexes.set(key, stacks.length);
      stacks.push({ item, quantity: isQuickSlottableItem(item) ? item.quantity ?? 1 : 1 });
    }
  }
  return stacks;
}

export function itemDisplayName(item: Item, quantity: number) {
  return isQuickSlottableItem(item) ? `${item.name} x ${quantity}` : `${item.name}${quantity > 1 ? ` x ${quantity}` : ""}`;
}
function EquipmentItem({ item, group, index, drag }: { item: Item | null; group: EquipmentGroup; index: number; drag: DragPresentation | null }) { const departure = drag?.source.kind === "slot" && drag.source.group === group && drag.source.index === index; const landing = drag?.destination?.kind === "slot" && drag.destination.group === group && drag.destination.index === index; const presentation = itemPresentation(item); const details = item ? `${modifierSummary(item)}${item.slotSpan === 2 ? " · 2 slots" : ""}` : ""; return <SlotItem slotType="equipment" slotSubtype={group} text={item?.name} icon={presentation.icon} cost={presentation.cost} details={details} className={["equipment_item", departure && "drag_departure", landing && "drag_landing"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-group": group, "data-drop-index": index }} dragSource={item ? { "data-drag-kind": "slot", "data-drag-id": item.id, "data-drag-group": group, "data-drag-index": index, "aria-label": `Drag ${item.name}` } : {}} empty={!item} tooltip={equipmentSlotHelp(item)} />; }
export function SlotList({ campaign, drag = null }: { campaign: Campaign; drag?: DragPresentation | null }) { return <div className="slot_scroll">{([["Weapons", "weapons"], ["Armor", "armor"]] as const).map(([label, group]) => <div className="slot_group" key={group}><h3>{label}</h3>{campaign.player.equipment[group].map((item, index) => <EquipmentItem key={index} item={item} group={group} index={index} drag={drag} />)}</div>)}</div>; }
export function EquipmentComparison({ campaign, drag }: { campaign: Campaign; drag: DragPresentation | null }) {
  const destination = drag?.destination;
  if (!drag || !destination || destination.kind !== "slot" || (drag.source.kind !== "inventory" && drag.source.kind !== "slot")) return null;
  const replaced = campaign.player.equipment[destination.group][destination.index];
  const transfer = describeInventoryDrop(campaign, drag.source, destination, replaced);
  if (!transfer?.preview) return null;
  const before = effectiveAttributes(campaign); const after = transfer.preview;
  const incoming = drag.source.item as Item;
  const slots = incoming.slotSpan === 2 ? `${destination.group === "weapons" ? "Weapons" : "Armor"} ${destination.index + 1} + ${destination.index === 0 ? 2 : 1}` : `${destination.group === "weapons" ? "Weapons" : "Armor"} ${destination.index + 1}`;
  return <section className="equipment_comparison" aria-label="Equipment comparison"><strong>Swap comparison</strong><p><b>Before:</b> {replaced ? `${replaced.name} — ${modifierSummary(replaced)}` : "Empty"}</p><p><b>After:</b> {incoming.name} — {modifierSummary(incoming)} · {slots}</p><dl>{(["offense", "defense", "mana"] as const).map((name) => <div key={name}><dt>{attributeLabels[name]}</dt><dd>{before[name]} → {after[name]} ({after[name] - before[name] >= 0 ? "+" : ""}{after[name] - before[name]})</dd></div>)}</dl></section>;
}
function quickSlotAvailable(campaign: Campaign, slot: QuickSlot | null) { const item = slot?.item; if (!item || !isQuickSlottableItem(item)) return false; const resource = resourceState(campaign)[item.consumableResource]; return resource.current < resource.currentMax; }
function QuickSlotItem({ campaign, slot, index, drag, dispatch }: { campaign: Campaign; slot: QuickSlot | null; index: number; drag: DragPresentation | null; dispatch(action: Action): unknown }) { const actual = slot?.item && isQuickSlottableItem(slot.item) ? slot.item : null; const available = quickSlotAvailable(campaign, slot); const landing = drag?.destination?.kind === "quick-slot" && drag.destination.index === index; return <SlotItem type="quick" slotType="quickslot" hotkey={index === 0 ? "Q" : "E"} text={actual ? `${actual.name} x ${slot?.quantity ?? 0}` : ""} className={["quick_slot", landing && "drag_landing", drag?.source.kind === "quick-slot" && drag.source.index === index && "drag_departure"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-quick-slot": index }} dragSource={actual ? { "data-drag-kind": "quick-slot", "data-drag-id": actual.id, "data-drag-index": index, "aria-label": `Drag ${actual.name}` } : {}} empty={!actual} unavailable={!available} onClick={available ? () => dispatch({ type: "use-quick-slot", index }) : undefined} tooltip={actual ? `${actual.name}; press ${index === 0 ? "Q" : "E"} to use.` : "Drag a Health Potion or Mana Potion here."} />; }
export function QuickSlotsView({ campaign, dispatch, drag = null }: WithDispatch & { drag?: DragPresentation | null }) { const slots = campaign.player.quickSlots ?? [null, null]; return <div className="quick_slots_list">{slots.map((slot, index) => <QuickSlotItem key={index} campaign={campaign} slot={slot} index={index} drag={drag} dispatch={dispatch} />)}</div>; }
export function InventoryViewItems({ campaign, dispatch, drag = null }: WithDispatch & { drag?: DragPresentation | null }) { const stacks = stackInventoryItems(campaign.player.inventory); const emptySlots = Math.max(0, campaign.player.inventoryCapacity - campaign.player.inventory.length); return <ScrollArea className="inventory_scroll">{stacks.map(({ item, quantity }) => { const departure = drag?.source.kind === "inventory" && drag.source.item.id === item.id; const presentation = itemPresentation(item); const displayName = itemDisplayName(item, quantity); const details = item.category === "equipment" ? `${modifierSummary(item)}${item.slotSpan === 2 ? " · 2 slots" : ""}` : ""; return <SlotItem key={item.id} type="inventory" slotType="inventory" text={displayName} icon={presentation.icon} cost={presentation.cost} details={details} className={["inventory_item", departure && "drag_departure"].filter(Boolean).join(" ")} onDoubleClick={() => item.category !== "consumable" && dispatch({ type: "equip", itemId: item.id, group: item.group, index: 0 })} dragSource={{ "data-drag-kind": "inventory", "data-drag-id": item.id, "data-inventory-item-id": item.id, "data-inventory-resource": item.consumableResource ?? "", "aria-label": `Drag ${displayName}` }} tooltip={inventoryItemHelp(item)} />; })}{Array.from({ length: emptySlots }, (_, index) => <SlotItem key={`empty-inventory-${index}`} type="inventory" slotType="inventory" className={["inventory_item", drag?.destination?.kind === "inventory" && drag.destination.index === index && "drag_landing"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-inventory-slot": index }} empty disabled tooltip="Empty inventory slot." />)}</ScrollArea>; }
async function downloadDungeonBundle(entries: Parameters<typeof createStoredZip>[0], name: string) {
  const bundle = createStoredZip(entries);
  const url = URL.createObjectURL(bundle); const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
async function loadDungeonTilesetAssets() {
  const base = import.meta.env.BASE_URL;
  const assetUrl = (path: string) => new URL(`${base}assets/${path}`, window.location.origin).href;
  const [tileset, image] = await Promise.all([
    fetch(assetUrl("art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx")).then((response) => response.ok ? response.text() : Promise.reject(new Error("Dungeon tileset could not be loaded."))),
    fetch(assetUrl("art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png")).then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error("Dungeon tileset image could not be loaded."))).then((bytes) => new Uint8Array(bytes)),
  ]);
  const portableTileset = tileset.replace('source="../../tilesets/tileset-dungeon.png"', 'source="tileset-dungeon.png"');
  if (portableTileset === tileset) throw new Error("Dungeon tileset image path could not be made portable.");
  return [["tileset-dungeon.tsx", portableTileset], ["tileset-dungeon.png", image as Uint8Array<ArrayBuffer>]] as Parameters<typeof createStoredZip>[0];
}
async function downloadCurrentMap(campaign: Campaign) {
    const name = `rogues-dungeon-world-${campaign.world}-level-${campaign.floor.level}-seed-${campaign.floor.seed}.tmj`;
    const editableMap = serializeFloorToTiled({ campaign });
    // The map, TSX, and PNG share the ZIP root, so extracted Tiled projects do
    // not depend on any repository-specific relative paths.
    editableMap.tilesets[0].source = "tileset-dungeon.tsx";
    await downloadDungeonBundle([[name, JSON.stringify(editableMap, null, 2)], ...await loadDungeonTilesetAssets()], name.replace(/\.tmj$/i, ".zip"));
}
function MapFixControls({ campaign, slot, onImport, error }: { campaign: Campaign; slot: string | null; onImport(file?: File): void; error: string }) {
  const exportMap = async () => { try { await downloadCurrentMap(campaign); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the editable map bundle."); } };
  return <section className="map_fix_controls" aria-label="Map repair tools"><strong>Map Fix</strong><button tabIndex={-1} type="button" onClick={exportMap}>Open Editable Copy</button><label>Load repaired map<input tabIndex={-1} type="file" accept=".tmj,.json,application/json" onChange={(event) => onImport(event.target.files?.[0])} /></label>{slot && <span>Slot {slot}</span>}{error && <span role="alert">{error}</span>}</section>;
}
function MapTestControls({ campaign }: { campaign: Campaign }) {
  const openCurrentMap = async () => { try { await downloadCurrentMap(campaign); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the current map bundle."); } };
  const openTileset = async () => { try { await downloadDungeonBundle(await loadDungeonTilesetAssets(), "rogues-dungeon-floor-wall-tileset.zip"); } catch (error) { window.alert(error instanceof Error ? error.message : "Could not create the floor/wall tileset bundle."); } };
  return <section className="map_fix_controls" aria-label="Map test tools"><strong>MapTest</strong><button tabIndex={-1} type="button" onClick={() => void openCurrentMap()}>Open Current Map</button><button tabIndex={-1} type="button" onClick={() => void openTileset()}>Open Floor/Wall Tileset</button></section>;
}
const keyboardControlRows = Object.freeze([
  { label: "Abilities:", keys: ["1", "2", "3"] },
  { label: "Quick:", keys: ["Q", "W", "E"] },
  { label: "Move:", keys: ["A", "S", "D"] },
  { label: "More:", keys: ["Z", "X", "C"] },
]);
const collapsedKeyboardGroups = Object.freeze([
  { label: "Move:", keys: ["W", "A", "S", "D"] },
  { label: "Abilities:", keys: ["1", "2", "3"] },
  { label: "Quick:", keys: ["Q", "E"] },
  { label: "More:", keys: ["Z", "X", "C"] },
]);
const keyboardKeyHelp: Readonly<Partial<Record<string, string>>> = Object.freeze({
  "1": "Use ability 1",
  "2": "Use ability 2",
  "3": "Use ability 3",
  Q: "Use Quickslot 1",
  W: "Move Up",
  E: "Use Quickslot 2",
  A: "Move Left",
  S: "Move Down",
  D: "Move Right",
  Z: "Toggle Controls",
  X: "Wait 1 time tick",
  C: "Toggle Panels",
});
const keyboardKeyCategory: Readonly<Partial<Record<string, string>>> = Object.freeze({ 1: "abilities", 2: "abilities", 3: "abilities", Q: "quick", W: "move", E: "quick", A: "move", S: "move", D: "move", Z: "more", X: "more", C: "more" });
const statusMovementDirections: Readonly<Record<string, Direction>> = Object.freeze({ W: "n", A: "w", S: "s", D: "e" });
type StatusKeyRole = "move" | "quick" | "abilities" | "more" | "default";
function statusKeyRole(key: string, fallback: StatusKeyRole): StatusKeyRole { return statusMovementDirections[key] ? "move" : /^[1-3]$/.test(key) ? "abilities" : key === "Q" || key === "E" ? "quick" : key === "Z" || key === "X" || key === "C" ? "more" : fallback; }
function movementAvailability(campaign: Campaign): Readonly<Record<Direction, boolean>> {
  return (Object.keys(directions) as Direction[]).reduce((available, direction) => {
    const [dx, dy] = directions[direction];
    const x = campaign.player.x + dx;
    const y = campaign.player.y + dy;
    const hasActionableEntity = campaign.floor.entities.some((entity) => entity.x === x && entity.y === y);
    available[direction] = isWalkable(campaign.floor, x, y) || hasActionableEntity;
    return available;
  }, {} as Record<Direction, boolean>);
}
const feedbackKeys = new Set(Object.keys(keyboardKeyHelp));
function InputKey({ keyLabel, category = keyboardKeyCategory[keyLabel], mode = "display", pressed = false, available = true, colorAvailable = available, className = "", onHoverStart, onHoverEnd, onActivate, onPressStart, onPressEnd }: { keyLabel: string; category?: string; mode?: string; pressed?: boolean; available?: boolean; colorAvailable?: boolean; className?: string; onHoverStart?(key: string): void; onHoverEnd?(key: string): void; onActivate?(): void; onPressStart?(key: string): void; onPressEnd?(key: string): void }) {
  const slotKey = category === "abilities" || category === "quick";
  const unavailableKey = slotKey || category === "move";
  const classes = ["input-key", category && `input-key--${category}`, unavailableKey && !colorAvailable && "input-key--unavailable", mode === "feedback" && pressed && "input-key--pressed", mode === "feedback" && pressed && "input-key--active", className].filter(Boolean).join(" ");
  return <kbd className={classes} aria-label={`Keyboard key ${keyLabel}`} aria-disabled={unavailableKey && !available} data-input-mode={mode} onClick={onActivate} onPointerDown={() => available && onPressStart?.(keyLabel)} onPointerUp={() => onPressEnd?.(keyLabel)} onPointerCancel={() => onPressEnd?.(keyLabel)} onPointerEnter={() => onHoverStart?.(keyLabel)} onPointerLeave={() => { onHoverEnd?.(keyLabel); onPressEnd?.(keyLabel); }}>{keyLabel}</kbd>;
}
function StatusControls({ campaign, canOverride, orientation, setDeveloperAspect, onTogglePanels, onWait, fps, urlArgs, setUrlArgs, mapTest, setMapTest, mobilePanel = "controls", setMobilePanel = () => {}, drag = null }: { campaign: Campaign; canOverride: boolean; orientation: Orientation; setDeveloperAspect(value: Orientation): void; onTogglePanels(): void; onWait(): void; fps: number | null; urlArgs: boolean; setUrlArgs(value: boolean): void; mapTest: boolean; setMapTest(value: boolean): void; mobilePanel?: string; setMobilePanel?(value: string): void; drag?: DragPresentation | null }) {
  const { showPivotPoints, setShowPivotPoints } = useContext(LayoutContext);
  const [expanded, setExpanded] = useState(false);
  const [hoveredKey, setHoveredKey] = useState("");
  const [pressedKeys, setPressedKeys] = useState(() => new Set<string>());
  const movement = movementAvailability(campaign);
  const keyAvailable = (key: string, role: StatusKeyRole = "default") => {
    if ((drag?.source.kind === "ability" && key === String(drag.source.index + 1)) || (role === "quick" && drag?.source.kind === "quick-slot" && key === (drag.source.index === 0 ? "Q" : "E"))) return false;
    if (/^[1-3]$/.test(key)) { const abilityId = campaign.player.abilities[Number(key) - 1]; const ability = abilityId ? abilityCatalog[abilityId] : null; return Boolean(ability && campaign.player.resources.mana.current >= ability.manaCost); }
    if ((role === "move" || role === "default") && statusMovementDirections[key]) {
      return movement[statusMovementDirections[key]];
    }
    if (key === "Q" || key === "E") return quickSlotAvailable(campaign, campaign.player.quickSlots?.[key === "E" ? 1 : 0] ?? null);
    if (key === "Z" || key === "X" || key === "C") return true;
    return false;
  };
  useEffect(() => {
    const normalize = (event: KeyboardEvent) => String(event.key ?? "").toUpperCase();
    const down = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key) || !keyAvailable(key)) return; if (key === "Z" && !event.repeat) { event.preventDefault(); setExpanded((value) => !value); } if (key === "X" && !event.repeat) { event.preventDefault(); onWait(); } if (key === "C" && !event.repeat) { event.preventDefault(); onTogglePanels(); } setPressedKeys((current) => current.has(key) ? current : new Set(current).add(key)); };
    const up = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key)) return; setPressedKeys((current) => { if (!current.has(key)) return current; const next = new Set(current); next.delete(key); return next; }); };
    const clear = () => setPressedKeys(new Set());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); };
  }, [campaign, drag, onTogglePanels, onWait]);
  const titleText = keyboardKeyHelp[hoveredKey] ?? "Controls";
  const titleVisible = Boolean(expanded || hoveredKey);
  const summaryMotion = useUiMotion("status-summary", { opacity: expanded ? 0 : 1, depth: 1 });
  const toggleExpanded = () => setExpanded((value) => !value);
  const inputKeyHoverProps = { onHoverStart: setHoveredKey, onHoverEnd: (key: string) => setHoveredKey((current) => current === key ? "" : current) };
  const setPointerPressed = (key: string, pressed: boolean) => setPressedKeys((current) => {
    if (!keyAvailable(key)) return current;
    const next = new Set(current);
    if (pressed) next.add(key); else next.delete(key);
    return next;
  });
  return <StatusBar>
    <div className="desktop_status">
      <div className={`keyboard_controls_region${expanded ? " keyboard_controls_region--expanded" : ""}`}>
        <div className="keyboard_collapsed_controls" aria-hidden={expanded} style={summaryMotion}><div className="keyboard_collapsed_summary" aria-label="Move WASD | Abilities: 123 | Quick: Q E | More ZXC">{collapsedKeyboardGroups.map(({ label, keys }) => <span className="keyboard_collapsed_group" key={label}><span className="status_shortcut"><span>{label}</span>{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} available={available} colorAvailable={available} onActivate={key === "Z" ? toggleExpanded : key === "C" ? onTogglePanels : undefined} />; })}</span></span>)}</div></div>
        <ControlsArea expanded={expanded} titleVisible={titleVisible} titleText={titleText} onToggle={toggleExpanded}>{keyboardControlRows.map(({ label, keys }) => <div className="keyboard_tray_row" key={label}><div className="keyboard_tray_keys">{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} mode="feedback" available={available} colorAvailable={available} pressed={pressedKeys.has(key)} className="keyboard_tray_key" onActivate={key === "Z" ? toggleExpanded : key === "X" ? onWait : key === "C" ? onTogglePanels : undefined} onPressStart={(pressedKey) => setPointerPressed(pressedKey, true)} onPressEnd={(pressedKey) => setPointerPressed(pressedKey, false)} {...inputKeyHoverProps} />; })}</div></div>)}</ControlsArea>
      </div>
      {canOverride && <div className="dev_settings"><span className="dev_settings_label">Dev Settings</span><button tabIndex={-1} onClick={() => setDeveloperAspect(orientation === "landscape" ? "portrait" : "landscape")}>Aspect: {orientation === "landscape" ? "Landscape" : "Portrait"}</button><button tabIndex={-1} type="button" aria-pressed={showPivotPoints} onClick={() => setShowPivotPoints((value) => !value)}>Pivots: {showPivotPoints ? "On" : "Off"}</button><button tabIndex={-1} type="button" aria-pressed={urlArgs} onClick={() => setUrlArgs(!urlArgs)}>Url: {urlArgs ? "On" : "Off"}</button><button tabIndex={-1} type="button" aria-pressed={mapTest} onClick={() => setMapTest(!mapTest)}>MapTest: {mapTest ? "On" : "Off"}</button><output aria-live="off">FPS: {fps ?? "--"}</output></div>}
    </div>
    <div className="mobile_status" role="group" aria-label="Bottom panel"><Tooltip content="Show movement and ability controls."><button tabIndex={-1} type="button" aria-pressed={mobilePanel === "controls"} onClick={() => setMobilePanel("controls")}>Control</button></Tooltip><Tooltip content="Show stats, gear, quest, and log."><button data-ui-pickup-fallback tabIndex={-1} type="button" aria-pressed={mobilePanel === "info"} onClick={() => setMobilePanel("info")}>Info</button></Tooltip></div>
  </StatusBar>;
}
function itemDropTarget(target: Element | null, campaign: Campaign | null): { destination: DropDestination; targetItem?: Item | null } | null { const quick = target?.closest<HTMLElement>("[data-drop-quick-slot]"); if (quick) { const index = Number(quick.dataset.dropQuickSlot); return { destination: { kind: "quick-slot", index }, targetItem: campaign?.player.quickSlots?.[index]?.item ?? null }; } const slot = target?.closest<HTMLElement>("[data-drop-group]"); if (slot) { const group = slot.dataset.dropGroup as EquipmentGroup; const index = Number(slot.dataset.dropIndex); return { destination: { kind: "slot", group, index }, targetItem: campaign!.player.equipment[group]?.[index] }; } const inventorySlot = target?.closest<HTMLElement>("[data-drop-inventory-slot]"); if (inventorySlot) return { destination: { kind: "inventory", index: Number(inventorySlot.dataset.dropInventorySlot) } }; return null; }

export function Game() {
  const { orientation, canOverride, showPivotPoints, setDeveloperAspect } = useContext(LayoutContext);
  const [summaries, setSummaries] = useState<ReturnType<typeof readSlotSummary>>(() => { try { return readSlotSummary(localStorage); } catch { return ["1", "2", "3"].map((slot) => ({ slot, occupied: false, level: null, xpLevel: null, savedAt: undefined })); } });
  const [summaryNow, setSummaryNow] = useState(() => Date.now());
  const [slot, setSlot] = useState<string | null>(null); const [campaign, setCampaign] = useState<Campaign | null>(null); const [worldAlive, setWorldAlive] = useState(false); const [stairDepartureStartedAt, setStairDepartureStartedAt] = useState<number | null>(null); const [settings, setSettings] = useState(false); const [howToPlay, setHowToPlay] = useState(false); const [gameSettingsCenter, setGameSettingsCenter] = useState<DialogCenter | null>(null); const [progressionOpen, setProgressionOpen] = useState(false); const [creationSlot, setCreationSlot] = useState<string | null>(null); const [creationAttributes, setCreationAttributes] = useState<Attributes | null>(null); const [menuExiting, setMenuExiting] = useState(false); const [saveError, setSaveError] = useState(""); const [preview, setPreview] = useState<Attributes | null>(null); const [dragPresentation, setDragPresentation] = useState<DragPresentation | null>(null); const [gains, setGains] = useState<Gains>({}); const [floatingFeedback, setFloatingFeedback] = useState<Feedback[]>([]); const [resourceChangeEffects, setResourceChangeEffects] = useState<ResourceChangeEffect[]>([]); const [particleEffects, setParticleEffects] = useState<ParticleEffect[]>([]); const [itemThrows, setItemThrows] = useState<ItemThrow[]>([]); const [abilityCooldowns, setAbilityCooldowns] = useState<Partial<Record<AbilityId, number>>>({}); const [cameraAnimationToken, setCameraAnimationToken] = useState(0); const [fps, setFps] = useState<number | null>(null);
  const [primaryInfoOpen, setPrimaryInfoOpen] = useState(true); const [secondaryInfoOpen, setSecondaryInfoOpen] = useState(true); const [uiAnimations, setUiAnimations] = useState<GameViewToUiAnimation[]>([]); const [pendingUiCredits, setPendingUiCredits] = useState<{ id: string; previous: Campaign }[]>([]);
  const [selectedGridSpot, setSelectedGridSpot] = useState<SelectedCell | null>(null); const [campfireMenu, setCampfireMenu] = useState<Position | null>(null); const [campfireRestConfirming, setCampfireRestConfirming] = useState(false); const [campfireRestTransition, setCampfireRestTransition] = useState(false); const [mobilePanel, setMobilePanel] = useState("controls"); const [mapTest, setMapTest] = useState(false);
  const [dungeonTheme, setDungeonTheme] = useState<DungeonTheme>(1);
  const gainTimers = useRef(new Map<ResourceName, ReturnType<typeof setTimeout>>()); const abilityTimers = useRef(new Set<ReturnType<typeof setTimeout>>()); const abilityCooldownsRef = useRef<Partial<Record<AbilityId, number>>>({}); const sessionGenerationRef = useRef(0); const settingsBoundsRef = useRef<DialogBounds | null>(null); const creationBoundsRef = useRef<DialogBounds | null>(null); const helpBoundsRef = useRef<DialogBounds | null>(null);
  const floatingTimers = useRef(new Map<string | undefined, ReturnType<typeof setTimeout>>()); const resourceChangeEffectTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const turnPresentation = useRef(new TurnPresentationSystem()).current;
  useEffect(() => { if (campaign) return; const interval = window.setInterval(() => setSummaryNow(Date.now()), 60_000); return () => window.clearInterval(interval); }, [campaign]);
  useEffect(() => () => { floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear(); abilityTimers.current.forEach(clearTimeout); abilityTimers.current.clear(); }, []);
  const [preferences, setPreferences] = useState<Preferences>(() => { try { return readPreferences(localStorage); } catch { return { zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 80, musicVolume: 1, muteAll: false, urlArgs: false }; } });
  useEffect(() => { sessionGenerationRef.current++; }, [slot]);
  const [urlOptions] = useState(() => parseGameUrlOptions(window.location.search));
  const urlRunStarted = useRef(false);
  const randomSeed = urlOptions.seed;
  const [audio] = useState(() => createAudioManager({ search: window.location.search }));
  const togglePanels = () => { if (primaryInfoOpen && secondaryInfoOpen) setSecondaryInfoOpen(false); else if (primaryInfoOpen) setPrimaryInfoOpen(false); else if (secondaryInfoOpen) setPrimaryInfoOpen(true); else setSecondaryInfoOpen(true); };
  useEffect(() => {
    const next = runUrlForCampaign(window.location.href, preferences.urlArgs, campaign, slot);
    if (next !== window.location.href) window.history.replaceState(null, "", next);
  }, [campaign, preferences.urlArgs, slot]);
  useEffect(() => { audio.setPreferences(preferences); }, [audio, preferences]);
  useEffect(() => { void audio.prewarm(); }, [audio]);
  useEffect(() => { const startMusic = () => audio.startMusic(); window.addEventListener("pointerdown", startMusic); window.addEventListener("keydown", startMusic); return () => { window.removeEventListener("pointerdown", startMusic); window.removeEventListener("keydown", startMusic); }; }, [audio]);
  const [fullscreenActual, setFullscreenActual] = useState(() => Boolean(document.fullscreenElement));
  const fullscreenStateRef = useRef(Boolean(document.fullscreenElement));
  const sessionRef = useRef<ReturnType<typeof createGameSession> | null>(null);
  const campaignRef = useRef<Campaign | null>(null);
  const collectedItemIdsRef = useRef(new Set<string>());
  useLayoutEffect(() => {
    const previous = campaignRef.current;
    if (campaign && previous) for (const entity of previous.floor.entities) {
      const collected = collectedItemIdsRef.current.has(entity.id) || (entity.kind === "item" && collectedItemIdsRef.current.has(entity.item.id));
      if (entity.kind === "crate") continue;
      if (!collected || campaign.floor.entities.some((current) => current.id === entity.id) || entity.kind === "campfire" || !["item", "potion", "gold", "key"].includes(entity.kind)) continue;
      const id = `${entity.id}:${campaign.floor.time}`;
      const resource = entity.kind === "potion" ? entity.resource : entity.kind === "item" ? entity.item.consumableResource : null;
      const quickSlot = resource ? campaign.player.quickSlots?.findIndex((slot) => slot?.item.consumableResource === resource) ?? -1 : -1;
      const existingInventoryTarget = resource ? previous.player.inventory.some((item) => item.consumableResource === resource) : entity.kind === "item" && previous.player.inventory.some((item) => item.id === entity.item.id);
      const destination = entity.kind === "gold" || entity.kind === "key" ? "counter" : "row";
      const target = destination === "counter" ? `[data-ui-counter-icon="${entity.kind}"]` : quickSlot >= 0 ? `[data-drop-quick-slot="${quickSlot}"]` : existingInventoryTarget && resource ? `[data-inventory-resource="${resource}"]` : existingInventoryTarget && entity.kind === "item" ? `[data-inventory-item-id="${entity.item.id}"]` : "[data-drop-inventory-slot=\"0\"]";
      const frame = entity.kind === "gold" ? 3 : entity.kind === "key" ? 5 : entity.kind === "potion" ? entity.resource === "health" ? 6 : 7 : 2;
      audio.playCue(entity.kind === "key" ? "key" : entity.kind === "potion" ? "collect" : "inventory");
      const mainSizePx = entity.kind === "key" ? 16 : 32;
      const mainOffsetPx = { x: 0, y: entity.kind === "potion" ? -8 : 0 };
      setUiAnimations((current) => [...current, { id, kind: entity.kind, x: entity.x, y: entity.y, frame, mainSizePx, mainOffsetPx, target, destination }]);
      setPendingUiCredits((current) => [...current, { id, previous }]);
    }
    collectedItemIdsRef.current.clear();
    campaignRef.current = campaign;
  }, [audio, campaign]);
  const pointerDragRef = useRef<PointerDrag | null>(null);
  const completeUiAnimation = useCallback((id: string) => {
    setUiAnimations((current) => current.filter((animation) => animation.id !== id));
    setPendingUiCredits((current) => current.filter((credit) => credit.id !== id));
  }, []);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const stairDepartureActiveRef = useRef(false);
  const heldMovements = useRef(new Map<string, { direction: Direction }>());
  const heldShift = useRef(new Set<string>());
  const mouseMovement = useRef<Movement | null>(null);
  const mouseScreenEdgeMove = useRef<{ target: Position; direction: Direction } | null>(null);
  const previousSelectedGridSpot = useRef<SelectedCell | null>(null);
  const dispatch = useCallback((action: Action) => { if (stairDepartureActiveRef.current || campfireRestTransition) return null; if (action.type === "move" && !Number.isFinite(action.hazardElapsedMs)) action = { ...action, hazardElapsedMs: performance.now() }; if (action.type === "move") { const current = sessionRef.current?.getState(); const direction = directions[action.direction as Direction]; const now = performance.now(); if (current && turnPresentation.isBumping("player", now)) return null; if (current && direction) { const [dx, dy] = direction; const target = current.floor.entities.find((entity) => entity.x === current.player.x + dx && entity.y === current.player.y + dy); if (target?.kind === "campfire") { turnPresentation.beginBump("player", current.player, { x: dx, y: dy }, now); if (campfireMenu?.x === target.x && campfireMenu.y === target.y) { setCampfireRestConfirming(true); const generation = sessionGenerationRef.current; const timer = setTimeout(() => { abilityTimers.current.delete(timer); if (generation !== sessionGenerationRef.current) return; setCampfireRestConfirming(false); setCampfireMenu(null); setCampfireRestTransition(true); }, INTERACTIVE_BUMP_APEX_MS); abilityTimers.current.add(timer); } else setCampfireMenu({ x: target.x, y: target.y }); return { accepted: false, events: [], state: current, ticks: 0 }; } if (campfireMenu) setCampfireMenu(null); if (target && (target.kind === "enemy" || target.kind === "crate" && !target.opened || target.kind === "chest" && !target.opened)) { turnPresentation.beginBump("player", current.player, { x: dx, y: dy }, now); const generation = sessionGenerationRef.current; const timer = setTimeout(() => { abilityTimers.current.delete(timer); if (generation === sessionGenerationRef.current) sessionRef.current?.dispatch(action); }, INTERACTIVE_BUMP_APEX_MS); abilityTimers.current.add(timer); return { accepted: true, events: [], state: current, ticks: 0 }; } } } if (action.type === "ability") { const current = sessionRef.current?.getState(); const id = current?.player.abilities[action.index]; if (id && (abilityCooldownsRef.current[id] ?? 0) > performance.now()) return null; const result = sessionRef.current?.dispatch(action); if (result?.accepted && id) { const generation = sessionGenerationRef.current; const cast = result.events.find((event) => event.type === "ability.used"); const origin = cast?.facts.position; if (origin) { const puff = createAbilityParticle(id, origin, cast?.facts.targetId); setParticleEffects((effects) => [...effects.filter((effect) => !particleExpired(effect)), puff]); const resolveTimer = setTimeout(() => { abilityTimers.current.delete(resolveTimer); if (sessionGenerationRef.current !== generation) return; setParticleEffects((effects) => effects.filter((effect) => effect.id !== puff.id)); sessionRef.current?.dispatch({ type: "resolve-ability", abilityId: id, targetId: cast?.facts.targetId }); }, particleDurationMs(puff)); abilityTimers.current.add(resolveTimer); } const until = performance.now() + 1000; abilityCooldownsRef.current = { ...abilityCooldownsRef.current, [id]: until }; setAbilityCooldowns(abilityCooldownsRef.current); const cooldownTimer = setTimeout(() => { abilityTimers.current.delete(cooldownTimer); if (sessionGenerationRef.current !== generation) return; const next = { ...abilityCooldownsRef.current }; delete next[id]; abilityCooldownsRef.current = next; setAbilityCooldowns(next); }, 1000); abilityTimers.current.add(cooldownTimer); } return result; } const result = sessionRef.current?.dispatch(action); if (action.type === "move" && result?.accepted) { const trap = result.state.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === result.state.player.x && decoration.y === result.state.player.y); if (trap && trapIsDangerous(trapFrameAt(action.hazardElapsedMs!))) trapStrikeRef.current = `${result.state.floor.seed}:${trap.id}:${Math.floor(action.hazardElapsedMs! / TRAP_CYCLE_MS)}`; } return result; }, [campfireMenu, campfireRestTransition, turnPresentation]);
  const completeCampfireRest = useCallback(() => { const result = sessionRef.current?.dispatch({ type: "rest" }); setCampfireRestTransition(false); return result; }, []);
  const trapStrikeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!campaign) return;
    const strikeWhenSpikesRise = () => {
      const elapsedMs = performance.now();
      const trap = campaign.floor.decorations?.find((decoration) => decoration.kind === "trap" && decoration.x === campaign.player.x && decoration.y === campaign.player.y);
      const key = trap && trapIsDangerous(trapFrameAt(elapsedMs)) ? `${campaign.floor.seed}:${trap.id}:${Math.floor(elapsedMs / TRAP_CYCLE_MS)}` : null;
      if (key === trapStrikeRef.current) return;
      trapStrikeRef.current = key;
      if (key) dispatch({ type: "trap-strike", hazardElapsedMs: elapsedMs });
    };
    strikeWhenSpikesRise();
    const timer = window.setInterval(strikeWhenSpikesRise, 25);
    return () => window.clearInterval(timer);
  }, [campaign, dispatch]);
  const completeStairDeparture = useCallback(() => { stairDepartureActiveRef.current = false; setStairDepartureStartedAt(null); dispatch({ type: "enter-stairs" }); }, [dispatch]);
  const playStairDescentStep = useCallback(() => { audio.playCue("footstep", performance.now()); }, [audio]);
  const stairArrivalCampaignRef = useRef<Campaign | null>(null);
  useEffect(() => {
    const previous = stairArrivalCampaignRef.current;
    stairArrivalCampaignRef.current = campaign;
    if (!previous || previous.floor.seed !== campaign?.floor.seed || (previous.player.x === campaign?.player.x && previous.player.y === campaign?.player.y)) return;
    const stair = campaign?.floor.entities.find((entity) => entity.kind === "stairs" && entity.x === campaign.player.x && entity.y === campaign.player.y);
    if (stair) { stairDepartureActiveRef.current = true; setStairDepartureStartedAt(performance.now()); }
  }, [campaign]);
  const activeMovement = useRef<Movement | null>(null);
  const selectedMousePath = getMousePathFromSelectedCell(selectedGridSpot, campaign);
  const selectedCellReachable = selectedGridSpot ? selectedMousePath !== null : null;
  const returnToMainMenu = useCallback(() => {
    if (moveTimer.current) { clearTimeout(moveTimer.current); clearInterval(moveTimer.current); moveTimer.current = null; }
    heldMovements.current.clear(); heldShift.current.clear(); mouseMovement.current = null; activeMovement.current = null;
    pointerDragRef.current = null; sessionGenerationRef.current++; sessionRef.current = null;
    gainTimers.current.forEach(clearTimeout); gainTimers.current.clear(); abilityTimers.current.forEach(clearTimeout); abilityTimers.current.clear(); abilityCooldownsRef.current = {}; setAbilityCooldowns({}); setGains({});
    floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear(); setFloatingFeedback([]); setResourceChangeEffects([]); setParticleEffects([]); setItemThrows([]); setUiAnimations([]); setPendingUiCredits([]);
    setSelectedGridSpot(null); setCampfireMenu(null); setPreview(null); setDragPresentation(null); setHowToPlay(false); setSettings(false); setMenuExiting(false); setWorldAlive(false); setCampaign(null); setSlot(null);
  }, []);
  const saveAndQuit = useCallback(() => {
    if (!campaign || !slot) return;
    try {
      writeSlot(localStorage, slot, campaign);
      setSummaries(readSlotSummary(localStorage));
      setSaveError("");
      returnToMainMenu();
    } catch {
      setSaveError("Saving is unavailable in this browser session.");
    }
  }, [campaign, returnToMainMenu, slot]);
  useEffect(() => {
    const saveAndQuitWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat || settings || !campaign || !slot) return;
      event.preventDefault();
      saveAndQuit();
    };
    window.addEventListener("keydown", saveAndQuitWithEscape);
    return () => window.removeEventListener("keydown", saveAndQuitWithEscape);
  }, [campaign, saveAndQuit, settings, slot]);
  const syncMovement = useCallback((immediate = true, continuing = false) => {
    if (!worldAlive) return;
    const keyboard = getLatestMovement(heldMovements.current, heldShift.current.size > 0);
    const next = keyboard ?? mouseMovement.current;
    const previous = activeMovement.current;
    const source = keyboard ? "keyboard" : "pointer";
    if (previous?.direction === next?.direction && previous?.sprint === next?.sprint && previous?.source === source) return;
    activeMovement.current = next ? { ...next, source } : null;
    if (moveTimer.current) { clearTimeout(moveTimer.current); clearInterval(moveTimer.current); moveTimer.current = null; }
    if (!next) return;
    const move = () => {
      const before = sessionRef.current?.getState().player;
      const result = dispatch({ type: "move", direction: next.direction, hazardElapsedMs: performance.now() });
      const after = result && "state" in result ? result.state.player : null;
      if (source === "pointer" && before && after && (before.x !== after.x || before.y !== after.y)) mouseScreenEdgeMove.current = { target: { x: after.x, y: after.y }, direction: next.direction as Direction };
      else if (source === "keyboard") mouseScreenEdgeMove.current = null;
      return result;
    };
    if (immediate && (previous?.direction !== next.direction || (!previous?.sprint && next.sprint))) move();
    const repeat = move;
    const scheduleRepeat = (delay: number) => { moveTimer.current = setTimeout(() => {
      repeat();
      if (activeMovement.current?.source === source && activeMovement.current.direction === next.direction && activeMovement.current.sprint === next.sprint) scheduleRepeat(getMoveRepeatDelay(next.sprint));
    }, delay); };
    scheduleRepeat(getMoveScheduleDelay(next.sprint, continuing));
  }, [dispatch, worldAlive]);
  useEffect(() => {
    mouseMovement.current = getMouseMovementFromSelectedCell(selectedGridSpot, campaign, selectedMousePath);
    const selectionChanged = previousSelectedGridSpot.current !== selectedGridSpot;
    previousSelectedGridSpot.current = selectedGridSpot;
    syncMovement(selectionChanged);
  }, [campaign, selectedGridSpot, syncMovement]);
  const advanceMouseScreenEdge = useCallback((direction: Direction) => { mouseScreenEdgeMove.current = null; return Boolean(dispatch({ type: "move", direction, hazardElapsedMs: performance.now() })?.accepted); }, [dispatch]);
  const setPreference = useCallback((change: Partial<Preferences>) => { setPreferences((current) => { const next = { ...current, ...change }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, []);
  const stepZoom = useCallback((step: number) => { setPreferences((current) => { const index = gameZoomPresets.indexOf(current.zoom); const zoom = gameZoomPresets[Math.max(0, Math.min(gameZoomPresets.length - 1, index + step))]; const next = { ...current, zoom }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, []);
  const toggleFullscreen = useCallback(async () => { const desired = !document.fullscreenElement; setPreference({ fullscreenDesired: desired }); try { if (desired) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* browser gesture policy */ } }, [setPreference]);
  const clearLocalStorage = useCallback(() => {
    try { clearRoguesDungeonStorage(localStorage); } catch { setSaveError("Local storage could not be cleared in this browser session."); return; }
    window.location.reload();
  }, []);
  useEffect(() => { const sync = () => { const actual = Boolean(document.fullscreenElement); if (fullscreenStateRef.current && !actual) setPreference({ fullscreenDesired: false }); fullscreenStateRef.current = actual; setFullscreenActual(actual); }; document.addEventListener("fullscreenchange", sync); sync(); return () => document.removeEventListener("fullscreenchange", sync); }, [setPreference]);
  const cancelPointerDrag = useCallback(() => { pointerDragRef.current = null; setPreview(null); setDragPresentation(null); }, []);
  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const handle = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-drag-kind]") : null;
    if (!campaign || !handle || event.button !== 0) return;
    const kind = handle.dataset.dragKind; const id = handle.dataset.dragId; const index = Number(handle.dataset.dragIndex);
    const item = kind === "ability" ? { abilityId: campaign.player.abilities[index] } : kind === "quick-slot" ? campaign.player.quickSlots?.[index]?.item : campaign.player.inventory.find((entry) => entry.id === id) ?? [...campaign.player.equipment.weapons, ...campaign.player.equipment.armor].find((entry) => entry?.id === id);
    if (!item) return;
    const source = (kind === "inventory" ? { kind, item } : kind === "quick-slot" ? { kind, item, index } : { kind, item, group: handle.dataset.dragGroup, index }) as PointerSource;
    handle.setPointerCapture?.(event.pointerId);
    pointerDragRef.current = { pointerId: event.pointerId, source, startX: event.clientX, startY: event.clientY, active: false };
    event.preventDefault();
  }, [campaign]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = pointerDragRef.current; if (!campaign || !current || event.pointerId !== current.pointerId) return;
      if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
      current.active = true;
      const target = document.elementFromPoint(event.clientX, event.clientY); const drop = itemDropTarget(target, campaign); const transfer = drop && current.source.kind !== "ability" && describeInventoryDrop(campaign, current.source, drop.destination, drop.targetItem);
      if (current.source.kind === "inventory" || current.source.kind === "slot") setPreview((transfer || null)?.preview ?? null); else setPreview(null);
      setDragPresentation({ source: current.source, item: current.source.item, x: event.clientX, y: event.clientY, destination: (transfer || null)?.destination ?? null });
    };
    const finish = (event: PointerEvent) => {
      const current = pointerDragRef.current; if (!campaign || !current || event.pointerId !== current.pointerId) return;
      if (current.active && event.type === "pointerup") {
        const target = document.elementFromPoint(event.clientX, event.clientY); const drop = itemDropTarget(target, campaign); const transfer = drop && current.source.kind !== "ability" && describeInventoryDrop(campaign, current.source, drop.destination, drop.targetItem);
        const ability = target?.closest<HTMLElement>("[data-drop-ability]"); let action = (transfer || null)?.action ?? null;
        if (!action && ability && current.source.kind === "ability") { const to = Number(ability.dataset.dropAbility); if (current.source.index !== to) action = { type: "assign-ability", from: current.source.index, to }; }
        if (action) { const result = dispatch(action); audio.playDropResult(Boolean(result?.accepted)); }
        else if (drop?.destination.kind === "slot") audio.playDropResult(false);
      }
      cancelPointerDrag();
    };
    const pointerCancel = () => cancelPointerDrag(); const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") cancelPointerDrag(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", pointerCancel); window.addEventListener("keydown", cancel);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", pointerCancel); window.removeEventListener("keydown", cancel); };
  }, [audio, campaign, cancelPointerDrag, dispatch]);
  useEffect(() => {
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [contenteditable='true']"));
    const clearHeldInput = () => { heldMovements.current.clear(); heldShift.current.clear(); syncMovement(); };
    const down = (event: KeyboardEvent) => {
      if (!worldAlive || settings || progressionOpen || editable(event.target)) return;
      const movement = getMovementKey(event);
      if (movement) { event.preventDefault(); if (!heldMovements.current.has(movement.code)) { heldMovements.current.set(movement.code, movement); syncMovement(); } return; }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") { event.preventDefault(); const oldSprint = heldShift.current.size > 0; heldShift.current.add(event.code); if (!oldSprint) syncMovement(true, true); return; }
      if (!event.repeat && event.code === "KeyT") { event.preventDefault(); setDungeonTheme((theme) => theme === 1 ? 2 : 1); return; }
      if (!event.repeat && /^Digit[1-3]$/.test(event.code || "")) { event.preventDefault(); dispatch({ type: "ability", index: Number(event.code.slice(-1)) - 1 }); }
      else if (!event.repeat && /^[1-3]$/.test(event.key)) { event.preventDefault(); dispatch({ type: "ability", index: Number(event.key) - 1 }); }
      else if (!event.repeat && /^[QE]$/i.test(event.key)) { event.preventDefault(); dispatch({ type: "use-quick-slot", index: event.key.toUpperCase() === "Q" ? 0 : 1 }); }
      else if (!event.repeat && /^[X]$/i.test(event.key)) { event.preventDefault(); dispatch({ type: "wait" }); }
    };
    const up = (event: KeyboardEvent) => {
      if (getMovementKey(event)) { const { code } = getMovementKey(event)!; if (heldMovements.current.delete(code)) syncMovement(); }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") { const oldSprint = heldShift.current.size > 0; heldShift.current.delete(event.code); if (oldSprint !== (heldShift.current.size > 0)) syncMovement(false); }
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clearHeldInput);
    if (settings) clearHeldInput();
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clearHeldInput); };
  }, [campaign, dispatch, progressionOpen, settings, syncMovement, worldAlive]);
  const begin = (id: string, repairedFloor: Floor | null = null, attributes?: Attributes, starterEquipment = false) => {
    const unsavedUrlRun = urlOptions.hasCompleteRunIdentity;
    const targetSlot = unsavedUrlRun ? urlOptions.slot! : id;
    let existing: Campaign | null = null;
    try { if (!unsavedUrlRun) existing = readSlot(localStorage, targetSlot); }
    catch { setSaveError("This saved game is unavailable. Its data was left unchanged."); setSummaries(readSlotSummary(localStorage)); return; }
    floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear();
    resourceChangeEffectTimers.current.forEach(clearTimeout); resourceChangeEffectTimers.current.clear();
    setFloatingFeedback([]); setResourceChangeEffects([]); setParticleEffects([]); setItemThrows([]); setSelectedGridSpot(null);
    if (preferences.fullscreenDesired && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    const worldSeed = unsavedUrlRun ? urlOptions.seed! : randomSeed ?? readWorldSeed(localStorage);
    const freshTestCampaign = createRunCampaign(worldSeed, Number(targetSlot), urlOptions.run, urlOptions.level, urlOptions.level, { level1TestMode: urlOptions.level1TestMode, attributes, starterEquipment });
    const initial = unsavedUrlRun || urlOptions.level1TestMode ? freshTestCampaign : existing ?? freshTestCampaign;
    if (!existing || unsavedUrlRun || urlOptions.level1TestMode) initial.world = urlOptions.world === 1 ? "One" : String(urlOptions.world);
    const scenario = urlOptions.mapFix ? getManualTileScenario(urlOptions.scenario) : null;
    const manualFloor = scenario ? buildManualTileScenario(scenario.name, randomSeed ?? 13579, urlOptions.level) : null;
    if (manualFloor && !repairedFloor) {
      initial.floor = structuredClone(manualFloor); initial.player.x = manualFloor.start.x; initial.player.y = manualFloor.start.y; initial.realm = `Debug ${manualFloor.scenario}`;
    }
    if (repairedFloor) {
      initial.floor = structuredClone(repairedFloor); initial.player.x = repairedFloor.start.x; initial.player.y = repairedFloor.start.y; initial.realm = `Underground ${repairedFloor.level}`;
    }
    if (!unsavedUrlRun && !existing) {
      try { writeSlot(localStorage, targetSlot, initial); setSummaries(readSlotSummary(localStorage)); }
      catch { setSaveError("Saving is unavailable in this browser session."); return; }
    }
    const session = createGameSession(initial, {
      onCommit: (result) => {
        try { if (!unsavedUrlRun) { writeSlot(localStorage, targetSlot, result.state); setSummaries(readSlotSummary(localStorage)); } setSaveError(""); }
        catch (error) { setSaveError("Saving is unavailable in this browser session."); session.publish("campaign.save.failed", { message: error instanceof Error ? error.message : String(error) }); }
      },
    });
    session.subscribe((result) => {
      if (!result.accepted && !result.system && !result.events.some((event) => event.type === "quick-slot.use.rejected")) return;
      audio.playEvents(result.events);
      const openedContainer = result.events.find((event) => (event.type === "chest.opened" || event.type === "crate.opened") && typeof event.facts.id === "string" && event.facts.position && typeof event.facts.position === "object")?.facts;
      if (openedContainer?.id && openedContainer.position && typeof openedContainer.position === "object") {
        const origin = openedContainer.position as { x: number; y: number };
        const items = result.state.floor.entities
          .filter((entity) => entity.kind === "gold" && (entity.id.startsWith(`chest-gold-${openedContainer.id}-`) || entity.id.startsWith(`crate-gold-${openedContainer.id}-`)))
          .map((coin) => ({ id: coin.id, kind: "gold" as const, destination: { x: coin.x, y: coin.y } }));
        setItemThrows(throwItems(origin, items));
        const timer = setTimeout(() => setItemThrows([]), ITEM_THROW_DURATION_MS);
        abilityTimers.current.add(timer);
      }
      const playerTookDamage = result.events.some((event) => event.type === "resource.changed" && event.facts.resource === "health" && event.facts.current! < event.facts.previous!);
      if (playerTookDamage) turnPresentation.beginDamageReaction("player", performance.now());
      if (result.events.some((event) => event.type === "resource.changed" && event.facts.resource === "health" && event.facts.cause === "enemy-attack" && event.facts.current! < event.facts.previous!)) setCameraAnimationToken((token) => token + 1);
      for (const event of result.events) if (event.type === "item.collected" && typeof event.facts.itemId === "string") collectedItemIdsRef.current.add(event.facts.itemId);
      const moved = result.events.find((event) => event.type === "player.moved" && typeof event.facts.from === "object" && event.facts.from !== null);
      if (moved) {
        const puff = createSmokePuff(moved.facts.from as { x: number; y: number });
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), puff]);
        setTimeout(() => setParticleEffects((current) => current.filter((effect) => effect.id !== puff.id)), smokePuffDurationMs);
      }
      const damageParticles = projectDamageParticles(result.events);
      if (damageParticles.length) {
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), ...damageParticles]);
        const timer = setTimeout(() => {
          abilityTimers.current.delete(timer);
          const ids = new Set(damageParticles.map((effect) => effect.id));
          setParticleEffects((current) => current.filter((effect) => !ids.has(effect.id)));
        }, particleDurationMs(damageParticles[0]!));
        abilityTimers.current.add(timer);
      }
      const levelsGained = result.events.filter((event) => event.type === "xp.level.changed").length;
      if (levelsGained) {
        const origin = result.state.player;
        const sparkles = createLevelUpSparkles(origin, levelsGained);
        setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), ...sparkles]);
        const timer = setTimeout(() => { abilityTimers.current.delete(timer); const ids = new Set(sparkles.map((effect) => effect.id)); setParticleEffects((current) => current.filter((effect) => !ids.has(effect.id))); }, Math.max(...sparkles.map((effect) => effect.startedAt + particleDurationMs(effect))) - performance.now());
        abilityTimers.current.add(timer);
      }
      result.state.log = projectLogEvents(result.state.log, result.events);
      const feedback = projectFloatingFeedback(result.events);
      if (feedback.length) {
        setFloatingFeedback((current) => [...current, ...feedback].slice(-24));
        for (const effect of feedback) {
          const timer = setTimeout(() => { setFloatingFeedback((current) => removeFloatingFeedback(current, effect.id)); floatingTimers.current.delete(effect.id); }, effect.duration);
          floatingTimers.current.set(effect.id, timer);
        }
      }
      const resourceEffects = projectResourceChangeEffects(result.events);
      if (resourceEffects.length) {
        setResourceChangeEffects((current) => [...current, ...resourceEffects]);
        for (const effect of resourceEffects) {
          clearTimeout(resourceChangeEffectTimers.current.get(effect.id));
          const timer = setTimeout(() => { setResourceChangeEffects((current) => removeResourceChangeEffect(current, effect.id)); resourceChangeEffectTimers.current.delete(effect.id); }, effect.duration);
          resourceChangeEffectTimers.current.set(effect.id, timer);
        }
      }
      for (const event of result.events) {
        const facts = event.facts;
        if ((event.type === "resource.changed" && facts.current! > facts.previous!) || (event.type === "xp.gained" && facts.current! > facts.previous!)) {
          const name = event.type === "xp.gained" ? "xp" : facts.resource!;
          setGains((current) => ({ ...current, [name]: { from: facts.previous!, to: facts.current!, max: facts.currentMax ?? (name === "xp" ? undefined : initial.progression.attributes[name]) ?? 100 } }));
          clearTimeout(gainTimers.current.get(name));
          gainTimers.current.set(name, setTimeout(() => setGains((current) => { const next = { ...current }; delete next[name]; return next; }), 420));
        }
      }
      if (result.events.some((event) => event.type === "player.died")) { returnToMainMenu(); return; }
      setCampaign(result.state);
    });
    sessionRef.current = session; setSlot(targetSlot); setCampaign(initial);
  };
  useEffect(() => { if (urlOptions.hasCompleteRunIdentity && !urlRunStarted.current && !campaign && !slot) { urlRunStarted.current = true; begin(urlOptions.slot!); } }, [campaign, slot, urlOptions]);
  const beginFromMenu = (id: string, origin?: Element | null) => {
    if (menuExiting) return;
    const entry = summaries.find((summary) => summary.slot === id);
    if (!entry?.occupied) { creationBoundsRef.current = origin ? dialogBounds(origin.closest(".main-menu-window")!) : null; setCreationSlot(id); setCreationAttributes(null); return; }
    setMenuExiting(true);
    window.setTimeout(() => begin(id), 125);
  };
  const [mapFixError, setMapFixError] = useState("");
  const importRepairMap = async (file?: File) => {
    if (!file || !campaign || !urlOptions.mapFix) return;
    try { const repaired = floorFromTiledRepairMap(JSON.parse(await file.text()), campaign.floor); begin(slot ?? urlOptions.slot ?? "1", repaired); setMapFixError(""); }
    catch (error) { setMapFixError(error instanceof Error ? error.message : String(error)); }
  };
  const directSlotStarted = useRef(false);
  useEffect(() => { if (!urlOptions.slot || directSlotStarted.current) return; directSlotStarted.current = true; begin(urlOptions.slot); }, [urlOptions.slot]);
  const urlRepairLoaded = useRef(false);
  useEffect(() => {
    if (!urlOptions.mapFix || !urlOptions.map || !campaign || urlRepairLoaded.current) return;
    urlRepairLoaded.current = true;
    fetch(urlOptions.map).then((response) => { if (!response.ok) throw new Error(`Could not load repaired map (${response.status}).`); return response.json(); }).then((map) => {
      const repaired = floorFromTiledRepairMap(map, campaign.floor); begin(slot ?? urlOptions.slot ?? "1", repaired); setMapFixError("");
    }).catch((error) => setMapFixError(error.message));
  }, [campaign, slot, urlOptions.map, urlOptions.mapFix, urlOptions.slot]);
  const newGameLabel = randomSeed === null ? "New Game" : `New Game · Seed ${randomSeed}`;
  const measureGameSettingsCenter = useCallback(() => {
    const view = document.querySelector(".world-view-region");
    if (!view) return null;
    const bounds = dialogBounds(view);
    return { left: bounds.left + bounds.width / 2, top: bounds.top + bounds.height / 2 };
  }, []);
  const openGameSettings = useCallback(() => { setGameSettingsCenter(measureGameSettingsCenter()); setSettings(true); }, [measureGameSettingsCenter]);
  useEffect(() => {
    if (!campaign || (!settings && !progressionOpen)) return undefined;
    const sync = () => setGameSettingsCenter(measureGameSettingsCenter());
    const view = document.querySelector(".world-view-region");
    const observer = view ? new ResizeObserver(sync) : null;
    observer?.observe(view!);
    const keydown = (event: KeyboardEvent) => { if (event.key.toLowerCase() === "c") requestAnimationFrame(sync); };
    window.addEventListener("resize", sync); document.addEventListener("fullscreenchange", sync); window.addEventListener("keydown", keydown);
    sync();
    return () => { observer?.disconnect(); window.removeEventListener("resize", sync); document.removeEventListener("fullscreenchange", sync); window.removeEventListener("keydown", keydown); };
  }, [campaign, measureGameSettingsCenter, progressionOpen, settings]);
  const uiCampaign = useMemo(() => pendingUiCredits[0]?.previous ?? campaign, [campaign, pendingUiCredits]);
  if (!campaign) return <><MenuScreen><img className="menu-screen__logo" src={`${import.meta.env.BASE_URL}assets/art/menu/rogues-dungeon-logo.png`} alt="Rogue's Dungeon" /><MainMenuWindow exiting={menuExiting} footer={<><Tooltip content="Open game settings."><button tabIndex={-1} className="main-menu-window__settings" type="button" onClick={(event) => { settingsBoundsRef.current = dialogBounds(event.currentTarget.closest(".main-menu-window")!); setSettings(true); }}>Settings</button></Tooltip><Tooltip content="Toggle Fullscreen"><button tabIndex={-1} className="main-menu-window__fullscreen" type="button" aria-label="Toggle Fullscreen" aria-pressed={fullscreenActual} onClick={toggleFullscreen}><span className="title-bar__icon title-bar__icon--fullscreen" aria-hidden="true">⛶</span></button></Tooltip></>}><h1 className="visually-hidden">Rogue's Dungeon</h1><h2 id="main-menu-window__heading">Start Game</h2><p className="body_text main-menu-window__intro">Choose a save slot.<br />Progress saves automatically.</p><div className="main-menu-window__saved-game-list" aria-labelledby="main-menu-window__heading">{summaries.map((entry) => <Tooltip key={entry.slot} content={entry.invalid ? `Saved Game ${entry.slot} is unavailable.` : entry.occupied ? `Continue Saved Game ${entry.slot}.` : `Start a new game in Saved Game ${entry.slot}.`}><button tabIndex={-1} disabled={entry.invalid} onClick={(event) => beginFromMenu(entry.slot, event.currentTarget)}><b>Saved Game {entry.slot}</b><span>{entry.invalid ? "Unavailable" : entry.occupied ? "Level " + String(entry.level).padStart(2, "0") + " · XP " + String(entry.xpLevel).padStart(2, "0") + " · " + formatSavedAgo(entry.savedAt, summaryNow) : newGameLabel}</span></button></Tooltip>)}</div>{saveError && <p role="alert">{saveError}</p>}</MainMenuWindow></MenuScreen>{creationSlot && <CreateCharacterWindow attributes={creationAttributes} bounds={creationBoundsRef.current} onRoll={() => setCreationAttributes(rollStartingAttributes())} onClose={() => { setCreationSlot(null); setCreationAttributes(null); }} onConfirm={() => { if (!creationAttributes) return; const id = creationSlot; setCreationSlot(null); setMenuExiting(true); window.setTimeout(() => begin(id, null, creationAttributes, true), 125); }} />}{settings && <SettingsWindow origin="menu" bounds={settingsBoundsRef.current} onClose={() => setSettings(false)} onOpenHowToPlay={(bounds) => { helpBoundsRef.current = bounds; setHowToPlay(true); }} helpOpen={howToPlay} onSaveAndQuit={() => setSettings(false)} onClearLocalStorage={clearLocalStorage} onFullscreen={toggleFullscreen} fullscreenActual={fullscreenActual} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}{howToPlay && <HowToPlayWindow origin="menu" bounds={helpBoundsRef.current} onClose={() => setHowToPlay(false)} />}</>;
  const activeUiCampaign = uiCampaign ?? campaign;
  return <GameScreen orientation={orientation} onPointerDown={handlePointerDown}>
    <TitleBar campaign={campaign} visibleCounters={pendingUiCredits[0]?.previous.counters} preferences={preferences} setPreference={setPreference} onFullscreen={toggleFullscreen} onSettings={openGameSettings} fullscreenActual={fullscreenActual} />
    {urlOptions.mapFix && <MapFixControls campaign={campaign} slot={slot} onImport={importRepairMap} error={mapFixError} />}
    {canOverride && mapTest && <MapTestControls campaign={campaign} />}
    <section className="game-screen__middle" data-primary-open={primaryInfoOpen} data-secondary-open={secondaryInfoOpen}><WorldViewRegion primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen}><BabylonWorld campaign={campaign} theme={dungeonTheme} zoom={preferences.zoom} camera={preferences.camera} cameraAnimationToken={cameraAnimationToken} stairDepartureStartedAt={stairDepartureStartedAt} mouseInteraction mouseScreenEdgeTarget={mouseScreenEdgeMove.current?.target ?? null} mouseDirection={mouseScreenEdgeMove.current?.direction ?? null} showPivotPoints={showPivotPoints} floatingFeedback={floatingFeedback} resourceChangeEffects={resourceChangeEffects} particleEffects={particleEffects} itemThrows={itemThrows} uiAnimations={uiAnimations} selectedCell={selectedGridSpot} selectedCellReachable={selectedCellReachable} campfireMenu={campfireMenu} campfireRestConfirming={campfireRestConfirming} campfireRestTransition={campfireRestTransition} turnPresentation={turnPresentation} onCampfireRestClosed={completeCampfireRest} onSelectedCellChange={setSelectedGridSpot} onMouseScreenEdgeAdvance={advanceMouseScreenEdge} onWorldAliveChange={setWorldAlive} onStairDepartureComplete={completeStairDeparture} onStairDescentStep={playStairDescentStep} onWallAdjacentBarrelOffscreen={(setId) => Boolean(dispatch({ type: "return-barrel", setId })?.accepted)} onUiAnimationComplete={completeUiAnimation} onFpsChange={canOverride ? setFps : undefined} onZoom={stepZoom} /></WorldViewRegion><InformationPanels campaign={activeUiCampaign} theme={dungeonTheme} dispatch={dispatch} drag={dragPresentation} preview={preview} gains={gains} cooldowns={abilityCooldowns} primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen} turnPresentation={turnPresentation} onTogglePrimary={() => setPrimaryInfoOpen((value) => !value)} onToggleSecondary={() => setSecondaryInfoOpen((value) => !value)} onOpenProgression={() => { setGameSettingsCenter(measureGameSettingsCenter()); setProgressionOpen(true); }} /></section>
<StatusControls campaign={campaign} canOverride={canOverride} orientation={orientation} setDeveloperAspect={setDeveloperAspect} onTogglePanels={togglePanels} fps={fps} drag={dragPresentation} urlArgs={preferences.urlArgs} setUrlArgs={(urlArgs) => setPreference({ urlArgs })} mapTest={mapTest} setMapTest={setMapTest} mobilePanel={mobilePanel} setMobilePanel={setMobilePanel} onWait={() => dispatch({ type: "wait" })} />
<section className="mobile_bottom"><MobileControls campaign={campaign} dispatch={dispatch} hidden={mobilePanel !== "controls"} /><MobileInformationPanels campaign={activeUiCampaign} theme={dungeonTheme} dispatch={dispatch} drag={dragPresentation} preview={preview} gains={gains} cooldowns={abilityCooldowns} hidden={mobilePanel !== "info"} onOpenProgression={() => { setGameSettingsCenter(measureGameSettingsCenter()); setProgressionOpen(true); }} turnPresentation={turnPresentation} /></section>
    <ItemDragPreview campaign={campaign} drag={dragPresentation} />
    {canOverride && orientation === "portrait" && <button tabIndex={-1} className="dev_aspect_return" onClick={() => setDeveloperAspect("landscape")}>Dev: Return to Landscape</button>}
    {saveError && <div className="save_error">{saveError}</div>}
    {progressionOpen && <ProgressionWindow campaign={campaign} center={gameSettingsCenter} onClose={() => setProgressionOpen(false)} onConfirm={(allocation) => { if (dispatch({ type: "spend-attribute-points", allocation })) setProgressionOpen(false); }} />}
    {settings && <SettingsWindow origin="game" center={gameSettingsCenter} onClose={() => setSettings(false)} onOpenHowToPlay={(bounds) => { helpBoundsRef.current = bounds; setHowToPlay(true); }} helpOpen={howToPlay} onSaveAndQuit={saveAndQuit} onClearLocalStorage={clearLocalStorage} onFullscreen={toggleFullscreen} fullscreenActual={fullscreenActual} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}
    {howToPlay && <HowToPlayWindow origin="game" bounds={helpBoundsRef.current} onClose={() => setHowToPlay(false)} />}
  </GameScreen>;
}
