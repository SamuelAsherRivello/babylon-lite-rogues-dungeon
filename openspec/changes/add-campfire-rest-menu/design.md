# Design

## Context

See [proposal.md](proposal.md) for motivation and the delta specifications for the behavior contract. Campfires currently load one custom PNG into a Babylon Lite atlas and reject movement in the domain layer. The main world view already owns a React-rendered enemy popup, shared grid-to-screen placement, and camera/zoom recalculation. The domain already exposes an ordinary `wait` action that advances one tactical turn.

## Goals / Non-Goals

**Goals:**

- Keep the rest decision in the React interaction layer while using the existing domain wait action only after confirmation.
- Build campfire art as separately loaded nearest-sampled animation frames and update its atlas frame continuously without changing world state.
- Reuse shared world-popup positioning for a compact actionable menu and keep it synchronized with camera and zoom changes.

**Non-Goals:**

- Healing, cost, consumable fuel, saving, or persistent campfire state.
- A second renderer, a generic interaction-dialog framework, or changes to enemy hover content.
- Replacing the existing explicit Wait controls.

## Decisions

### Keep unconfirmed campfire interaction out of the tactical domain

The renderer/Game UI will remember the campfire selected by a bump and show the menu without dispatching a time-advancing action. Clicking `Rest` dispatches the established `wait` action and clears the selection; a later cardinal move away clears it before normal move processing. This preserves the domain invariant that only accepted actions advance time and avoids serializing transient menu UI in campaign saves.

Alternative considered: add a separate `rest-at-campfire` domain action. It would make the prompt state and cancellation more complex without adding distinct game rules beyond the existing wait action.

### Use a frame atlas and hero idle timing for campfire animation

The custom campfire asset will be split or replaced with at least three subdued-color frame images and loaded into one nearest-sampled sprite atlas. The render loop will choose frames at the hero idle duration (140 ms) modulo frame count. This matches the requested cadence and leaves campaign state unchanged.

Alternative considered: shader tinting or a single-image effect. Neither produces the requested hand-authored multi-frame idle motion or reliably reduces each source color.

### Reuse the existing placement helper for the interactive menu

The menu will use the current protected-rectangle helper with campfire first and player second, matching the enemy popup's frame bounds, resize observer, and camera/zoom dependencies. It receives its own accessible button and permits pointer events, unlike the read-only enemy popup.

Alternative considered: center-screen modal. That would violate the requested in-world behavior and conceal gameplay context.

## Risks / Trade-offs

- [Menu and map pointer events compete] → Stop pointer propagation within the menu and keep the game-view selection handler unchanged outside it.
- [Rapid movement after bump] → Clear the transient selection synchronously before processing a non-campfire cardinal move.
- [Multiple visible campfires] → Allocate and update sprites by visible-object order, as the existing renderer already does, and test deterministic test-mode placement.
- [Small frame has no valid popup slot] → Preserve the existing safe behavior of hiding the panel instead of covering a protected tile.

## Migration Plan

Ship the new image frames with the existing custom art and replace the static campfire load path. Existing saves need no migration because campfire identity and coordinates stay unchanged, and the popup is not persisted. Rollback restores the static asset path and leaves all saved campaigns valid.
