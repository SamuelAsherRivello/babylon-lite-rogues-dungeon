# Sprite-Sheet Animation System

`src/systems/rendering/sprite-sheet-animation-system.ts` provides renderer-neutral playback for image-based animations used by characters, props, effects, and other sprites.

An animation entity registers named animations and exposes:

- `listAnimations()` for names and frame metadata.
- `selectAnimation(name)` to choose a sequence.
- `start()` and `stop()` for playback control.
- `update(deltaMs)` to advance frames.
- `getState()` for the current animation, frame, playing state, completion, and completed loop count.
- `dispose()` for lifecycle cleanup.

Each animation can use either a grid-based sprite sheet or an ordered list of individual image frames. `loopCount` is the number of additional repeats: `-1` loops forever, `0` plays once, and `N > 0` plays `N + 1` complete sequences.

The entity owns visual playback state only. Its owning actor or renderer remains responsible for world position, collision, gameplay state, and disposal. The Hero Warrior catalog uses this system for `Idle`, `Run`, `Attack`, and `Death`; the current player presentation starts with Idle, while action-animation triggers remain available for later gameplay integration.
