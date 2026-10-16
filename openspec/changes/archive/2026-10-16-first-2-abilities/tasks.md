# Tasks

## 1. Deterministic delayed ability resolution

- [x] 1.1 Add pending Heal and locked-target Wand action data plus an explicit completion action in the game rules; verify focused game tests prove Mana commits on cast while Health, damage, time, and enemy actions wait for completion.
- [x] 1.2 Resolve pending Heal at completion and Wand against its locked enemy ID, with harmless missing-target completion; verify focused tests cover restoration cap, target movement, target removal, and exactly one tick.
- [x] 1.3 Update action/session dispatch so ability completion is scheduled from the real-time presentation lifetime and timers are cleared on session exit; verify a focused test covers cleanup and overlapping pending casts.

## 2. Ability particles and cooldown feedback

- [x] 2.1 Extend the particle-effect contract for purple Heal scaling and player-relative depth plus Wand source-to-live-target interpolation using smoke-poff frames; verify particle-system tests cover Heal's 30%-faster 120-to-360% scale, 50% Wand scale, and position interpolation.
- [x] 2.2 Render ability particles in Babylon Lite with purple tint and live locked-target lookup while retaining existing movement smoke behavior; verify renderer-focused tests or static assertions cover the effect variants.
- [x] 2.3 Add independent one-second real-time Heal and Wand cooldown gates and visible ability-button cooldown feedback without blocking other actions; verify focused UI/session tests cover same-ability rejection and cross-ability or movement acceptance.

## 3. Integrated verification

- [x] 3.1 Run the focused Node test groups for game rules, particle effects, and ability UI; verify all selected tests pass.
- [x] 3.2 Complete one muted browser verification that activates Heal and Wand, observes the purple presentation and cooldown behavior, and verifies ordinary input remains available; the user manually confirmed this behavior after the automated Playwright server startup blocker.
