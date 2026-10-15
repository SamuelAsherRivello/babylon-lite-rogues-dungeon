# source-organization-standards Specification

## Purpose

Provide a small, discoverable source organization that separates reusable React UI from project content and gives template users clear conventions without imposing a framework or renderer.

## Requirements

### Requirement: Separate UI and content responsibilities
The starter SHALL place reusable React components, layout logic, styles, and UI-only helpers under `project-name/src/ui/`. Project content and future canvas or renderer integration entry points SHALL live under `project-name/src/content/`.

#### Scenario: Consumer adds canvas content
- **WHEN** a consumer adds Babylon, another renderer, or custom canvas content
- **THEN** the content entry point has an obvious location under `src/content/` while the existing UI remains under `src/ui/`

### Requirement: Provide a starter UI template component
The starter SHALL include a discoverable template component under `project-name/src/ui/` that demonstrates where reusable UI composition belongs without adding renderer behavior.

#### Scenario: Consumer starts a new UI component
- **WHEN** a consumer inspects the UI source directory
- **THEN** they find a starter template component and concise guidance for naming and responsibility boundaries

### Requirement: Keep standards lightweight
The project SHALL document only practical naming, placement, import, and responsibility conventions needed to maintain the UI/content boundary, and SHALL avoid prescribing additional libraries or an elaborate architecture.

#### Scenario: Consumer reads project guidance
- **WHEN** a consumer reads the project standards
- **THEN** they can decide where a new file belongs and how it should depend on the other layer without learning a new framework

### Requirement: Name game UI units consistently
The game UI SHALL use lowercase kebab-case names for component files, component folders, component root selectors, and named CSS descendants. Named descendants SHALL use the BEM `__` separator. The two screen roots SHALL be `menu-screen` and `game-screen`; window roots SHALL include `main-menu-window`, `settings-window`, and `level-up-window`.

#### Scenario: Locate a rendered UI unit
- **WHEN** a developer inspects a game screen, window, panel, or view
- **THEN** its lowercase-kebab-case file, root selector, and named descendant selectors identify the same unit

#### Scenario: Inspect the renderer views
- **WHEN** a developer inspects the main dungeon renderer or its minimap renderer
- **THEN** they find `world-view` and `minimap-view` names that distinguish those rendered views
