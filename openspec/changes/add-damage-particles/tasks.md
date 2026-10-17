# Tasks

## 1. Model and project damage bursts

- [x] 1.1 Add a damage-particle variant with a 250-millisecond duration, 25% tile scale, a stored random direction, half-tile travel, and midpoint opacity; verify focused particle-system tests cover its progress, position, scale, and opacity.
- [x] 1.2 Project every positive `combat.hit` event and each enemy-attack Health loss into four damage particles at the affected position, and clear them with the session lifecycle; verify focused game or projection tests cover player, melee-enemy, and ability-enemy damage.

## 2. Render and verify the effect

- [x] 2.1 Render damage particles at the affected character's world position without changing existing movement or ability particle rendering; verify renderer tests cover scale, opacity, radial position, and ordering.
- [x] 2.2 Run the focused particle and renderer tests, then a muted Edge check that causes damage and confirms the burst appears and disappears after 250 milliseconds; run the applicable full browser suite during finalization. Focused checks, typecheck, and live Edge and in-app renderer checks passed. The full suite was attempted in parallel and sequential modes; unrelated existing Heal-presentation and auto-scroll browser tests failed before the damage-particle code path.
