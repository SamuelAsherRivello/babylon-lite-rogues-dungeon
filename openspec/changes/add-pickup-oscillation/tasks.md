# Tasks

## 1. Pickup oscillation presentation

- [x] 1.1 Add a pure, time-based vertical oscillation helper in the animation system and focused unit tests that verify its smooth bounded 1.5px offset and 2.4-second cycle.
- [x] 1.2 Add world-pickup presentation metadata, enabling 1.5px oscillation only for Health and Mana potions and a fixed 8px raised anchor with a 50%-width shadow for Keys; verify the sprite-selection tests cover these cases and stationary defaults.
- [x] 1.3 Apply the configured oscillation to game-view pickup main art while preserving the existing potion anchor and ground-contact depth, and narrow the fixed-position shadow as the potion rises; verify with the relevant focused Node tests.

## 2. Browser verification

- [x] 2.1 Run one focused Microsoft Edge Playwright check with `?mute=1` that observes a Health or Mana potion's slower main-art motion and fixed-position narrowing shadow; reserve `npm run test:browser:full` for finalization.
