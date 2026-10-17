# Tasks

## 1. Tactical bump scheduling

- [ ] 1.1 Keep shared 250 ms movement timing and add a transient 125 ms out-and-back player bump with a 62.5 ms apex; preserve attempted heading and lock movement input until its return completes.
- [ ] 1.2 Defer enemy melee, closed-crate, and unopened-chest interactions to the bump apex; keep walls, pickups, traps, stairs, and other blocked cells visually still; add focused tactical tests.

## 2. Damage presentation

- [ ] 2.1 Add a transient 250 ms 100%-90%-100% main-sprite damage scale reaction and render it independently from positional motion; add focused presentation and renderer tests for concurrent bump and damage.

## 3. Verification

- [ ] 3.1 Add a muted Edge Playwright check for bump contact and damage reaction, then run focused tests, `npm test`, and `npm run typecheck`.
