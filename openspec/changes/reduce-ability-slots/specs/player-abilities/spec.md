# Spec Delta

## MODIFIED Requirements

### Requirement: Provide four positional ability bindings
Abilities SHALL contain three positions without group titles. Initially Heal SHALL occupy position 01 and offensive Wand position 02, with 03 empty. Keyboard keys 1–3 and matching mobile buttons SHALL activate the ability in the corresponding position. Key 4 and any fourth position SHALL not activate an ability. Empty positions SHALL not activate an action.

#### Scenario: Activate by position
- **WHEN** the player presses 1 with Heal in position 01
- **THEN** Heal is requested

#### Scenario: Press an empty binding
- **WHEN** the player presses 3 with position 03 empty
- **THEN** no action, Mana cost, message, or world tick occurs

#### Scenario: Press the removed fourth key
- **WHEN** the player presses key 4
- **THEN** no ability action, Mana cost, message, or world tick occurs

### Requirement: Render ability rows and costs
Each populated ability SHALL appear as one full-width horizontal row in the order position number, ability icon, title, plain Mana cost, and drag icon. Filled rows SHALL use the Mana color family. Empty rows SHALL be drop targets with no text. Ability costs SHALL NOT have an additional Mana icon. Exactly three ability rows SHALL be rendered.

#### Scenario: Read Heal row
- **WHEN** Heal occupies position 01
- **THEN** its row reads as `[01] ability-icon Heal mana-cost drag-icon`

#### Scenario: Render the available positions
- **WHEN** the ability panel is displayed
- **THEN** it contains rows 01, 02, and 03, and no row 04

### Requirement: Disable abilities with insufficient Mana
An ability SHALL have a Mana cost. When current Mana is below that cost, its row and mobile activation button SHALL be greyed out and activation SHALL be rejected through all input paths without a message or world tick.

#### Scenario: Reject unaffordable ability
- **WHEN** the player presses a key or mobile button for an ability that costs more Mana than is available
- **THEN** the ability does not activate, Mana stays unchanged, and no user message is shown

### Requirement: Resolve affordable abilities as one action
An accepted ability SHALL deduct its Mana cost, apply its defined effect, and advance one time unit followed by one enemy phase. Heal SHALL restore Health within its maximum, and Wand SHALL provide offensive magic. Effect strength, cost, targeting range, and animation timing SHALL be configurable independently of slot binding.

#### Scenario: Cast an affordable ability
- **WHEN** an ability with a valid effect and target is activated with enough Mana
- **THEN** its cost is deducted once, its effect resolves once, and the world advances once

### Requirement: Reorder ability bindings through drag
The player SHALL be able to move an ability to an empty position or swap populated positions within positions 01–03. A committed reorder SHALL change the positional key bindings and cost one tick. Preview, cancellation, or return to the original position SHALL not change the bindings or time. Position 04 SHALL not be a valid drag destination.

#### Scenario: Move Heal to another key
- **WHEN** Heal is committed from position 01 to position 03
- **THEN** key 3 activates Heal and position 01 becomes empty, with one time increment

#### Scenario: Swap abilities
- **WHEN** Heal and Wand exchange populated positions
- **THEN** their displayed numbers and key bindings exchange without changing their Mana costs

#### Scenario: Reject a fourth-position destination
- **WHEN** a drag attempts to target position 04
- **THEN** the binding order and world time remain unchanged
