# Spec Delta

## Purpose

Make selected world pickups easier to spot through optional, grounded floating motion.

## ADDED Requirements

### Requirement: Configure optional pickup oscillation
The game SHALL support an opt-in vertical oscillation presentation for individual world pickup types. Pickups without that opt-in SHALL retain their existing stationary presentation.

#### Scenario: Present an unconfigured pickup
- **WHEN** a stationary pickup type such as a key, gold, ordinary item, chest, crate, or stairs is visible
- **THEN** its main art remains at its configured stationary anchor

### Requirement: Raise stationary key main art
The game view SHALL render Key main art 8 world pixels above its normal ground anchor while retaining stationary presentation and a grounded shadow at 50% of its normal width and height.

#### Scenario: Present a Key
- **WHEN** a Key is visible in the game view
- **THEN** its main art is 8 pixels above its ground anchor without oscillation
- **AND** its shadow remains at ground contact at 50% of normal width and height

### Requirement: Float restorative potion main art
The game view SHALL smoothly oscillate the main art of Health and Mana potions vertically by 1.5 world pixels above and below its normal rendered anchor over a 2.4-second cycle while the potion remains visible.

#### Scenario: Present a Health Potion
- **WHEN** a Health Potion is visible in the game view
- **THEN** its main art continuously moves smoothly through a vertical range 1.5 pixels above and below its normal anchor over a 2.4-second cycle

#### Scenario: Present a Mana Potion
- **WHEN** a Mana Potion is visible in the game view
- **THEN** its main art continuously moves smoothly through a vertical range 1.5 pixels above and below its normal anchor over a 2.4-second cycle

### Requirement: Keep pickup shadows grounded
An oscillating pickup's shadow SHALL remain at the pickup's normal ground-contact position and narrow in proportion to the main art's upward lift.

#### Scenario: Float a restorative potion
- **WHEN** a visible Health Potion or Mana Potion is oscillating
- **THEN** its shadow does not move vertically with its main art and is narrowest when the main art is highest
