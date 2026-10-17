# Spec Delta

## MODIFIED Requirements

### Requirement: Provide Settings and Main Menu flow
Settings SHALL open centered in the shell with a Settings title and vertical actions. It SHALL include a How To Play action, Save & Return to Main Menu, plain GitHub source link, and non-clickable root version text, currently v0.0.5. Selecting How To Play SHALL open a `How To Play` modal above Settings, with seven topic buttons across its top. Opening or closing either dialog SHALL not itself tick time or add an independent pause clock.

#### Scenario: Open the reference from Settings
- **WHEN** the player selects How To Play from Settings on the main menu or during a game
- **THEN** a `How To Play` dialog opens above Settings and shows the Basics topic initially

#### Scenario: Navigate the reference topics
- **WHEN** the player selects Basics, Combat, Exploration, Items and gear, Abilities and stamina, Progression, or Saving and controls
- **THEN** the dialog marks that topic selected and shows only its corresponding 10 to 100 words of game-specific guidance

#### Scenario: Return to Settings from the reference
- **WHEN** the player closes the How To Play dialog with its close action, backdrop, or Escape key
- **THEN** Settings remains open beneath it and the game state and turn count are unchanged

#### Scenario: Return from Settings
- **WHEN** Save & Return to Main Menu is chosen
- **THEN** the current campaign is saved and the main menu displays 3 Saved Games

#### Scenario: Read version and source
- **WHEN** Settings is open
- **THEN** version is text rather than an action and GitHub has no icon
