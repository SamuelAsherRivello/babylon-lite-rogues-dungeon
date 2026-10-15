# Spec Delta

## ADDED Requirements

### Requirement: Render the current quest and item states
The Quest card SHALL render the current quest title and its ordered items. It SHALL mark the active item with an arrow, render complete items crossed out, and render a completed quest’s crossed-out items without an active arrow.

#### Scenario: Display an in-progress quest
- **WHEN** My First Quest has an active unfinished item
- **THEN** the card shows its title, all three items, and an arrow only beside the active item

#### Scenario: Display a completed quest
- **WHEN** all My First Quest items are complete
- **THEN** the card shows its title and all three crossed-out items with no active arrow
