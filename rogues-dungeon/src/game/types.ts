/** Serializable domain contracts. This module has no UI or renderer dependencies. */
export interface Position { x: number; y: number }
export interface Room extends Position { w: number; h: number }
export type Direction = "n" | "s" | "w" | "e";
/** The last cardinal direction in which a character successfully moved. */
export type CharacterHeading = Direction;
export type ResourceName = "health" | "stamina" | "offense" | "defense" | "mana" | "xp";
export type AttributeName = Exclude<ResourceName, "xp"> | "vitality" | "strength" | "luck" | "recovery" | "stealth";
export type Attributes = Record<AttributeName, number>;
export interface Resource { current: number; currentMax: number; level?: number }
export type Resources = Record<ResourceName, Resource>;
export type ResourceInput = Partial<Record<ResourceName, Partial<Resource> | number>>;
export type EquipmentGroup = "weapons" | "armor";
export type ConsumableResource = "health" | "mana";
export interface Item { id: string; name: string; group: EquipmentGroup; modifiers: Partial<Attributes>; category?: "equipment" | "consumable"; consumableResource?: ConsumableResource; isStackable?: boolean; quantity?: number }
export interface QuickSlot { item: Item; quantity: number }
export type Equipment = Record<EquipmentGroup, (Item | null)[]>;
export type AbilityId = "heal" | "wand";
export interface TerrainCell { walkable: boolean; role: string; protected?: boolean }
export interface Enemy extends Position {
  id: string; kind: "enemy"; name: string; hp: number; maxHp: number; damage: number; xp: number;
  resources: Resources; awareness: number; actionCooldown: number; nextActionAt: number; heading?: CharacterHeading;
}
export type Entity = Enemy
  | (Position & { id: string; kind: "potion"; resource: "health" | "mana"; name?: string })
  | (Position & { id: string; kind: "key" | "gold"; amount?: number; name?: string })
  | (Position & { id: string; kind: "stairs"; direction?: "forward" | "back"; name?: string })
  | (Position & { id: string; kind: "discovery"; name?: string })
  | (Position & { id: string; kind: "chest"; opened?: boolean })
  | (Position & { id: string; kind: "crate"; health: number; opened?: boolean; openFrame?: 1 | 5 })
  | (Position & { id: string; kind: "item"; item: Item });
export type ObjectSetRegionRole = "optional-reward" | "exit";
export interface FloorTriggerDoorBarrelSet {
  id: string; kind: "floor-trigger-door-barrel"; barrel: Position; trigger: Position; door: Position;
  barrelStart?: Position; barrelReturnUsed?: boolean;
  regionRole: ObjectSetRegionRole;
}
export type ObjectSet = FloorTriggerDoorBarrelSet;
export interface WorldDecoration extends Position { id: string; kind: "torch" | "trap"; wallMounted: boolean }
export interface Floor {
  seed: number; width: number; height: number; cells: TerrainCell[][]; map?: number[][];
  start: Position; entities: Entity[]; time: number; level: number; depth?: number; generatorVersion?: string;
  scenario?: string;
  generation?: { seed: number; generator: string | null; passes?: { id: string; diagnostics: number }[] };
  tiledGrounds?: number[]; tiledWalls?: number[];
  decorations?: WorldDecoration[];
  objectSets?: ObjectSet[];
}
export type QuestItemId = "walk-through-stairs" | "collect-health-potion" | "collect-coin";
export interface QuestItem { id: QuestItemId; title: string; complete: boolean }
export interface Quest { id: "my-first-quest"; title: "My First Quest"; items: QuestItem[]; activeItemId: QuestItemId | null }
export interface Campaign {
  version: number; world: string; realm: string; floor: Floor;
  /** Previously visited floors, keyed by level, so a return stair restores its dungeon. */
  floors?: Record<string, Floor>;
  progression: { attributes: Attributes; level: number; xp: number; nextXp: number; totalKills: number; difficulty: number; pendingUpgrades: { level: number; options: AttributeName[] }[] };
  player: Position & { resources: Resources; equipment: Equipment; inventory: Item[]; inventoryCapacity: number; abilities: (AbilityId | null)[]; quickSlots?: [QuickSlot | null, QuickSlot | null]; sneaking: boolean; heading?: CharacterHeading };
  starterConsumablesSeeded?: boolean;
  counters: { keys: number; gold: number }; objective: string; quest?: Quest; log: LogEntry[]; savedAt?: number;
}
export interface Preferences { zoom: number; camera: "center" | "deadzone" | "screen"; fullscreenDesired: boolean; sfxVolume: number; musicVolume: number; muteAll: boolean }
export interface StorageAccess { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface StorageCollection extends StorageAccess { length: number; key(index: number): string | null }
export type Action =
  | { type: "move"; direction: string; hazardElapsedMs?: number }
  | { type: "return-barrel"; setId: string }
  | { type: "wait" }
  | { type: "toggle-sneak" }
  | { type: "choose-upgrade"; stat: AttributeName }
  | { type: "ability"; index: number }
  | { type: "resolve-ability"; abilityId: AbilityId; targetId?: string }
  | { type: "assign-ability"; from: number; to: number }
  | { type: "equip"; group: EquipmentGroup; index: number; itemId: string }
  | { type: "unequip"; group: EquipmentGroup; index: number }
  | { type: "reorder-equipment"; group: EquipmentGroup; index: number; other: number }
  | { type: "assign-quick-slot"; itemId: string; index: number }
  | { type: "move-quick-slot"; from: number; to: number }
  | { type: "return-quick-slot"; index: number }
  | { type: "use-quick-slot"; index: number };
export interface EventFacts {
  reason?: string; previous?: number; current?: number; previousMax?: number; currentMax?: number;
  resource?: ResourceName; position?: Position; targetPosition?: Position; damage?: number;
  target?: string; targetId?: string; previousHealth?: number; currentHealth?: number;
  amount?: number; cause?: string; level?: number; threshold?: number; options?: AttributeName[];
  stat?: AttributeName; active?: boolean; from?: Position | number; to?: Position | number;
  realm?: string; itemId?: string; name?: string; item?: string; lootTier?: number; xp?: number;
  action?: string; source?: string | { group: EquipmentGroup; index: number } | { quickSlot: number };
  destination?: string | { group: EquipmentGroup; index: number } | { quickSlot: number }; group?: EquipmentGroup; index?: number; other?: number;
  id?: string; title?: string; manaCost?: number; targetType?: string; transactionId?: string; actionType?: string; ticks?: number; abilityId?: AbilityId;
  error?: string; message?: string; quantity?: number; quickSlot?: number;
}
export interface GameEvent { type: string; facts: EventFacts; source?: string; gameTime: number; sequence: number; eventId?: string; transactionId?: string | null; outcome?: string }
export interface ActionResult { state: Campaign; events: GameEvent[]; accepted: boolean; ticks: number; transactionId?: string; system?: boolean }
export interface LogEntry { id?: string; text: string }
export interface SelectedCell extends Position { pressed?: boolean; sprint?: boolean; left?: number; top?: number; size?: number; kind?: string }
export interface Feedback extends Position { id?: string; kind: string; text: string; color: string; duration: number }
export type DragSource = { kind: "inventory"; item: Item } | { kind: "slot"; item: Item; group: EquipmentGroup; index: number } | { kind: "quick-slot"; item: Item; index: number };
export type DropDestination = { kind: "inventory"; index?: number } | { kind: "slot"; group: EquipmentGroup; index: number } | { kind: "quick-slot"; index: number };
export interface Rect extends Position { width: number; height: number }
