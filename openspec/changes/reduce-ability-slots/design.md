# Design

## Context

The current campaign model creates a four-entry `player.abilities` array,
the React game surface renders all entries, and keyboard handling accepts
`Digit1`–`Digit4` plus compatible `event.key` values. The existing
`player-abilities` and `campaign-saves` specifications define the same
four-position behavior, so both the runtime and their deltas must move
together. See `proposal.md` for the motivation and user-facing scope.

## Goals / Non-Goals

**Goals:**

- Establish one authoritative three-position boundary across campaign state,
  React desktop/mobile controls, drag targets, and keyboard dispatch.
- Make the save loader safely normalize legacy arrays while retaining the
  original stored record for migration failures.
- Keep ability effects, Mana rules, drag feedback, and save-slot behavior
  unchanged apart from the removed position.

**Non-Goals:**

- Do not redesign abilities, add a third ability effect, or change their costs,
  targeting, or turn semantics.
- Do not alter movement keys, sneak/sprint controls, save-slot count, or the
  renderer.

## Decisions

### Use a fixed three-entry binding array

The campaign model will normalize ability bindings to exactly three entries;
new campaigns will initialize with Heal, Wand, and one empty entry. Runtime
validation for activation and reorder actions will accept indexes 0–2 only.
This keeps positional bindings stable and avoids a separate maximum-slot
constant being inferred differently by UI and game rules.

An alternative was to keep four entries and hide the fourth one. That would
leave an invalid input path and stale state in the active model, so it does
not satisfy the removal requirement.

### Restrict input and presentation at every surface

The keyboard handler will match only Digit1–Digit3 and the corresponding
number keys. The status legend and mobile controls will derive/render only
three ability buttons, and the mobile ability grid will use three columns.
React ability rows will be driven by the normalized array, while drag drop
targets and action validation share the same 0–2 boundary.

An alternative was to suppress only the visible key 4. That would allow key 4
to continue activating an ability in non-visible state, so the input guard and
game-rule validation must both enforce the boundary.

### Normalize legacy saves at the persistence boundary

When a saved campaign is read, preserve entries 0–2 and truncate any legacy
entry at index 3 before the state reaches the session or UI. New writes emit
the normalized three-entry array. If the broader save migration fails, retain
the original localStorage value and report the existing unavailable-save
state.

An alternative was to retain a hidden fourth entry for a future feature. That
would make current saves carry behavior the UI cannot expose and complicate
the complete-state contract, so the migration intentionally discards only
the obsolete binding.

### Verification split by layer

Focused Node tests will cover model initialization, rejected index 3 actions,
and legacy save normalization. Source/UI tests will cover the three rendered
rows, legend, and mobile-control structure. One focused Playwright check will
verify that the browser surface shows 1–3, omits 4, and that key 4 does not
trigger an ability; the full existing suite remains a finalization concern.

## Risks / Trade-offs

- [Risk] A legacy save may contain a useful ability only in position 04 →
  [Mitigation] Preserve positions 01–03 and explicitly discard only the
  obsolete fourth binding as the agreed compatibility behavior.
- [Risk] A UI-only change could leave keyboard or drag paths accepting index 3
  → [Mitigation] Apply the same 0–2 boundary in keyboard dispatch, action
  validation, drag targets, and focused tests.
- [Risk] Existing source-level tests assert four rows/keys → [Mitigation]
  Update only ability-related expectations and run the focused Node suite plus
  one browser check after implementation.

## Migration Plan

1. Update campaign creation, action validation, save normalization, and React
   surfaces as one implementation group.
2. Load a legacy campaign fixture containing a fourth ability and verify that
   the first three entries survive while the fourth is removed.
3. Run focused unit/source tests and the single Playwright browser check.
4. If rollback is required, revert the runtime change; unchanged localStorage
   records remain available because migration reads do not overwrite the
   original until a normalized state is successfully saved.

## Open Questions

None. The slot count, key range, and legacy-save behavior were resolved during
the planning interview.
