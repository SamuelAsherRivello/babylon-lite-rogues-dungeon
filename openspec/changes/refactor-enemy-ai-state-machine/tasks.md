# Tasks

## 1. Persisted AI contracts

- [ ] 1.1 Add the serializable enemy AI state contract and initialize generated enemies as idle; verify TypeScript compilation succeeds.
- [ ] 1.2 Normalize missing or malformed legacy enemy AI state during campaign migration; add focused save/migration tests that preserve enemy position, resources, awareness, and cooldown data.

## 2. Deterministic decision system

- [ ] 2.1 Create the pure enemy AI planner with idle, pursue, attack, and blocked transitions; add focused tests for awareness loss, cooldown gating, cardinal adjacency, and one intent per enemy.
- [ ] 2.2 Route pursue intents through the existing bounded cardinal A* helper; add tests for obstacle routing, unreachable targets, and no diagonal corner cutting.
- [ ] 2.3 Resolve movement intents by stable enemy ID with destination reservations; add tests for contested destinations, occupied cells, and rejected swaps.

## 3. Tactical turn integration

- [ ] 3.1 Replace the inline enemy decision branch with the planner and resolver while retaining existing combat events and death handling; verify `npm test -- --runInBand` passes.
- [ ] 3.2 Apply cooldown only after a successful move or attack; add focused regression coverage proving blocked enemies act when an opened route becomes available on the next player turn.

## 4. Behavioral verification

- [ ] 4.1 Run a focused Edge Playwright check with `?mute=1` that observes an enemy route around a visible blocker and report the result; reserve the full applicable browser suite for finalization.
- [ ] 4.2 Run `npm run compile-all`, `npm test -- --runInBand`, and `npm run lint`; record any unavailable browser capability instead of treating it as a passing check.
