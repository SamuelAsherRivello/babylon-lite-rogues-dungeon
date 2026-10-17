# Tasks

## 1. Campfire animation assets and rendering

- [ ] 1.1 Create or replace the custom campfire art with at least three subdued red, orange, and white 32px frames; verify the files use the project asset convention and remain crisp at Native zoom.
- [ ] 1.2 Load the campfire frames into the Babylon Lite nearest-sampled atlas and cycle them at the 140 ms hero-idle cadence; verify with focused rendering/animation tests that visible campfires loop without changing campaign time.

## 2. Campfire rest interaction

- [ ] 2.1 Add transient campfire-bump selection state that opens the Campfire menu without dispatching a turn; verify a domain/UI-focused test keeps player position and time unchanged on the initial bump.
- [ ] 2.2 Implement the `Rest` button to dispatch the existing wait action and clear the menu; verify exactly one tick and enemy phase occur in focused game tests.
- [ ] 2.3 Clear an unanswered menu before a cardinal move away while retaining normal move acceptance and turn behavior; verify movement-away and blocked-move cases in focused tests.

## 3. In-world popup presentation

- [ ] 3.1 Render the Campfire title, `You may rest one turn` body, and `Rest` button as a pointer-enabled in-world menu; verify accessible labels and button activation in component or browser tests.
- [ ] 3.2 Reuse protected-grid popup positioning for campfire and player cells across camera, zoom, and resize changes; verify placement-helper coverage for valid and unavailable positions.
- [ ] 3.3 Run one focused muted Playwright scenario after the menu implementation that bumps the deterministic campfire, verifies the text/button, confirms Rest, and checks one turn advanced; reserve `npm run test:browser` or `npm run test:browser:full` for finalization coverage.

## 4. Integration verification

- [ ] 4.1 Run `npm test` and `npm run typecheck`; verify all focused and project checks pass with no unrelated changes included.
