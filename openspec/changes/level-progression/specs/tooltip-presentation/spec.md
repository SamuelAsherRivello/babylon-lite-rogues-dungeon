# Spec Delta

## ADDED Requirements

### Requirement: Keep Status values readable in UI tooltips
Status tooltips SHALL retain their live-value prefix and concise explanation when displayed by hover or keyboard focus. Their complete text SHALL remain within the application viewport.

#### Scenario: Focus a Status row near an edge
- **WHEN** a player focuses a Status row whose tooltip would extend beyond the viewport
- **THEN** the live-value prefix and explanation remain visible within the viewport
