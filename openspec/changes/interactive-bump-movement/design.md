# Design

## Context

The existing turn presentation system owns non-serializable positions. Tactical rules currently resolve move interactions synchronously.

## Decisions

- Keep the shared normal movement-duration constant at 250 ms; derive bump duration as half and apex as half of bump duration.
- Add transient bump and damage-reaction state to presentation. Bumps use an out-and-back path while preserving the campaign grid position.
- Queue qualifying player actions until the bump apex, then dispatch the domain action and prevent new movement input until the return leg ends.
- Sample and render independent position and scale presentation channels so a damage reaction can overlap a bump.

## Risks

- Delayed action dispatch must reject stale targets safely.
- Existing immediate events, floating feedback, coin flights, and enemy turns move to apex timing only for qualifying bump interactions.

## Verification

Focused logic and renderer tests cover target qualification, timing, heading, input lock, scale, and concurrent bump/damage behavior. A muted Edge check confirms visible motion.
