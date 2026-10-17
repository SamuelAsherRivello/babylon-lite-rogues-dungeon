# Spec Delta

## ADDED Requirements

### Requirement: Create before occupying an empty Saved Game
Selecting an empty Saved Game SHALL open Create Character instead of immediately creating a campaign. The window SHALL show an idle player preview, a compact character profile, all ten attribute values, Roll, Confirm, and close controls. Closing it SHALL leave the Saved Game empty; confirmation SHALL persist the generated campaign.

#### Scenario: Cancel creation
- **WHEN** the player closes Create Character before confirmation
- **THEN** the player returns to the main menu and the selected Saved Game remains empty

#### Scenario: Start a new Saved Game
- **WHEN** the player confirms a rolled character sheet
- **THEN** that Saved Game becomes occupied and reload restores its committed character progression

### Requirement: Migrate stored progression safely
Supported legacy campaigns SHALL migrate to the ten-attribute, capped progression model without deleting original stored data. Existing level and partial XP SHALL be retained within their valid ranges, missing attributes SHALL receive valid minimum values, and obsolete forced-upgrade state SHALL not block play.

#### Scenario: Resume a pre-progression campaign
- **WHEN** a valid earlier campaign is selected
- **THEN** it loads with valid attributes, level, XP, and unspent Attribute Points and can be saved again
