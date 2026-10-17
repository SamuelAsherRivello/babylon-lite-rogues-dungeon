# Spec Delta

## MODIFIED Requirements

### Requirement: Present each resolved tactical turn within one second
The game SHALL use a shared 250 ms normal character-movement duration. An interactive bump SHALL use half that duration: 62.5 ms from the player’s center toward the target midpoint and 62.5 ms back to the original center. Normal movement and bump presentation SHALL use the same shared duration source.

#### Scenario: Bump an interactive target
- **WHEN** the player attempts a cardinal move into an adjacent interactive blocked cell
- **THEN** the player visibly reaches the halfway point after 62.5 ms and returns to the original center after another 62.5 ms

### Requirement: Present damage reaction
The game SHALL animate a damaged character’s main sprite from 100% scale to 90% scale and back to 100% over 250 ms. This reaction SHALL run concurrently with other applicable presentation motion.

#### Scenario: Damage at a bump apex
- **WHEN** an enemy receives melee damage at a player bump apex
- **THEN** the enemy’s damage reaction begins on that same frame while the player completes the bump

### Requirement: Keep horizontal bump attackers in front
During a left or right interactive bump, the bumping actor SHALL render in front of the target for the entire bump duration.

#### Scenario: Bump toward a target on the same row
- **WHEN** an actor bumps left or right into an interactive target
- **THEN** the bumping actor renders above the target until the bump completes
