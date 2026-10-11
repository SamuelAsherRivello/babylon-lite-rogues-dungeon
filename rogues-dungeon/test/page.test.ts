import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import viteConfig from '../../vite.config.ts';
import { aspectRatioPresets, classifyPlatform, defaultLayout, fitViewport, layoutForPlatform, validateLayout } from '../src/ui/layout.ts';

test("builds Rogue's Dungeon from its GitHub Pages base", () => {
  assert.equal(viteConfig.root, 'rogues-dungeon'); assert.equal(viteConfig.base, '/babylon-lite-rogues-dungeon/');
});
test('fits both landscape and portrait command-desk surfaces', () => {
  assert.equal(defaultLayout.label, '16:9'); assert.equal(aspectRatioPresets.portrait.label, '9:16');
  for (const layout of [defaultLayout, { orientation: 'portrait' as const, ...aspectRatioPresets.portrait }]) { const fitted = fitViewport(900, 900, layout); assert.ok(fitted.width <= 900 && fitted.height <= 900); assert.equal(fitted.x * 2 + fitted.width, 900); }
  assert.throws(() => validateLayout({ orientation: 'portrait', width: 16, height: 9 }));
});
test('selects aspect by mobile platform signal with a PC-only developer preview override', () => {
  assert.equal(classifyPlatform({ userAgentDataMobile: false, userAgent: 'iPhone' }), 'mobile');
  assert.equal(classifyPlatform({ userAgentDataMobile: false, userAgent: 'Windows NT 10.0' }), 'pc');
  assert.equal(classifyPlatform({ userAgentDataMobile: true, userAgent: 'Desktop' }), 'mobile');
  assert.equal(classifyPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile' }), 'mobile');
  assert.equal(layoutForPlatform('pc').orientation, 'landscape');
  assert.equal(layoutForPlatform('pc', 'portrait').orientation, 'portrait');
  assert.equal(layoutForPlatform('mobile', 'landscape').orientation, 'portrait');
});
test('keeps the developer aspect override behind the development build flag', async () => {
  const app = await readFile(new URL('../src/ui/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /platform === "pc" && import\.meta\.env\.DEV/);
  assert.match(app, /layoutForPlatform\(platform, canOverride \? developerAspect : null\)/);
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /canOverride && orientation === "portrait"/);
  assert.match(game, /setDeveloperAspect\("landscape"\)/);
  assert.match(game, /className="command_desk" data-orientation=\{orientation\}/);
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.command_desk\[data-orientation="portrait"\]/);
  assert.doesNotMatch(css, /@media\s*\(max-aspect-ratio|@container\s*\(max-aspect-ratio/);
});
test('removes fitted gutters while the browser surface is fullscreen', async () => {
  const surface = await readFile(new URL('../src/ui/BrowserSurface.tsx', import.meta.url), 'utf8');
  assert.match(surface, /fullscreen \? \{ x: 0, y: 0, width: size\.width, height: size\.height \}/);
  assert.match(surface, /fullscreenchange/);
  assert.doesNotMatch(surface, /size\.height > size\.width/);
});
test('uses a command desk and removes template corner units', async () => {
  const [game, controlsArea, app, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/ControlsArea.tsx', 'src/ui/App.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /PrimaryInfoPanel/); assert.match(game, /SecondaryInfoPanel/); assert.match(game, /3 Saved Games/); assert.match(game, /Dev Settings/);
  assert.match(game, /className="titlebar_left"/); assert.match(game, /className="titlebar_right"/); assert.match(game, /className="titlebar_identity"/); assert.match(game, /className="titlebar_progress"/); assert.match(game, /World: \{campaign\.world === "One" \? 1 : campaign\.world\}/);
  assert.match(game, /aria-label="Time">⏱️<\/span>/); assert.match(game, /aria-label="Gold">🪙<\/span><span className="titlebar_counter_value">\{campaign\.counters\.gold\}/); assert.match(game, /aria-label="Keys">🔑<\/span><span className="titlebar_counter_value">\{String\(campaign\.counters\.keys\)/);
  assert.doesNotMatch(game, /titlebar_icon_group/); assert.doesNotMatch(css, /titlebar_icon_group/);
  assert.match(game, /className="titlebar_identity">Rogue's Dungeon<\/span>/);
  assert.doesNotMatch(game, /Dungeon Roguelite/);
  assert.match(game, /className="titlebar_utility"/); assert.match(css, /\.titlebar_utility \{[^}]*align-items:center[^}]*padding:0 \.35em/);
  assert.match(game, /Clear Local Storage/); assert.match(game, /clearRoguesDungeonStorage\(localStorage\)/); assert.match(game, /window\.location\.reload\(\)/);
  assert.match(css, /\.titlebar \.titlebar_select_utility \{ width:9\.5em; flex:0 0 9\.5em/); assert.match(css, /\.titlebar \.titlebar_select_utility select \{ width:7\.4em/);
  assert.match(game, /const selectPreference = \(event: SyntheticEvent<HTMLElement>, preference: Partial<Preferences>\) => \{ setPreference\(preference\); event\.currentTarget\.blur\(\); \}/);
  assert.match(game, /keyboardControlRows/); assert.match(game, /collapsedKeyboardGroups/); assert.match(controlsArea, /aria-label="Keyboard controls"/); assert.match(game, /console\.info\(`\[keyboard-controls\]/); assert.doesNotMatch(game, /Sprint:/); assert.doesNotMatch(game, /Sneak:/); assert.doesNotMatch(game, /\[1, 2, 3, 4\]/); assert.match(game, /<InputKey key=\{key\}/); assert.match(css, /\.controls-area_surface \{[^}]*transition:transform 250ms ease/); assert.match(css, /\.keyboard_tray_keys \{[^}]*grid-template-columns:repeat\(3,2\.25rem\)/);
  assert.match(game, /<option value="deadzone">Deadzone<\/option>/);
  assert.doesNotMatch(app, /AppCorner/); assert.match(css, /mobile_controls/);
  assert.match(css, /grid-template-rows:4% 92% 4%/); assert.match(css, /grid-template-rows:4% 46% 4% 46%/);
  assert.match(css, /grid-template-columns:minmax\(0,56%\) minmax\(0,44%\)/);
  assert.match(css, /\.titlebar_identity \{[^}]*background:#1a1720/); assert.match(css, /\.titlebar_progress \{[^}]*justify-content:center/);
  assert.match(css, /align-items:center/);
});
test('returns to the saved-game menu when a player death event is committed', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /event\.type === "player\.died"/); assert.match(game, /returnToMainMenu\(\); return;/);
});

test('uses randomSeed to seed only a newly selected save slot', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /parseGameUrlOptions\(window\.location\.search\)/);
  assert.match(game, /existing \?\? createCampaign\(randomSeed \?\? undefined, urlOptions\.level, urlOptions\.level\)/);
  assert.match(game, /New Game · Seed \$\{randomSeed\}/);
});
test('supports deterministic direct-slot map-fix URLs', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /parseGameUrlOptions\(window\.location\.search\)/);
  assert.match(game, /urlOptions\.slot/);
  assert.match(game, /urlOptions\.mapFix/);
  assert.match(game, /Open Editable Copy/);
});
test('derives sparse dungeon terrain from the verified Wang mapping', async () => {
  const [world, wang] = await Promise.all([
    readFile(new URL('../src/systems/rendering/world-render-system.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/systems/maps/wang-autotiling-system.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(world, /buildDungeonWangTerrain/);
  assert.match(wang, /DUNGEON_WANG_TILE_BY_MASK/);
  assert.match(wang, /DUNGEON_WANG_INTERIOR_TILE = 13/);
});
test('exposes independent persisted SFX and Music controls in Settings', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  const saves = await readFile(new URL('../src/systems/persistence/save-system.ts', import.meta.url), 'utf8');
  assert.match(game, /aria-label="SFX volume"/); assert.match(game, /aria-label="Music volume"/); assert.match(game, /Mute All/);
  assert.match(game, /mutedByUrl=\{audio\.hardMuted\}/); assert.match(saves, /sfxVolume/); assert.match(saves, /musicVolume/);
});
test('uses the inventory grabber as a cue while the whole row is draggable', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /function SlotItem/);
  assert.match(game, /<SlotItem key=\{item\.id\} type="inventory"/);
  assert.match(game, /"data-drag-kind": "inventory", "data-drag-id": item\.id/);
  assert.match(game, /"aria-label": `Drag \$\{item\.name\}`/);
  assert.match(game, /\{\.\.\.dropTarget\} \{\.\.\.dragSource\}/);
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.slot_item\[data-drag-kind\]\{cursor:grab/);
});
test('makes equipment rows draggable and droppable everywhere', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /function EquipmentItem/);
  assert.match(game, /"data-drag-kind": "slot", "data-drag-id": item\.id/);
  assert.match(game, /dropTarget=\{\{ "data-drop-group": group, "data-drop-index": index \}\}/);
  assert.doesNotMatch(game, /dragWholeRow/);
});
test('uses SlotItem for vertically aligned abilities and equipment', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /<SlotItem type="ability" slotType="ability" number=\{index\}/);
  assert.match(game, /slotType="ability"/); assert.match(game, /slotType="quickslot"/); assert.match(game, /slotType="equipment" slotSubtype=\{group\}/);
  assert.match(game, /accentColor="#c0aaff"/);
  assert.match(game, /Card title="Equipment"/);
  assert.match(game, /<EquipmentItem key=\{index\}/);
  assert.match(css, /\.slot_item \{[^}]*align-items:center/);
  assert.match(css, /\.slot_item_number,\.slot_item_icon \{ color:var\(--slot-accent-color,#c6b994\)/);
  assert.doesNotMatch(css, /\.slot_item--ability \{/);
});

test('limits ability presentation and mobile controls to three positions', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /campaign\.player\.abilities\.slice\(0, 3\)/);
  assert.match(game, /\{\[0, 1, 2\]\.map/);
  assert.doesNotMatch(game, /\{\[0, 1, 2, 3\]\.map/);
  assert.match(css, /\.mobile_abilities \{ display:grid; grid-template-columns:repeat\(3,1fr\)/);
});
test('centers plus markers for empty equipment and ability slots', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /aria-label=\{type === "ability" \? "Empty ability slot" : type === "quick" \? "Empty quick slot" : type === "inventory" \? "Empty inventory slot" : "Empty equipment slot"\}>\+<\/span>/);
  assert.match(css, /\.slot_item \{ position:relative;/);
  assert.match(css, /\.slot_item \.empty_slot\{position:absolute;left:50%;transform:translateX\(-50%\);display:grid;place-items:center/);
});
test('keeps panel tabs at the parent content depth beneath UI tooltips', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.tab-control-placement \{ position:absolute; z-index:0;[^}]*pointer-events:none; \}/);
  assert.match(css, /\.ui_tooltip \{ position:absolute; z-index:10000;/);
});
test('matches inventory row spacing to the abilities list', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.view_list,\.slot_group \{ display:grid; gap:\.18rem; \}/);
  assert.match(css, /\.inventory_scroll \{ display:grid; align-content:start; gap:\.18rem; \}/);
});
test('fills unused inventory capacity with empty plus slots', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /const emptySlots = Math\.max\(0, campaign\.player\.inventoryCapacity - campaign\.player\.inventory\.length\)/);
  assert.match(game, /Array\.from\(\{ length: emptySlots \}/);
  assert.match(game, /data-drop-inventory-slot/);
  assert.match(game, /drag\?\.destination\?\.kind === "inventory" && drag\.destination\.index === index/);
  assert.doesNotMatch(game, /data-drop-inventory>/);
});
test('uses the shared card inset for log, equipment, and inventory scrollbars', async () => {
  const css = await readFile(new URL('../src/ui/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.log_scroll,\.slot_scroll,\.inventory_scroll \{ height:100%; min-height:0;[^}]*overflow-y:scroll/);
  assert.doesNotMatch(css, /\.log_scroll,\.slot_scroll,\.inventory_scroll \{[^}]*margin-inline/);
  assert.match(css, /\.log_scroll::-webkit-scrollbar,\.slot_scroll::-webkit-scrollbar,\.inventory_scroll::-webkit-scrollbar/);
});
test('renders transient item drag feedback without intercepting drops', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /describeInventoryDrop/); assert.match(game, /setDragPresentation\(\{ source: current\.source/);
  assert.match(game, /function ItemDragPreview/); assert.match(game, /drag\.source\.kind === "slot" \? "equipment" : drag\.source\.kind === "quick-slot" \? "quick" : "inventory"/); assert.match(game, /<SlotItem type="ability" number=\{drag\.source\.index\}/); assert.match(game, /drag_departure/); assert.match(game, /drag_landing/);
  assert.match(game, /Math\.hypot\(event\.clientX - current\.startX, event\.clientY - current\.startY\) < 6/);
  assert.match(game, /cancelPointerDrag = useCallback\(\(\) => \{ pointerDragRef\.current = null; setPreview\(null\); setDragPresentation\(null\); \}/);
  assert.match(game, /window\.addEventListener\("pointercancel", pointerCancel\)/);
  assert.match(css, /\.item_drag_preview\{[^}]*pointer-events:none/); assert.match(css, /\.item_drag_preview\{[^}]*width:min\(11rem/); assert.match(css, /\.drag_departure/); assert.match(css, /\.drag_landing/);
});
test('dims keyboard inputs while their ability or quick slot is being dragged', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /drag\?\.source\.kind === "ability"/); assert.match(game, /drag\?\.source\.kind === "quick-slot"/); assert.match(game, /<StatusBar[^>]*drag=\{dragPresentation\}/);
  assert.match(css, /\.input-key--unavailable \{ --input-key-color:var\(--slot-disabled-color\)/);
});

test('renders the Stealth stat and level-up chooser from game-rule state', async () => {
  const game = await readFile(new URL('../src/game/Game.tsx', import.meta.url), 'utf8');
  assert.match(game, /\["vitality", "strength", "luck", "recovery", "stealth"\]/);
  assert.match(game, /export function LevelUpChooser/);
  assert.match(game, /choose-upgrade/);
  assert.match(game, /Level \{pending\.level\}: Choose a Stat/);
});

test('uses delta values to pulse only when an attribute turns red or green', async () => {
  const [game, css] = await Promise.all(['src/game/Game.tsx', 'src/ui/style.css'].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(game, /export function DeltaValue/);
  assert.match(game, /if \(toneChanged && tone\) setPulseVersion/);
  assert.match(game, /<DeltaValue value=\{value\} tone=\{tone\}/);
  assert.match(css, /\.delta_value_number \{ color:#e8dec4; \}/);
  assert.match(css, /\.delta_value_green \{ color:#76c878; \}/);
  assert.match(css, /\.delta_value_red \{ color:#df6161; \}/);
  assert.match(css, /\.delta_value_pulse \{ animation:delta_value_pulse 300ms ease-out; \}/);
  assert.match(css, /@keyframes delta_value_pulse \{ 0%,100% \{ transform:scale\(1\); \} 50% \{ transform:scale\(2\); \} \}/);
});
