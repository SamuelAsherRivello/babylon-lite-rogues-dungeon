# Spec Delta

## ADDED Requirements

### Requirement: Name game UI units consistently
The game UI SHALL use lowercase kebab-case names for component files, component folders, component root selectors, and named CSS descendants. Named descendants SHALL use the BEM `__` separator. The two screen roots SHALL be `menu-screen` and `game-screen`; window roots SHALL include `main-menu-window`, `settings-window`, and `level-up-window`.

#### Scenario: Locate a rendered UI unit
- **WHEN** a developer inspects a game screen, window, panel, or view
- **THEN** its lowercase-kebab-case file, root selector, and named descendant selectors identify the same unit

#### Scenario: Inspect the renderer views
- **WHEN** a developer inspects the main dungeon renderer or its minimap renderer
- **THEN** they find `world-view` and `minimap-view` names that distinguish those rendered views
