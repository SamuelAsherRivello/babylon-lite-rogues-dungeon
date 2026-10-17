# Design

## Context

See `proposal.md` for motivation. `TurnPresentationSystem` stores transient enemy grid positions and delayed playback ranks, while the renderer reads the player directly from the committed campaign. `TweenAnimationSystem` already provides cancellable numeric tweens with `easeOutCubic` as its default easing.

## Goals / Non-Goals

**Goals:**

- Keep campaign state, turn resolution, save timing, and input acceptance synchronous and authoritative.
- Give the renderer shared transient positions for every moving character.
- Preserve enemy rank ordering and its delayed starts while each actual movement lasts 250 milliseconds.
- Have Center, Deadzone, and Screen camera modes frame from the player's shared transient position without changing their mode-specific policies.

**Non-Goals:**

- Do not add movement rules, change grid coordinates, or delay input.
- Do not change idle, run, attack, or death animation selection.
- Do not persist fractional positions or add a renderer fallback.

## Decisions

### Maintain a renderer-only character motion state

Extend the existing presentation system with a player entry and actor entries that hold their current displayed fractional position, target grid position, and optional scheduled start. The campaign remains the only source of logical positions. This extends the existing transient presentation boundary rather than adding timing to game rules or saves.

`SUB_GRID_MOVEMENT` is a static boolean in the presentation system. It defaults to `true`; setting it to `false` bypasses fractional motion and uses committed grid positions without adding a player preference or changing campaign data.

### Retarget from the sampled visual position

When a later accepted action updates a character's destination, sample that character at the current frame time, cancel its current movement, and begin a new 250 millisecond `easeOutCubic` tween from the sampled point. A newly resolved turn replaces pending starts and active movement targets for every affected character. Snapping to the prior target would violate responsive input and show stale motion.

### Preserve enemy playback ordering

Keep the established rank assignment and delayed enemy starts. For N visible moved enemies, assign starts at `index * 1000 / N` milliseconds. Replace each enemy's snap at its start with a 250 millisecond tween. Player movement begins when its accepted move commits. The one-second window constrains starts only, so a tween that begins near the end may finish later.

### Render one shared position in views and camera policies

The main view and minimap query the same presentation system each frame for player and actor coordinates. The main view also supplies the player's sampled coordinate to `getCameraCenter`, so Center continuously follows it while Deadzone and Screen apply their existing boundary and page policies to that same coordinate. Terrain, logical grid state, UI state, and saves remain non-transient.

## Risks / Trade-offs

- [A retarget occurs during an active tween] -> Sample before replacing its target so the sprite has no visible jump.
- [An actor dies or the floor changes during motion] -> Remove the transient entry or reset the presentation state before rendering the next frame.
- [Many enemy tweens overlap a later turn] -> Keep the existing delayed start order and accept input without blocking the game loop.
- [Camera retargets during player travel] -> Derive the next camera center from the sampled player coordinate so no mode snaps to an obsolete grid cell.

## Migration Plan

1. Add focused motion-state tests before changing renderer placement.
2. Extend presentation state and render fractional player and actor positions in both views.
3. Run focused Node tests, then one muted Playwright movement check.
4. Roll back by restoring direct grid placement and the existing snap playback. Campaign saves remain compatible because movement state is not serialized.
