# pixel-game-presentation Specification

## Purpose

Defines a readable, crisp landscape game presentation and consistent keyboard, mobile, and zoom controls for the dungeon experience.

## Requirements

### Requirement: Render native-size pixel artwork
The world SHALL use Pixel Perfect rendering with nearest sampling and 32 by 32 source tiles. Zoom SHALL offer 0.25, 0.5, 1, 2, and 4, defaulting to 1 without a saved preference. Region resizing SHALL NOT alter the selected world scale.

#### Scenario: Native zoom
- **WHEN** Zoom 1 is selected
- **THEN** each tile occupies 32 by 32 CSS pixels, with display density handled independently

#### Scenario: Change zoom
- **WHEN** the player selects another Zoom preset
- **THEN** tile display size changes by that factor with crisp sampled edges

### Requirement: Support eight-way keyboard movement
The game SHALL accept WASD and arrow keys as equivalent movement controls, including diagonal movement from paired direction keys.

#### Scenario: Move with keyboard
- **WHEN** the player presses a cardinal or diagonal keyboard direction
- **THEN** one corresponding grid movement request is sent

### Requirement: Provide mobile eight-way movement
Portrait SHALL render cardinal movement buttons, ability buttons 1–4, Sneak, and both information panels in the lower content area. The statusbar SHALL provide Control and Info buttons. Control SHALL be selected by default and show the mobile controls; Info SHALL show the information panels in the bottom area. These controls SHALL use the same game action rules as keyboard input. The previous eight-way controller, diagonal buttons, and Brace button SHALL be removed.

#### Scenario: Move with virtual controller
- **WHEN** the player presses a cardinal arrow
- **THEN** one corresponding movement request is sent

#### Scenario: Activate a mobile ability
- **WHEN** the player presses an available numbered ability button
- **THEN** the ability currently assigned to that position is requested

### Requirement: Display turn and game status
The titlebar SHALL show the title `Dungeon Roguelite (DR)`, world, Dungeon Level, Time, keys, and gold; the secondary panel SHALL show Minimap, Quest, and Log; and the primary panel SHALL show Resources, Attributes, Abilities, Slots, and Inventory. Statusbar content SHALL be vertically centered within its region. Difficulty SHALL remain hidden. A level-up selection SHALL appear in a modal window while an upgrade choice is pending. Item-decision overlays SHALL be removed.

#### Scenario: Show turn counter
- **WHEN** an accepted action advances one time unit
- **THEN** the visible Time counter increases once

#### Scenario: Show Dungeon Level without Difficulty
- **WHEN** the game is running
- **THEN** the titlebar shows the current Dungeon Level and does not show Difficulty

#### Scenario: Complete a dungeon
- **WHEN** the player enters the next dungeon
- **THEN** World remains One and Dungeon Level advances from N to N+1

#### Scenario: Align statusbar content
- **WHEN** the landscape shell is shown
- **THEN** the control legend and developer content are vertically centered within the statusbar

#### Scenario: Choose a level-up stat
- **WHEN** a player has a pending level-up choice
- **THEN** the game displays a modal level-up window until the player selects one option

### Requirement: Scale interface typography consistently with browser zoom
All interface text SHALL respond consistently to browser zoom while the world retains its selected game Zoom. Browser zoom, shell fitting, and fullscreen SHALL not change the stored game Zoom or add template corner text.

#### Scenario: Zoom the browser page
- **WHEN** browser zoom changes
- **THEN** interface typography scales consistently and the selected game Zoom remains unchanged

### Requirement: Keep the HUD readable and spaced
The HUD SHALL retain compact readable text, visible spacing, and distinct labels/values. Titlebar, cards, controls, and slot rows SHALL remain within the shell without overlap or page scrolling. Only Log, Slots, and Inventory SHALL have vertical scrolling regions and SHALL always display scrollbar tracks.

#### Scenario: Read the HUD at default browser zoom
- **WHEN** a supported landscape or portrait layout is shown at 100% browser zoom
- **THEN** all card titles and controls remain readable without overlap, with only the three named areas scrolling

#### Scenario: Narrow viewport from browser zoom
- **WHEN** browser zoom reduces available CSS width
- **THEN** text and controls reflow within their regions while preserving the scrollbar policy and access to gameplay

### Requirement: Support landscape and portrait game aspects
The game SHALL support fitted 16:9 landscape and 9:16 portrait shells. It SHALL automatically select landscape on PC and portrait on mobile, independent of window shape. A PC-only developer override SHALL switch the complete shell between both aspects without changing gameplay state and SHALL not be available as a player preference.

#### Scenario: Render on mobile
- **WHEN** the game opens on a mobile platform
- **THEN** it uses the portrait 9:16 layout automatically

#### Scenario: Render on PC
- **WHEN** the game opens on a PC
- **THEN** it uses the landscape 16:9 layout automatically, including in a tall desktop window

#### Scenario: Preview either aspect on PC
- **WHEN** a developer changes the Aspect setting on PC
- **THEN** the entire shell switches between landscape and portrait while campaign, time, camera, and Zoom stay unchanged

### Requirement: Size Command Desk landscape regions
The titlebar (1) and statusbar (2) SHALL each occupy 4% of shell height. Their contents SHALL be vertically centered. The middle SHALL contain the game view (3), secondary panel (4), and primary panel (5), with panels 4 and 5 each using 22% of shell width. Region 3 SHALL fill remaining space after region boundaries and internal spacing.

#### Scenario: Resize landscape shell
- **WHEN** the fitted shell changes dimensions
- **THEN** regions retain those percentages and the game view fills the residual space without rescaling its tiles

### Requirement: Keep the portrait lower area available without tabs
Portrait SHALL use shell rows of 4% titlebar, 46% game view, 4% statusbar, and 46% bottom content. Titlebar and statusbar contents SHALL be vertically centered. The statusbar SHALL contain Control and Info buttons; the bottom SHALL show either the mobile controls or information panels according to that selection, with Control selected initially.

#### Scenario: Scroll to mobile information
- **WHEN** the player scrolls the portrait lower area below the visible controls
- **THEN** both information panels are available without tabs or a change to game state, time, camera, or Zoom

### Requirement: Arrange titlebar controls and counters
The titlebar SHALL order title, centered World/Dungeon Level space, Time/Keys/Gold, Zoom, Camera, Fullscreen, and Settings. Zoom, Camera, and Settings SHALL have icons without text labels, retaining accessible names and dropdown values. Dividers SHALL NOT appear between Time/Keys/Gold or Camera/Fullscreen/Settings.

#### Scenario: Read the titlebar
- **WHEN** the game is running
- **THEN** World/Dungeon Level is centered between title and Time, Settings is at the far right, and the counters have no separating divider lines

### Requirement: Render bordered cards and plain Quest
Each panel card SHALL have a border with its title interrupting the top edge, left aligned by default. The secondary panel SHALL order minimap, Quest, Log; the primary panel SHALL order Resources, Attributes, Abilities, Slots, Inventory. Quest SHALL show plain active objective text without numbered slots, icons, artwork, or scrolling.

#### Scenario: Read the objective
- **WHEN** the active objective is Find the exit
- **THEN** the Quest card displays that text simply, like a Log entry

### Requirement: Show control legend and developer area
Landscape statusbar SHALL show `WASD: Move, C: Sneak, 1234: Abilities` at the left, with Dev Settings and the current Aspect at the right. The developer area SHALL be available only in developer builds or an explicit developer-enabled session, and SHALL not be a player preference. A PC developer SHALL be able to switch the preview between landscape and portrait.

#### Scenario: Play a production session
- **WHEN** developer mode is disabled
- **THEN** no aspect selector or Dev Settings area is shown

#### Scenario: Preview the other aspect
- **WHEN** a developer changes the Aspect setting on PC
- **THEN** the entire shell changes aspect without changing campaign state, time, Zoom, or Camera

### Requirement: Provide Settings and Main Menu flow
Settings SHALL open centered in the shell with a Settings title and vertical actions. It SHALL include Save & Return to Main Menu, plain GitHub source link, and non-clickable root version text, currently v0.0.5. Opening or closing it SHALL not itself tick time or add an independent pause clock.

#### Scenario: Return from Settings
- **WHEN** Save & Return to Main Menu is chosen
- **THEN** the current campaign is saved and the main menu displays 3 Saved Games

#### Scenario: Read version and source
- **WHEN** Settings is open
- **THEN** version is text rather than an action and GitHub has no icon

### Requirement: Retain text events in Log
Game text selected by the Log system SHALL appear only in the scrollable Log, not a separate message strip or direct system notification. Save failures SHALL also retain a persistent error indication when the portrait lower area is scrolled to controls and Log is below the fold. The previous main-menu tagline SHALL be removed.

#### Scenario: Perform successive actions
- **WHEN** the player picks up an item and later completes a dungeon
- **THEN** the Log system projects their domain events into retained text in order, and no standalone status message is displayed

#### Scenario: Legacy message path is removed
- **WHEN** game state previously associated with text such as Iron Sword left behind is processed
- **THEN** it does not render directly in the HUD, and relevant event text appears only if the Log policy selects that event
