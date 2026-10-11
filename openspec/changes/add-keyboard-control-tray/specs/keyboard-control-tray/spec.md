# Spec Delta

## Purpose

Provide a discoverable keyboard shortcut surface that remains compact in the
normal HUD and expands into a complete twelve-key visual input panel.

## ADDED Requirements

### Requirement: Show the collapsed keyboard summary
The HUD SHALL show the existing compact bottom status bar plus a centered fold-out tab when the keyboard tray is collapsed.

#### Scenario: Render collapsed tray
- **WHEN** the keyboard tray is collapsed
- **THEN** the bottom status bar shows `Move WASD | Quick: A E | Abilities: 123 | More ZXC` and no expanded panel is visible

### Requirement: Show the expanded twelve-key tray
The HUD SHALL expand the tray into a content-sized compact panel with four unlabeled rows: `1 2 3`, `Q W E`, `A S D`, and `Z X C`, with a normal-sized `Controls` heading centered in the status-bar area directly beneath the key grid.

#### Scenario: Open keyboard tray
- **WHEN** the player activates the fold-out tab
- **THEN** the panel appears above the status bar with all twelve keycaps aligned into consistent columns

### Requirement: Show non-interactive input keys
Each collapsed and expanded key SHALL be rendered by the shared `InputKey` component as a non-interactive visual keycap. Hovering a key SHALL replace the centered `Controls` text with its action description, including `Use ability 1` for `1`, `Move Up` for `W`, and `Use Quickslot 1` for `Q`; leaving the key SHALL restore `Controls` and SHALL NOT create a floating tooltip. Mouse input on keycaps SHALL NOT perform gameplay actions. Defined physical mappings are `W` move up, `A` move left, `S` move down, `D` move right, and `1–3` abilities; temporary physical `Q`, `E`, `Z`, `X`, and `C` controls SHALL log their key press until their actions are defined.

The shared keycaps SHALL support display mode for the status bar and feedback mode for the expanded controls tab. Feedback-mode keycaps SHALL visibly highlight while their physical key is held. All keycaps SHALL use category tinting at approximately 40% opacity for Move, Quick, Abilities, and More.

#### Scenario: Click a visual keycap
- **WHEN** the player clicks the `D` keycap
- **THEN** no gameplay action or world turn occurs

#### Scenario: Press temporary physical key
- **WHEN** the player presses `Q`, `E`, `Z`, `X`, or `C` while the game is active
- **THEN** the key press is logged to the console and no gameplay action or world turn occurs

### Requirement: Animate tray state changes
The tray and its tab SHALL animate between collapsed and expanded positions over 0.25 seconds and SHALL cross-fade the tray content opacity during the same transition.

#### Scenario: Expand with animation
- **WHEN** the player opens the tray
- **THEN** the tab and panel move to the expanded position over 0.25 seconds while panel content fades in

#### Scenario: Collapse with animation
- **WHEN** the player closes the tray
- **THEN** the tab and panel move to the collapsed position over 0.25 seconds while panel content fades out

### Requirement: Keep the tray usable in supported layouts
The tray SHALL remain inside the primary game viewport, keep the tab operable, and remain usable in windowed and fullscreen modes.

#### Scenario: Use tray in fullscreen
- **WHEN** the player toggles fullscreen while the tray is open or closed
- **THEN** the tray remains attached to the bottom status bar, preserves its state, and keeps the fold-out tab and keycaps usable
