# Spec Delta

## MODIFIED Requirements

### Requirement: Order resource meters consistently
Status SHALL contain Health, Stamina, Offense, Defense, Mana, and XP in that order. Each row SHALL contain an icon and a bar without a visible resource name or numeric label, except XP, which SHALL center `LVL NN` in the bar. The level text SHALL remain legible over both filled and unfilled regions. Accessible resource names and values SHALL remain available.

#### Scenario: Read Resources
- **WHEN** Status is displayed
- **THEN** the six icon-and-bar rows appear in the specified order and XP carries a readable centered `LVL NN` label

### Requirement: Show current resource and attribute maximum
Each non-XP resource SHALL have a maximum set by its matching attribute and a current amount between zero and that maximum. A shared 0-to-99 bar SHALL show a cap marker and fill to the current value; a full resource SHALL reach its cap marker, not necessarily the track end. Ranks 1 through 5 SHALL map to visibly significant markers from about 10 through 50 percent, rank 14 SHALL remain below the track end, and rank 99 SHALL not overflow it.

#### Scenario: Attribute caps Health at 25
- **WHEN** the Health attribute has rank 5 and current Health is full
- **THEN** the fill reaches a cap marker near the midpoint of the track

#### Scenario: Reach current maximum
- **WHEN** a resource reaches its current maximum
- **THEN** normal fill reaches the cap marker and cannot exceed it

## ADDED Requirements

### Requirement: Give Status rows live-value tooltips
Every Status row tooltip SHALL begin with its current and maximum values before its concise explanation. The XP tooltip SHALL begin with level and XP progress toward the next level.

#### Scenario: Inspect Health
- **WHEN** the player hovers or focuses Health at 47 of 50
- **THEN** its tooltip begins `47 / 50` before explaining Health

#### Scenario: Inspect XP
- **WHEN** the player hovers or focuses XP at Level 1 with 32 of 100 XP
- **THEN** its tooltip begins with `Level 01` and `32 / 100 XP` before explaining XP progress
