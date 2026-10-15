import type { PointerEvent as ReactPointerEvent, SyntheticEvent, PointerEventHandler, ReactNode } from "react";
import type { Orientation } from "../ui/layout.ts";
import type { AbilityId, Action, Attributes, AttributeName, Campaign, Direction, DragSource, DropDestination, EquipmentGroup, Feedback, Floor, Item, Preferences, QuickSlot, Resource, ResourceName, SelectedCell } from "./types.ts";
type Ability = typeof abilityCatalog[AbilityId];
interface Gain { from: number; to: number; max: number }
type Gains = Partial<Record<ResourceName, Gain>>;
interface WithDispatch { campaign: Campaign; dispatch(action: Action): unknown }
interface PreferenceProps { preferences: Preferences; setPreference(value: Partial<Preferences>): void }
type PointerSource = DragSource | { kind: "ability"; item: { abilityId: AbilityId | null }; index: number };
interface DragPresentation { source: PointerSource; item: PointerSource["item"]; x: number; y: number; destination: DropDestination | null }
interface PointerDrag { pointerId: number; source: PointerSource; startX: number; startY: number; active: boolean }
interface Movement { direction: string; sprint: boolean; source?: string }
interface SlotItemProps { type?: string; slotType?: "ability" | "quickslot" | "equipment" | "inventory"; slotSubtype?: EquipmentGroup; number?: number; hotkey?: string; text?: string; icon?: string; cost?: string | number; accentColor?: string; disabled?: boolean; unavailable?: boolean; onClick?: () => void; onDoubleClick?: () => void; className?: string; dragSource?: Record<string, string | number>; dropTarget?: Record<string, string | number | boolean>; empty?: boolean; tooltip?: string }
interface InventoryStack { item: Item; quantity: number }
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { abilityCatalog, attributeLabels, createCampaign, createGameSession, directions, effectiveAttributes, isQuickSlottableItem, resourceState } from "../systems/procedural/world-procedural-system.ts";
import { isWalkable } from "../systems/procedural/level-grid-system.ts";
import { describeInventoryDrop } from "./inventory-drag.ts";
import { gameZoomPresets } from "../content/world/zoom.ts";
import { projectLogEvents } from "./log-policy.ts";
import { createAudioManager } from "../systems/audio/audio-system.ts";
import { createSmokePuff, particleExpired, smokePuffDurationMs, type ParticleEffect } from "../systems/animation/particle-effects-system.ts";
import { parseGameUrlOptions } from "./url-options.ts";
import { floorFromTiledRepairMap, serializeFloorToTiled } from "../systems/rendering/tile-map-system.ts";
import { buildManualTileScenario, getManualTileScenario } from "../systems/procedural/manual-tile-scenarios.ts";
import { createStoredZip } from "./zip.ts";
import { projectFloatingFeedback, removeFloatingFeedback } from "./floating-feedback.ts";
import { getLatestMovement, getMovementKey, getMoveRepeatDelay, getMoveScheduleDelay } from "./keyboard-input.ts";
import { ControlsArea } from "../ui/ControlsArea.tsx";
import { TabControl } from "../ui/TabControl.tsx";
import { useUiMotion, type UiMotionStyle } from "../ui/ui-transition-system.tsx";
import { getMouseMovementFromSelectedCell, getMousePathFromSelectedCell } from "./mouse-selection.ts";
import { clearRoguesDungeonStorage, readPreferences, readSlot, readSlotSummary, writePreferences, writeSlot } from "../systems/persistence/save-system.ts";
import { BabylonWorld, type GameViewToUiAnimation } from "../systems/rendering/babylon-render-system.tsx";
import { Dialog } from "../ui/Dialog.tsx";
import { ScrollArea } from "../ui/ScrollArea.tsx";
import { Tooltip } from "../ui/Tooltip.tsx";
import { LayoutContext } from "../ui/layout-context.ts";
import versionText from "../../../version.txt?raw";

const icons: Partial<Record<string, string>> = { health: "♥", stamina: "◈", offense: "⚔", defense: "⛨", mana: "✦", xp: "★" };
const cameraHelp = { center: "Center: Keeps the player centered.", deadzone: "Deadzone: Follows near view edges.", screen: "Screen: Follows across screen zones." };
const cardHelp: Partial<Record<string, string>> = { Minimap: "Shows explored map and your position.", Quest: "Your current objective.", Log: "Recent dungeon and combat events.", Resources: "Tracks Health, Stamina, Mana, and XP.", Attributes: "Character stats and current values.", Abilities: "Assigned abilities; each costs Mana.", Equipment: "Equipped items change your attributes.", Inventory: "Carried items; double-click to equip." };
const resourceHelp: Record<ResourceName, string> = { health: "Health remaining; potions restore it.", stamina: "Low Stamina lowers damage.", offense: "Attack power after Stamina readiness.", defense: "Defense reduces incoming damage.", mana: "Mana is spent on abilities.", xp: "Experience toward next level." };
const attributeHelp: Record<AttributeName, string> = { health: "Maximum Health; zero ends the run.", stamina: "Low Stamina lowers damage.", offense: resourceHelp.offense, defense: resourceHelp.defense, mana: "Maximum Mana for abilities.", vitality: "Adds maximum Health.", strength: "Adds weapon Offense.", luck: "Improves loot quality.", recovery: "Adds Stamina restored per move.", stealth: "Reduces enemy detection range." };
function Card({ title, children, className = "", showTab = false, tabOffsetY = "0px", tabExpanded, onTabClick, tabAriaLabel, contentHidden = false }: { title: string; children: ReactNode; className?: string; showTab?: boolean; tabOffsetY?: string; tabExpanded?: boolean; onTabClick?: () => void; tabAriaLabel?: string; contentHidden?: boolean }) { const key = title.startsWith("Inventory") ? "Inventory" : title; return <section className={"desk_card " + className}>{showTab && onTabClick && <div className="tab-control-placement" style={{ top: tabOffsetY }}><TabControl ariaLabel={tabAriaLabel} expanded={tabExpanded} onClick={onTabClick} /></div>}<div aria-hidden={contentHidden || undefined}><h2><Tooltip content={cardHelp[key] ?? title}><button tabIndex={-1} type="button" className="card_title_trigger">{title}</button></Tooltip></h2>{children}</div></section>; }
function ResourceBar({ name, value, gain }: { name: ResourceName; value: Resource; gain?: Gain }) { const fill = Math.max(0, Math.min(100, value.current ?? 0)); const cap = Math.max(0, Math.min(100, value.currentMax ?? 100)); const gainStart = gain ? Math.min(cap, Math.max(0, gain.from / value.currentMax * 100)) : 0; const gainEnd = gain ? Math.min(cap, Math.max(0, gain.to / value.currentMax * 100)) : 0; return <div className={"resource resource_" + name} aria-label={name + ": " + value.current + " of " + value.currentMax}><span>{icons[name]}</span><div className="resource_track"><i style={{ width: Math.min(cap, fill) + "%" }} />{gain && <strong className="resource_gain" style={{ left: gainStart + "%", width: Math.max(0, gainEnd - gainStart) + "%" }} />}<b style={{ left: cap + "%" }} />{name === "xp" && <em>{String(value.level).padStart(2, "0")}</em>}</div></div>; }
export function ResourceList({ campaign, gains = {} }: { campaign: Campaign; gains?: Gains }) { const resources = resourceState(campaign); return <div className="resource_list">{(["health", "stamina", "offense", "defense", "mana", "xp"] as const).map((name) => <Tooltip key={name} content={resourceHelp[name]}><button tabIndex={-1} type="button" className="resource_tooltip_trigger" aria-label={`${name}: ${resources[name].current} of ${resources[name].currentMax}`}><ResourceBar name={name} value={resources[name]} gain={gains[name]} /></button></Tooltip>)}</div>; }
/** Renders an attribute number that pulses only when its color changes to a delta. */
export function DeltaValue({ value, tone = "" }: { value: number; tone?: string }) {
  const previousTone = useRef(tone);
  const [pulseVersion, setPulseVersion] = useState(0);
  useEffect(() => {
    const toneChanged = previousTone.current !== tone;
    previousTone.current = tone;
    if (toneChanged && tone) setPulseVersion((version) => version + 1);
  }, [tone]);
  return <span className="delta_value"><b key={pulseVersion} className={["delta_value_number", tone && `delta_value_${tone}`, pulseVersion > 0 && "delta_value_pulse"].filter(Boolean).join(" ")}>{value}</b></span>;
}
export function AttributeViewItem({ name, value, baseline }: { name: AttributeName; value: number; baseline: number }) { const tone = value === baseline ? "" : value > baseline ? "green" : "red"; return <div className="attribute_item"><Tooltip content={attributeHelp[name] ?? attributeLabels[name]}><button tabIndex={-1} type="button" className="attribute_tooltip_trigger">{attributeLabels[name]}</button></Tooltip><DeltaValue value={value} tone={tone} /></div>; }
export function AttributeViewItemList({ campaign, preview = null }: { campaign: Campaign; preview?: Attributes | null }) { const attributes = effectiveAttributes(campaign); return <div className="attribute_grid">{([["health", "stamina", "offense", "defense", "mana"], ["vitality", "strength", "luck", "recovery", "stealth"]] as const).map((column, i) => <div key={i}>{column.map((name) => <AttributeViewItem key={name} name={name} value={preview?.[name] ?? attributes[name]} baseline={attributes[name]} />)}</div>)}</div>; }
function itemPresentation(item: Item | null) { const [attribute, amount] = Object.entries(item?.modifiers ?? {})[0] ?? []; return { icon: icons[attribute] ?? "◆", cost: Number.isFinite(amount) ? `${amount! >= 0 ? "+" : ""}${amount}` : "" }; }
export function SlotItem({ type = "equipment", slotType, slotSubtype, number, hotkey, text = "", icon = "", cost = "", accentColor = "", disabled = false, unavailable = false, onClick, onDoubleClick, className = "", dragSource = {}, dropTarget = {}, empty = false, tooltip = "" }: SlotItemProps) { const classes = ["slot_item", `slot_item--${type}`, disabled && "disabled", unavailable && "unavailable", className].filter(Boolean).join(" "); const button = <button tabIndex={-1} type="button" className={classes} data-slot-type={slotType ?? type} data-slot-subtype={slotSubtype} data-slot-empty={empty} aria-disabled={unavailable || undefined} style={accentColor ? { "--slot-accent-color": accentColor } : undefined} disabled={disabled} onClick={onClick} onDoubleClick={onDoubleClick} {...dropTarget} {...dragSource}>{type === "ability" && <strong className="slot_item_number">[{(number ?? 0) + 1}]</strong>}{type === "quick" && hotkey && <kbd className="slot_item_hotkey">[{hotkey}]</kbd>}{empty ? <span className="empty_slot" aria-label={type === "ability" ? "Empty ability slot" : type === "quick" ? "Empty quick slot" : type === "inventory" ? "Empty inventory slot" : "Empty equipment slot"}>+</span> : <><span className="slot_item_text">{text}</span><i className="slot_item_icon">{icon}</i><em className="slot_item_cost">{cost}</em><b className="drag_handle" aria-hidden="true">⠿</b></>}</button>; return tooltip ? <Tooltip content={tooltip}>{button}</Tooltip> : button; }
function abilityHelp(ability: Ability | null | undefined) { if (!ability) return "Assign an ability to fill this slot."; return ability.kind === "heal" ? `Heal: +${ability.amount} Health; costs ${ability.manaCost} Mana.` : `Wand: ${ability.damage} damage within ${ability.range} tiles; ${ability.manaCost} Mana.`; }
export function AbilityViewItem({ index, ability, disabled, onUse }: { index: number; ability?: Ability | null; disabled: boolean; onUse(): void }) { const available = Boolean(ability && !disabled); return <SlotItem type="ability" slotType="ability" number={index} text={ability?.title} icon={ability?.icon} cost={ability?.manaCost} accentColor="#c0aaff" disabled={!ability} unavailable={!available} onClick={available ? onUse : undefined} className="ability_row" dropTarget={{ "data-drop-ability": index }} dragSource={ability ? { "data-drag-kind": "ability", "data-drag-index": index, "aria-label": `Drag ${ability.title}` } : {}} empty={!ability} tooltip={abilityHelp(ability)} />; }
export function AbilityViewItemList({ campaign, dispatch }: WithDispatch) { const mana = campaign.player.resources.mana.current; return <div className="view_list">{campaign.player.abilities.slice(0, 3).map((id, index) => { const ability = id ? abilityCatalog[id] : null; return <AbilityViewItem key={index} index={index} ability={ability} disabled={Boolean(ability && mana < ability.manaCost)} onUse={() => dispatch({ type: "ability", index })} />; })}</div>; }
function modifierSummary(item: Item | null) { return Object.entries(item?.modifiers ?? {}).map(([name, value]) => `${attributeLabels[name as AttributeName] ?? name} ${value >= 0 ? "+" : ""}${value}`).join(", "); }
function equipmentSlotHelp(item: Item | null) { const effect = modifierSummary(item); return item ? `${effect || "No stat change"} · Double-click to replace.` : "Equipping changes your attributes."; }
function inventoryItemHelp(item: Item) { const effect = modifierSummary(item); return effect ? `${effect} · Double-click to equip.` : "No stats · Double-click to equip."; }
function stackInventoryItems(inventory: Item[]): InventoryStack[] {
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

function itemDisplayName(item: Item, quantity: number) {
  return isQuickSlottableItem(item) ? `${item.name} x ${quantity}` : `${item.name}${quantity > 1 ? ` x ${quantity}` : ""}`;
}
function EquipmentItem({ item, group, index, drag }: { item: Item | null; group: EquipmentGroup; index: number; drag: DragPresentation | null }) { const departure = drag?.source.kind === "slot" && drag.source.group === group && drag.source.index === index; const landing = drag?.destination?.kind === "slot" && drag.destination.group === group && drag.destination.index === index; const presentation = itemPresentation(item); return <SlotItem slotType="equipment" slotSubtype={group} text={item?.name} icon={presentation.icon} cost={presentation.cost} className={["equipment_item", departure && "drag_departure", landing && "drag_landing"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-group": group, "data-drop-index": index }} dragSource={item ? { "data-drag-kind": "slot", "data-drag-id": item.id, "data-drag-group": group, "data-drag-index": index, "aria-label": `Drag ${item.name}` } : {}} empty={!item} tooltip={equipmentSlotHelp(item)} />; }
export function SlotList({ campaign, drag = null }: { campaign: Campaign; drag?: DragPresentation | null }) { return <div className="slot_scroll">{([["Weapons", "weapons"], ["Armor", "armor"]] as const).map(([label, group]) => <div className="slot_group" key={group}><h3>{label}</h3>{campaign.player.equipment[group].map((item, index) => <EquipmentItem key={index} item={item} group={group} index={index} drag={drag} />)}</div>)}</div>; }
function quickSlotAvailable(campaign: Campaign, slot: QuickSlot | null) { const item = slot?.item; if (!item || !isQuickSlottableItem(item)) return false; const resource = resourceState(campaign)[item.consumableResource]; return resource.current < resource.currentMax; }
function QuickSlotItem({ campaign, slot, index, drag, dispatch }: { campaign: Campaign; slot: QuickSlot | null; index: number; drag: DragPresentation | null; dispatch(action: Action): unknown }) { const actual = slot?.item && isQuickSlottableItem(slot.item) ? slot.item : null; const available = quickSlotAvailable(campaign, slot); const landing = drag?.destination?.kind === "quick-slot" && drag.destination.index === index; return <SlotItem type="quick" slotType="quickslot" hotkey={index === 0 ? "Q" : "E"} text={actual ? `${actual.name} x ${slot?.quantity ?? 0}` : ""} className={["quick_slot", landing && "drag_landing", drag?.source.kind === "quick-slot" && drag.source.index === index && "drag_departure"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-quick-slot": index }} dragSource={actual ? { "data-drag-kind": "quick-slot", "data-drag-id": actual.id, "data-drag-index": index, "aria-label": `Drag ${actual.name}` } : {}} empty={!actual} unavailable={!available} onClick={available ? () => dispatch({ type: "use-quick-slot", index }) : undefined} tooltip={actual ? `${actual.name}; press ${index === 0 ? "Q" : "E"} to use.` : "Drag a Health Potion or Mana Potion here."} />; }
export function QuickSlotsView({ campaign, dispatch, drag = null }: WithDispatch & { drag?: DragPresentation | null }) { const slots = campaign.player.quickSlots ?? [null, null]; return <div className="quick_slots_list">{slots.map((slot, index) => <QuickSlotItem key={index} campaign={campaign} slot={slot} index={index} drag={drag} dispatch={dispatch} />)}</div>; }
export function InventoryViewItems({ campaign, dispatch, drag = null }: WithDispatch & { drag?: DragPresentation | null }) { const stacks = stackInventoryItems(campaign.player.inventory); const emptySlots = Math.max(0, campaign.player.inventoryCapacity - campaign.player.inventory.length); return <div className="inventory_scroll">{stacks.map(({ item, quantity }) => { const departure = drag?.source.kind === "inventory" && drag.source.item.id === item.id; const presentation = itemPresentation(item); const displayName = itemDisplayName(item, quantity); return <SlotItem key={item.id} type="inventory" slotType="inventory" text={displayName} icon={presentation.icon} cost={presentation.cost} className={["inventory_item", departure && "drag_departure"].filter(Boolean).join(" ")} onDoubleClick={() => item.category !== "consumable" && dispatch({ type: "equip", itemId: item.id, group: item.group, index: 0 })} dragSource={{ "data-drag-kind": "inventory", "data-drag-id": item.id, "data-inventory-item-id": item.id, "data-inventory-resource": item.consumableResource ?? "", "aria-label": `Drag ${displayName}` }} tooltip={inventoryItemHelp(item)} />; })}{Array.from({ length: emptySlots }, (_, index) => <SlotItem key={`empty-inventory-${index}`} type="inventory" slotType="inventory" className={["inventory_item", drag?.destination?.kind === "inventory" && drag.destination.index === index && "drag_landing"].filter(Boolean).join(" ")} dropTarget={{ "data-drop-inventory-slot": index }} empty disabled tooltip="Empty inventory slot." />)}</div>; }
function SecondaryInfoPanel({ campaign, preview, gains, open, motion, onToggle }: { campaign: Campaign; preview: Attributes | null; gains: Gains; open: boolean; motion?: UiMotionStyle; onToggle?(): void }) { return <aside className="info_panel secondary" hidden={!motion && !open} style={motion}><Card title="Minimap" showTab={Boolean(onToggle)} tabOffsetY="calc(100% - 4rem)" tabExpanded={open} onTabClick={onToggle} tabAriaLabel={`${open ? "Collapse" : "Expand"} SecondaryInfoPanel tab`} contentHidden={!open}><div className="minimap"><BabylonWorld campaign={campaign} zoom={0.18} minimap /></div></Card><Card title="Quest" contentHidden={!open}><div className="quest_layout"><div className="quest_field quest_title">Quest title</div><div className="quest_right"><div className="quest_field quest_field--selected"><span className="quest_indicator" aria-hidden="true">▶</span><span>Quest item 1</span></div><div className="quest_field"><span className="quest_indicator" aria-hidden="true" /><span>Quest item 2</span></div><div className="quest_field"><span className="quest_indicator" aria-hidden="true" /><span>Quest item 3</span></div></div></div></Card><Card title="Resources" contentHidden={!open}><ResourceList campaign={campaign} gains={gains} /></Card><Card title="Attributes" contentHidden={!open}><AttributeViewItemList campaign={campaign} preview={preview} /></Card><Card title="Log" className="log_card" contentHidden={!open}><ScrollArea className="log_scroll" autoScroll>{campaign.log.map((entry) => <p key={entry.id}>{entry.text}</p>)}</ScrollArea></Card></aside>; }
function MapFixControls({ campaign, slot, onImport, error }: { campaign: Campaign; slot: string | null; onImport(file?: File): void; error: string }) {
  const exportMap = async () => {
    const name = `rogues-dungeon-world-${campaign.world}-level-${campaign.floor.level}-seed-${campaign.floor.seed}.tmj`;
    const editableMap = serializeFloorToTiled({ campaign });
    // The bundle keeps the map beside `assets/`, so rewrite the tileset source
    // to remain valid after extraction anywhere on disk.
    editableMap.tilesets[0].source = "assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx";
    const content = JSON.stringify(editableMap, null, 2);
    try {
      const base = import.meta.env.BASE_URL;
      const assetUrl = (path: string) => new URL(`${base}assets/${path}`, window.location.origin).href;
      const [tileset, image] = await Promise.all([
        fetch(assetUrl("tiled-examples/tilesets/tileset-dungeon.tsx")).then((response) => response.ok ? response.text() : Promise.reject(new Error("Dungeon tileset could not be loaded."))),
        fetch(assetUrl("tilesets/tileset-dungeon.png")).then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error("Dungeon tileset image could not be loaded."))).then((bytes) => new Uint8Array(bytes)),
      ]);
      const bundle = createStoredZip([
        [name, content],
        ["assets/art/vendors/dungeons-and-pixels-v1.4/tiled-examples/tilesets/tileset-dungeon.tsx", tileset],
        ["assets/art/vendors/dungeons-and-pixels-v1.4/tilesets/tileset-dungeon.png", image],
      ]);
      const url = URL.createObjectURL(bundle); const link = document.createElement("a");
      link.href = url; link.download = name.replace(/\.tmj$/i, ".zip"); link.click(); URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const alertMessage = error instanceof Error ? error.message : "Could not create the editable map bundle.";
      window.alert(alertMessage);
    }
  };
  return <section className="map_fix_controls" aria-label="Map repair tools"><strong>Map Fix</strong><button tabIndex={-1} type="button" onClick={exportMap}>Open Editable Copy</button><label>Load repaired map<input tabIndex={-1} type="file" accept=".tmj,.json,application/json" onChange={(event) => onImport(event.target.files?.[0])} /></label>{slot && <span>Slot {slot}</span>}{error && <span role="alert">{error}</span>}</section>;
}
function PrimaryInfoPanel({ campaign, dispatch, drag, open, motion, inventory, onToggle }: WithDispatch & { drag: DragPresentation | null; open: boolean; motion?: UiMotionStyle; inventory?: Item[] | null; onToggle?(): void }) { const displayedCampaign = inventory ? { ...campaign, player: { ...campaign.player, inventory } } : campaign; return <aside className="info_panel primary" hidden={!motion && !open} style={motion}><Card title="Abilities" showTab={Boolean(onToggle)} tabExpanded={open} onTabClick={onToggle} tabAriaLabel={`${open ? "Collapse" : "Expand"} PrimaryInfoPanel tab`} contentHidden={!open}><AbilityViewItemList campaign={campaign} dispatch={dispatch} /></Card><Card title="Quick Slots" contentHidden={!open}><QuickSlotsView campaign={campaign} dispatch={dispatch} drag={drag} /></Card><Card title="Equipment" contentHidden={!open}><SlotList campaign={campaign} drag={drag} /></Card><Card title={"Inventory " + String(displayedCampaign.player.inventory.length).padStart(2, "0") + "/" + String(campaign.player.inventoryCapacity).padStart(2, "0")} contentHidden={!open}><InventoryViewItems campaign={displayedCampaign} dispatch={dispatch} drag={drag} /></Card></aside>; }

function DesktopInfoPanels({ campaign, dispatch, drag, preview, gains, primaryOpen, secondaryOpen, inventory, onTogglePrimary, onToggleSecondary }: WithDispatch & { drag: DragPresentation | null; preview: Attributes | null; gains: Gains; primaryOpen: boolean; secondaryOpen: boolean; inventory?: Item[] | null; onTogglePrimary(): void; onToggleSecondary(): void }) {
  const primaryMotion = useUiMotion("info-primary", { x: primaryOpen ? secondaryOpen ? 0 : 100 : 200, xOffsetRem: primaryOpen ? 0 : -.35, opacity: 1, depth: primaryOpen && secondaryOpen ? 1 : 0 });
  const secondaryMotion = useUiMotion("info-secondary", { x: secondaryOpen ? 100 : 200, xOffsetRem: secondaryOpen ? 0 : -.35, opacity: 1, depth: primaryOpen && secondaryOpen ? 2 : 1 });
  return <div className="desktop_info"><PrimaryInfoPanel campaign={campaign} dispatch={dispatch} drag={drag} open={primaryOpen} motion={primaryMotion} inventory={inventory} onToggle={onTogglePrimary} /><SecondaryInfoPanel campaign={campaign} preview={preview} gains={gains} open={secondaryOpen} motion={secondaryMotion} onToggle={onToggleSecondary} /></div>;
}

function AnimatedGameView({ children, primaryOpen, secondaryOpen }: { children: ReactNode; primaryOpen: boolean; secondaryOpen: boolean }) {
  const widthPercent = primaryOpen ? secondaryOpen ? 56 : 78 : secondaryOpen ? 78 : 100;
  const motion = useUiMotion("game-view", { widthPercent });
  return <section className="game_view" style={motion}>{children}</section>;
}

function MobileControlPanel({ campaign, dispatch, hidden = false }: WithDispatch & { hidden?: boolean }) { return <section className="mobile_controls" hidden={hidden}><div className="arrow_controls">{[["n", "↑"], ["w", "←"], ["s", "↓"], ["e", "→"]].map(([direction, label]) => <button tabIndex={-1} key={direction} onClick={() => dispatch({ type: "move", direction })}>{label}</button>)}</div><div className="mobile_abilities">{[0, 1, 2].map((index) => <button tabIndex={-1} key={index} disabled={!campaign.player.abilities[index] || campaign.player.resources.mana.current < abilityCatalog[campaign.player.abilities[index]!]!.manaCost} onClick={() => dispatch({ type: "ability", index })}>{index + 1}</button>)}</div><div className="mobile_actions"><button tabIndex={-1} onClick={() => dispatch({ type: "use-quick-slot", index: 0 })}>Quick 1</button><button tabIndex={-1} onClick={() => dispatch({ type: "use-quick-slot", index: 1 })}>Quick 2</button><button tabIndex={-1} onClick={() => dispatch({ type: "wait" })}>Wait</button></div><button tabIndex={-1} className="sneak_button" onClick={() => dispatch({ type: "toggle-sneak" })}>Sneak {campaign.player.sneaking ? "On" : ""}</button></section>; }
function SettingsDialog({ onClose, onReturn, onClearLocalStorage, preferences, setPreference, mutedByUrl, origin }: PreferenceProps & { onClose(): void; onReturn(): void; onClearLocalStorage(): void; mutedByUrl: boolean; origin: "menu" | "game" }) { const anchorSelector = origin === "menu" ? ".saved_games_panel" : ".game_view"; return <Dialog title="Settings" onClose={onClose} className={`settings-window settings-window--${origin}`} anchorSelector={anchorSelector} anchorAlignment={origin === "menu" ? "top-start" : "center"}><div className="settings_actions"><div className="audio_settings"><label className="audio_slider"><span>SFX Volume <output>{preferences.sfxVolume}%</output></span><input tabIndex={-1} type="range" min="0" max="100" step="1" value={preferences.sfxVolume} aria-label="SFX volume" aria-valuetext={`${preferences.sfxVolume}%`} onChange={(event) => setPreference({ sfxVolume: Number(event.target.value) })} /></label><label className="audio_slider"><span>Music Volume <output>{preferences.musicVolume}%</output></span><input tabIndex={-1} type="range" min="0" max="100" step="1" value={preferences.musicVolume} aria-label="Music volume" aria-valuetext={`${preferences.musicVolume}%`} onChange={(event) => setPreference({ musicVolume: Number(event.target.value) })} /></label><label className="audio_mute"><input tabIndex={-1} type="checkbox" checked={preferences.muteAll} onChange={(event) => setPreference({ muteAll: event.target.checked })} /> Mute All</label>{mutedByUrl && <span className="audio_mute_notice" role="status">Muted for this page by ?mute=1</span>}</div><button tabIndex={-1} onClick={onReturn}>Save &amp; Return to Main Menu</button><button tabIndex={-1} onClick={onClearLocalStorage}>Clear Local Storage</button><a tabIndex={-1} href="https://github.com/SamuelAsherRivello/babylon-lite-rogues-dungeon" target="_blank" rel="noopener noreferrer">GitHub</a><span>v{versionText.trim().replace(/^version=/, "")}</span></div></Dialog>; }
export function LevelUpChooser({ campaign, dispatch }: WithDispatch) { const pending = campaign.progression.pendingUpgrades?.[0]; if (!pending) return null; return <div className="level_up_backdrop" role="presentation"><section className="level_up_chooser" role="dialog" aria-modal="true" aria-labelledby="level-up-title"><h2 id="level-up-title">Level {pending.level}: Choose a Stat</h2><p>Your next action waits until you choose.</p><div>{pending.options.map((stat) => <button tabIndex={-1} key={stat} onClick={() => dispatch({ type: "choose-upgrade", stat })}><strong>{attributeLabels[stat]}</strong><span>{attributeHelp[stat]}</span></button>)}</div></section></div>; }
export function TitleBar({ campaign, visibleCounters, preferences, setPreference, onFullscreen, onSettings, fullscreenActual }: PreferenceProps & { campaign: Campaign; visibleCounters?: Campaign["counters"]; onFullscreen(): void; onSettings(): void; fullscreenActual: boolean }) {
  const counters = visibleCounters ?? campaign.counters;
  const selectPreference = (event: SyntheticEvent<HTMLElement>, preference: Partial<Preferences>) => { setPreference(preference); event.currentTarget.blur(); };
  return <header className="titlebar">
    <div className="titlebar_left">
      <span className="titlebar_identity">Rogue's Dungeon</span>
      <span className="titlebar_progress">
        <Tooltip content="Current world."><span>World: {campaign.world === "One" ? 1 : campaign.world}</span></Tooltip>
        <Tooltip content="Current dungeon level."><span>Level: {campaign.floor.level ?? campaign.floor.depth ?? 1}</span></Tooltip>
      </span>
      <span className="counters">
        <Tooltip content="Time advances with each move."><span className="titlebar_counter"><span className="titlebar_icon_copy titlebar_icon_copy--time" role="img" aria-label="Time">⏱️</span><span className="titlebar_counter_value">{String(campaign.floor.time).padStart(2, "0")}</span></span></Tooltip>
        <Tooltip content="Gold pays for goods."><span className="titlebar_counter" data-ui-counter="gold"><span className="titlebar_icon_copy titlebar_icon_copy--gold" data-ui-counter-icon="gold" role="img" aria-label="Gold">🪙</span><span className="titlebar_counter_value">{counters.gold}</span></span></Tooltip>
        <Tooltip content="Keys open doors."><span className="titlebar_counter" data-ui-counter="key"><span className="titlebar_icon_copy titlebar_icon_copy--keys" data-ui-counter-icon="key" role="img" aria-label="Keys">🔑</span><span className="titlebar_counter_value">{String(counters.keys).padStart(2, "0")}</span></span></Tooltip>
      </span>
    </div>
    <div className="titlebar_right">
      <Tooltip content="Zoom to change the game view."><label className="titlebar_utility titlebar_select_utility" aria-label="Zoom"><span className="titlebar_icon_copy titlebar_icon_copy--zoom" aria-hidden="true">⌕</span><select tabIndex={-1} value={preferences.zoom} onChange={(event) => selectPreference(event, { zoom: Number(event.target.value) })}>{gameZoomPresets.map((value) => <option key={value} value={value}>{value}x</option>)}</select></label></Tooltip>
      <Tooltip content={cameraHelp[preferences.camera] ?? cameraHelp.center}><label className="titlebar_utility titlebar_select_utility" aria-label="Camera"><span className="titlebar_icon_copy titlebar_icon_copy--camera" aria-hidden="true">▣</span><select tabIndex={-1} value={preferences.camera} onChange={(event) => selectPreference(event, { camera: event.target.value as Preferences["camera"] })}><option value="center">Center</option><option value="deadzone">Deadzone</option><option value="screen">Screen</option></select></label></Tooltip>
      <Tooltip content="Enter or leave fullscreen."><button tabIndex={-1} className="titlebar_utility" aria-label="Fullscreen" aria-pressed={fullscreenActual} onClick={onFullscreen}><span className="titlebar_icon_copy titlebar_icon_copy--fullscreen" aria-hidden="true">⛶</span></button></Tooltip>
      <Tooltip content="Adjust sound and return to menu."><button tabIndex={-1} className="titlebar_utility" aria-label="Settings" onClick={onSettings}><span className="titlebar_icon_copy titlebar_icon_copy--settings" aria-hidden="true">⚙</span></button></Tooltip>
    </div>
  </header>;
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
  X: "More action X (temporary)",
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
  const unavailableKey = slotKey || category === "move" || keyLabel === "X";
  const classes = ["input-key", category && `input-key--${category}`, unavailableKey && !colorAvailable && "input-key--unavailable", mode === "feedback" && pressed && "input-key--pressed", mode === "feedback" && pressed && "input-key--active", className].filter(Boolean).join(" ");
  return <kbd className={classes} aria-label={`Keyboard key ${keyLabel}`} aria-disabled={unavailableKey && !available} data-input-mode={mode} onClick={onActivate} onPointerDown={() => available && onPressStart?.(keyLabel)} onPointerUp={() => onPressEnd?.(keyLabel)} onPointerCancel={() => onPressEnd?.(keyLabel)} onPointerEnter={() => onHoverStart?.(keyLabel)} onPointerLeave={() => { onHoverEnd?.(keyLabel); onPressEnd?.(keyLabel); }}>{keyLabel}</kbd>;
}
export function StatusBar({ campaign, canOverride, orientation, setDeveloperAspect, onTogglePanels, fps, mobilePanel = "controls", setMobilePanel = () => {}, drag = null }: { campaign: Campaign; canOverride: boolean; orientation: Orientation; setDeveloperAspect(value: Orientation): void; onTogglePanels(): void; fps: number | null; mobilePanel?: string; setMobilePanel?(value: string): void; drag?: DragPresentation | null }) {
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
    if (key === "Z" || key === "C") return true;
    return false;
  };
  useEffect(() => {
    const normalize = (event: KeyboardEvent) => String(event.key ?? "").toUpperCase();
    const down = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key) || !keyAvailable(key)) return; if (key === "Z" && !event.repeat) { event.preventDefault(); setExpanded((value) => !value); } if (key === "C" && !event.repeat) { event.preventDefault(); onTogglePanels(); } setPressedKeys((current) => current.has(key) ? current : new Set(current).add(key)); };
    const up = (event: KeyboardEvent) => { const key = normalize(event); if (!feedbackKeys.has(key)) return; setPressedKeys((current) => { if (!current.has(key)) return current; const next = new Set(current); next.delete(key); return next; }); };
    const clear = () => setPressedKeys(new Set());
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); };
  }, [campaign, drag, onTogglePanels]);
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
  return <footer className="statusbar">
    <div className="desktop_status">
      <div className={`keyboard_controls_region${expanded ? " keyboard_controls_region--expanded" : ""}`}>
        <div className="keyboard_collapsed_controls" aria-hidden={expanded} style={summaryMotion}><div className="keyboard_collapsed_summary" aria-label="Move WASD | Abilities: 123 | Quick: Q E | More ZXC">{collapsedKeyboardGroups.map(({ label, keys }) => <span className="keyboard_collapsed_group" key={label}><span className="status_shortcut"><span>{label}</span>{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} available={available} colorAvailable={available} onActivate={key === "Z" ? toggleExpanded : key === "C" ? onTogglePanels : undefined} />; })}</span></span>)}</div></div>
        <ControlsArea expanded={expanded} titleVisible={titleVisible} titleText={titleText} onToggle={toggleExpanded}>{keyboardControlRows.map(({ label, keys }) => <div className="keyboard_tray_row" key={label}><div className="keyboard_tray_keys">{keys.map((key) => { const role = statusKeyRole(key, label === "Quick:" ? "quick" : label === "Move:" ? "move" : "default"); const available = keyAvailable(key, role); return <InputKey key={key} keyLabel={key} category={role} mode="feedback" available={available} colorAvailable={available} pressed={pressedKeys.has(key)} className="keyboard_tray_key" onActivate={key === "Z" ? toggleExpanded : key === "C" ? onTogglePanels : undefined} onPressStart={(pressedKey) => setPointerPressed(pressedKey, true)} onPressEnd={(pressedKey) => setPointerPressed(pressedKey, false)} {...inputKeyHoverProps} />; })}</div></div>)}</ControlsArea>
      </div>
      {canOverride && <div className="dev_settings"><span className="dev_settings_label">Dev Settings</span><button tabIndex={-1} onClick={() => setDeveloperAspect(orientation === "landscape" ? "portrait" : "landscape")}>Aspect: {orientation === "landscape" ? "Landscape" : "Portrait"}</button><button tabIndex={-1} type="button" aria-pressed={showPivotPoints} onClick={() => setShowPivotPoints((value) => !value)}>Pivot Points: {showPivotPoints ? "On" : "Off"}</button><output aria-live="off">FPS: {fps ?? "--"}</output></div>}
    </div>
    <div className="mobile_status" role="group" aria-label="Bottom panel"><Tooltip content="Show movement and ability controls."><button tabIndex={-1} type="button" aria-pressed={mobilePanel === "controls"} onClick={() => setMobilePanel("controls")}>Control</button></Tooltip><Tooltip content="Show stats, gear, quest, and log."><button tabIndex={-1} type="button" aria-pressed={mobilePanel === "info"} onClick={() => setMobilePanel("info")}>Info</button></Tooltip></div>
  </footer>;
}
export function GameScreen({ children, onPointerDown, orientation = "landscape" }: { children: ReactNode; onPointerDown?: PointerEventHandler<HTMLElement>; orientation?: Orientation }) { return <main className="command_desk" data-orientation={orientation} onPointerDown={onPointerDown}>{children}</main>; }
function ItemDragPreview({ campaign, drag }: { campaign: Campaign; drag: DragPresentation | null }) { if (!drag) return null; if (drag.source.kind === "ability") { const ability = drag.source.item.abilityId ? abilityCatalog[drag.source.item.abilityId] : null; return ability && <div className="item_drag_preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type="ability" number={drag.source.index} text={ability.title} icon={ability.icon} cost={ability.manaCost} accentColor="#c0aaff" /></div>; } const item = drag.source.item as Item; const presentation = itemPresentation(item); const quantity = drag.source.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.source.index]?.quantity ?? 1 : drag.source.kind === "inventory" ? stackInventoryItems(campaign.player.inventory).find((stack) => stack.item.id === item.id)?.quantity ?? 1 : 1; return <div className="item_drag_preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type={drag.source.kind === "slot" ? "equipment" : drag.source.kind === "quick-slot" ? "quick" : "inventory"} text={itemDisplayName(item, quantity)} icon={presentation.icon} cost={presentation.cost} /></div>; }
function itemDropTarget(target: Element | null, campaign: Campaign | null): { destination: DropDestination; targetItem?: Item | null } | null { const quick = target?.closest<HTMLElement>("[data-drop-quick-slot]"); if (quick) { const index = Number(quick.dataset.dropQuickSlot); return { destination: { kind: "quick-slot", index }, targetItem: campaign?.player.quickSlots?.[index]?.item ?? null }; } const slot = target?.closest<HTMLElement>("[data-drop-group]"); if (slot) { const group = slot.dataset.dropGroup as EquipmentGroup; const index = Number(slot.dataset.dropIndex); return { destination: { kind: "slot", group, index }, targetItem: campaign!.player.equipment[group]?.[index] }; } const inventorySlot = target?.closest<HTMLElement>("[data-drop-inventory-slot]"); if (inventorySlot) return { destination: { kind: "inventory", index: Number(inventorySlot.dataset.dropInventorySlot) } }; return null; }

export function Game() {
  const { orientation, canOverride, setDeveloperAspect } = useContext(LayoutContext);
  const [summaries, setSummaries] = useState<ReturnType<typeof readSlotSummary>>(() => { try { return readSlotSummary(localStorage); } catch { return ["1", "2", "3"].map((slot) => ({ slot, occupied: false, level: null, xpLevel: null })); } });
  const [slot, setSlot] = useState<string | null>(null); const [campaign, setCampaign] = useState<Campaign | null>(null); const [worldAlive, setWorldAlive] = useState(false); const [settings, setSettings] = useState(false); const [saveError, setSaveError] = useState(""); const [preview, setPreview] = useState<Attributes | null>(null); const [dragPresentation, setDragPresentation] = useState<DragPresentation | null>(null); const [gains, setGains] = useState<Gains>({}); const [floatingFeedback, setFloatingFeedback] = useState<Feedback[]>([]); const [particleEffects, setParticleEffects] = useState<ParticleEffect[]>([]); const [fps, setFps] = useState<number | null>(null);
  const [primaryInfoOpen, setPrimaryInfoOpen] = useState(true); const [secondaryInfoOpen, setSecondaryInfoOpen] = useState(true); const [uiAnimations, setUiAnimations] = useState<GameViewToUiAnimation[]>([]); const [pendingUiCredits, setPendingUiCredits] = useState<{ id: string; previous: Campaign }[]>([]);
  const togglePanels = () => { if (primaryInfoOpen && secondaryInfoOpen) setSecondaryInfoOpen(false); else if (primaryInfoOpen) setPrimaryInfoOpen(false); else if (secondaryInfoOpen) setPrimaryInfoOpen(true); else setSecondaryInfoOpen(true); };
  const [selectedGridSpot, setSelectedGridSpot] = useState<SelectedCell | null>(null); const [mobilePanel, setMobilePanel] = useState("controls");
  const gainTimers = useRef(new Map<ResourceName, ReturnType<typeof setTimeout>>());
  const floatingTimers = useRef(new Map<string | undefined, ReturnType<typeof setTimeout>>());
  useEffect(() => () => { floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); }, []);
  const [preferences, setPreferences] = useState<Preferences>(() => { try { return readPreferences(localStorage); } catch { return { zoom: 1, camera: "center", fullscreenDesired: false, sfxVolume: 80, musicVolume: 20, muteAll: false }; } });
  const [urlOptions] = useState(() => parseGameUrlOptions(window.location.search));
  const randomSeed = urlOptions.seed;
  const [audio] = useState(() => createAudioManager({ search: window.location.search }));
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
      if (!collected || campaign.floor.entities.some((current) => current.id === entity.id) || !["item", "potion", "gold", "key"].includes(entity.kind)) continue;
      const id = `${entity.id}:${campaign.floor.time}`;
      const resource = entity.kind === "potion" ? entity.resource : entity.kind === "item" ? entity.item.consumableResource : null;
      const quickSlot = resource ? campaign.player.quickSlots?.findIndex((slot) => slot?.item.consumableResource === resource) ?? -1 : -1;
      const existingInventoryTarget = resource ? previous.player.inventory.some((item) => item.consumableResource === resource) : entity.kind === "item" && previous.player.inventory.some((item) => item.id === entity.item.id);
      const destination = entity.kind === "gold" || entity.kind === "key" ? "counter" : "row";
      const target = destination === "counter" ? `[data-ui-counter-icon="${entity.kind}"]` : quickSlot >= 0 ? `[data-drop-quick-slot="${quickSlot}"]` : existingInventoryTarget && resource ? `[data-inventory-resource="${resource}"]` : existingInventoryTarget && entity.kind === "item" ? `[data-inventory-item-id="${entity.item.id}"]` : "[data-drop-inventory-slot=\"0\"]";
      const frame = entity.kind === "gold" ? 3 : entity.kind === "key" ? 5 : entity.kind === "potion" ? entity.resource === "health" ? 6 : 7 : 2;
      setUiAnimations((current) => [...current, { id, kind: entity.kind, x: entity.x, y: entity.y, frame, target, destination }]);
      setPendingUiCredits((current) => [...current, { id, previous }]);
    }
    collectedItemIdsRef.current.clear();
    campaignRef.current = campaign;
  }, [campaign]);
  const pointerDragRef = useRef<PointerDrag | null>(null);
  const dispatch = useCallback((action: Action) => sessionRef.current?.dispatch(action), []);
  const completeUiAnimation = useCallback((id: string) => { setUiAnimations((current) => current.filter((animation) => animation.id !== id)); setPendingUiCredits((current) => current.filter((credit) => credit.id !== id)); }, []);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldMovements = useRef(new Map<string, { direction: Direction }>());
  const heldShift = useRef(new Set<string>());
  const mouseMovement = useRef<Movement | null>(null);
  const previousSelectedGridSpot = useRef<SelectedCell | null>(null);
  const activeMovement = useRef<Movement | null>(null);
  const selectedMousePath = getMousePathFromSelectedCell(selectedGridSpot, campaign);
  const selectedCellReachable = selectedGridSpot ? selectedMousePath !== null : null;
  const returnToMainMenu = useCallback(() => {
    if (moveTimer.current) { clearTimeout(moveTimer.current); clearInterval(moveTimer.current); moveTimer.current = null; }
    heldMovements.current.clear(); heldShift.current.clear(); mouseMovement.current = null; activeMovement.current = null;
    pointerDragRef.current = null; sessionRef.current = null;
    gainTimers.current.forEach(clearTimeout); gainTimers.current.clear(); setGains({});
    floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); setFloatingFeedback([]); setParticleEffects([]); setUiAnimations([]); setPendingUiCredits([]);
    setSelectedGridSpot(null); setPreview(null); setDragPresentation(null); setSettings(false); setWorldAlive(false); setCampaign(null); setSlot(null);
  }, []);
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
    if (immediate && (previous?.direction !== next.direction || (!previous?.sprint && next.sprint))) dispatch({ type: "move", direction: next.direction });
    const repeat = () => dispatch({ type: "move", direction: next.direction });
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
  const setPreference = useCallback((change: Partial<Preferences>) => { setPreferences((current) => { const next = { ...current, ...change }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, []);
  const stepZoom = useCallback((step: number) => { setPreferences((current) => { const index = gameZoomPresets.indexOf(current.zoom); const zoom = gameZoomPresets[Math.max(0, Math.min(gameZoomPresets.length - 1, index + step))]; const next = { ...current, zoom }; try { writePreferences(localStorage, next); } catch { /* session fallback */ } return next; }); }, []);
  const toggleFullscreen = useCallback(async () => { const desired = !document.fullscreenElement; setPreference({ fullscreenDesired: desired }); try { if (desired) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch { /* browser gesture policy */ } }, [setPreference]);
  const clearLocalStorage = useCallback(() => {
    if (!window.confirm("Clear all Rogue's Dungeon saved games and settings? This cannot be undone.")) return;
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
      if (!worldAlive || settings || campaign?.progression.pendingUpgrades?.length || editable(event.target)) return;
      const movement = getMovementKey(event);
      if (movement) { event.preventDefault(); if (!heldMovements.current.has(movement.code)) { heldMovements.current.set(movement.code, movement); syncMovement(); } return; }
      if (event.code === "ShiftLeft" || event.code === "ShiftRight") { event.preventDefault(); const oldSprint = heldShift.current.size > 0; heldShift.current.add(event.code); if (!oldSprint) syncMovement(true, true); return; }
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
  }, [campaign, dispatch, settings, syncMovement, worldAlive]);
  const begin = (id: string, repairedFloor: Floor | null = null) => { let existing = null; try { existing = readSlot(localStorage, id); } catch { setSaveError("This saved game is unavailable. Its data was left unchanged."); setSummaries(readSlotSummary(localStorage)); return; } floatingTimers.current.forEach(clearTimeout); floatingTimers.current.clear(); setFloatingFeedback([]); setParticleEffects([]); setSelectedGridSpot(null); if (preferences.fullscreenDesired && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); const initial = existing ?? createCampaign(randomSeed ?? undefined, urlOptions.level, urlOptions.level); if (!existing) initial.world = urlOptions.world === 1 ? "One" : String(urlOptions.world); const scenario = urlOptions.mapFix ? getManualTileScenario(urlOptions.scenario) : null; const manualFloor = scenario ? buildManualTileScenario(scenario.name, randomSeed ?? 13579, urlOptions.level) : null; if (manualFloor && !repairedFloor) { initial.floor = structuredClone(manualFloor); initial.player.x = manualFloor.start.x; initial.player.y = manualFloor.start.y; initial.realm = `Debug ${manualFloor.scenario}`; } if (repairedFloor) { initial.floor = structuredClone(repairedFloor); initial.player.x = repairedFloor.start.x; initial.player.y = repairedFloor.start.y; initial.realm = `Underground ${repairedFloor.level}`; } const session = createGameSession(initial, { onCommit: (result) => { try { writeSlot(localStorage, id, result.state); setSummaries(readSlotSummary(localStorage)); setSaveError(""); } catch (error) { setSaveError("Saving is unavailable in this browser session."); session.publish("campaign.save.failed", { message: error instanceof Error ? error.message : String(error) }); } } }); session.subscribe((result) => { if (!result.accepted && !result.system && !result.events.some((event) => event.type === "quick-slot.use.rejected")) return; audio.playEvents(result.events); for (const event of result.events) if (event.type === "item.collected" && typeof event.facts.itemId === "string") collectedItemIdsRef.current.add(event.facts.itemId); const moved = result.events.find((event) => event.type === "player.moved" && typeof event.facts.from === "object" && event.facts.from !== null); if (moved) { const puff = createSmokePuff(moved.facts.from as { x: number; y: number }); setParticleEffects((current) => [...current.filter((effect) => !particleExpired(effect)), puff]); setTimeout(() => setParticleEffects((current) => current.filter((effect) => effect.id !== puff.id)), smokePuffDurationMs); } result.state.log = projectLogEvents(result.state.log, result.events); const feedback = projectFloatingFeedback(result.events); if (feedback.length) { setFloatingFeedback((current) => [...current, ...feedback].slice(-24)); for (const effect of feedback) { const timer = setTimeout(() => { setFloatingFeedback((current) => removeFloatingFeedback(current, effect.id)); floatingTimers.current.delete(effect.id); }, effect.duration); floatingTimers.current.set(effect.id, timer); } } for (const event of result.events) { const facts = event.facts; if ((event.type === "resource.changed" && facts.current! > facts.previous!) || (event.type === "xp.gained" && facts.current! > facts.previous!)) { const name = event.type === "xp.gained" ? "xp" : facts.resource!; setGains((current) => ({ ...current, [name]: { from: facts.previous!, to: facts.current!, max: facts.currentMax ?? (name === "xp" ? undefined : initial.progression.attributes[name]) ?? 100 } })); clearTimeout(gainTimers.current.get(name)); gainTimers.current.set(name, setTimeout(() => setGains((current) => { const next = { ...current }; delete next[name]; return next; }), 420)); } } if (result.events.some((event) => event.type === "player.died")) { returnToMainMenu(); return; } setCampaign(result.state); }); sessionRef.current = session; setSlot(id); setCampaign(initial); };
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
  const uiCampaign = useMemo(() => pendingUiCredits[0]?.previous ?? campaign, [campaign, pendingUiCredits]);
  if (!campaign) return <><main className="saved_games"><img className="saved_games_logo" src={`${import.meta.env.BASE_URL}assets/art/menu/rogues-dungeon-logo.png`} alt="Rogue's Dungeon" /><section className="saved_games_panel" aria-labelledby="saved_games_heading"><h1 className="visually_hidden">Rogue's Dungeon</h1><h2 id="saved_games_heading">Choose Your Descent</h2>{summaries.map((entry) => <button tabIndex={-1} key={entry.slot} disabled={entry.invalid} onClick={() => begin(entry.slot)}><b>Saved Game {entry.slot}</b><span>{entry.invalid ? "Unavailable" : entry.occupied ? "Level " + String(entry.level).padStart(2, "0") + " · XP " + String(entry.xpLevel).padStart(2, "0") : newGameLabel}</span></button>)}<button tabIndex={-1} type="button" onClick={() => setSettings(true)}>Settings</button>{saveError && <p role="alert">{saveError}</p>}</section></main>{settings && <SettingsDialog origin="menu" onClose={() => setSettings(false)} onReturn={() => setSettings(false)} onClearLocalStorage={clearLocalStorage} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}</>;
  const activeUiCampaign = uiCampaign ?? campaign;
  return <GameScreen orientation={orientation} onPointerDown={handlePointerDown}>
    <TitleBar campaign={campaign} visibleCounters={pendingUiCredits[0]?.previous.counters} preferences={preferences} setPreference={setPreference} onFullscreen={toggleFullscreen} onSettings={() => setSettings(true)} fullscreenActual={fullscreenActual} />
    {urlOptions.mapFix && <MapFixControls campaign={campaign} slot={slot} onImport={importRepairMap} error={mapFixError} />}
    <section className="desk_middle" data-primary-open={primaryInfoOpen} data-secondary-open={secondaryInfoOpen}><AnimatedGameView primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen}><BabylonWorld campaign={campaign} zoom={preferences.zoom} camera={preferences.camera} mouseInteraction floatingFeedback={floatingFeedback} particleEffects={particleEffects} uiAnimations={uiAnimations} selectedCell={selectedGridSpot} selectedCellReachable={selectedCellReachable} onSelectedCellChange={setSelectedGridSpot} onWorldAliveChange={setWorldAlive} onUiAnimationComplete={completeUiAnimation} onFpsChange={canOverride ? setFps : undefined} onZoom={stepZoom} /></AnimatedGameView><DesktopInfoPanels campaign={activeUiCampaign} dispatch={dispatch} drag={dragPresentation} preview={preview} gains={gains} primaryOpen={primaryInfoOpen} secondaryOpen={secondaryInfoOpen} onTogglePrimary={() => setPrimaryInfoOpen((value) => !value)} onToggleSecondary={() => setSecondaryInfoOpen((value) => !value)} /></section>
    <StatusBar campaign={campaign} canOverride={canOverride} orientation={orientation} setDeveloperAspect={setDeveloperAspect} onTogglePanels={togglePanels} fps={fps} mobilePanel={mobilePanel} setMobilePanel={setMobilePanel} drag={dragPresentation} />
    <section className="mobile_bottom"><MobileControlPanel campaign={campaign} dispatch={dispatch} hidden={mobilePanel !== "controls"} /><div className="mobile_info" hidden={mobilePanel !== "info"}><PrimaryInfoPanel campaign={activeUiCampaign} dispatch={dispatch} drag={dragPresentation} open /><SecondaryInfoPanel campaign={activeUiCampaign} preview={preview} gains={gains} open /></div></section>
    <ItemDragPreview campaign={campaign} drag={dragPresentation} />
    {canOverride && orientation === "portrait" && <button tabIndex={-1} className="dev_aspect_return" onClick={() => setDeveloperAspect("landscape")}>Dev: Return to Landscape</button>}
    {saveError && <div className="save_error">{saveError}</div>}
    <LevelUpChooser campaign={campaign} dispatch={dispatch} />
    {settings && <SettingsDialog origin="game" onClose={() => setSettings(false)} onReturn={() => { try { writeSlot(localStorage, slot!, campaign); setSaveError(""); } catch { setSaveError("Saving is unavailable in this browser session."); } returnToMainMenu(); }} onClearLocalStorage={clearLocalStorage} preferences={preferences} setPreference={setPreference} mutedByUrl={audio.hardMuted} />}
  </GameScreen>;
}
