# Sprite-Sheet Animation System

`src/systems/animation/sprite-animation-system.ts` provides renderer-neutral playback for image-based animations used by characters, props, effects, and other sprites.

An animation entity registers named animations and exposes:

- `listAnimations()` for names and frame metadata.
- `selectAnimation(name)` to choose a sequence.
- `start()` and `stop()` for playback control.
- `update(deltaMs)` to advance frames.
- `getSpeed()` and `setSpeed(speed)` for the playback multiplier; `1` is normal speed and `0.5` takes twice as long to advance each frame.
- `getState()` for the current animation, speed, frame, playing state, completion, and completed loop count.
- `dispose()` for lifecycle cleanup.

Each animation can use either a grid-based sprite sheet or an ordered list of individual image frames. `loopCount` is the number of additional repeats: `-1` loops forever, `0` plays once, and `N > 0` plays `N + 1` complete sequences.

The entity owns visual playback state only. Its owning actor or renderer remains responsible for world position, collision, gameplay state, and disposal. The Hero Warrior catalog uses this system for `Idle`, `Run`, `Attack`, and `Death`; the player presentation starts with right-facing `Idle/Side` at speed `0.5`, while action-animation triggers remain available for later gameplay integration.

The player character and other characters also keep a cardinal movement heading (`n`, `s`, `e`, or `w`). Artwork is authored facing right by default. A west (`w`) heading sets the renderer's horizontal mirror; north, south, and east headings use the authored orientation.

## Sub-grid movement compatibility

`src/systems/animation/turn-presentation-system.ts` owns the short, eased visual transition between accepted grid turns. It is deliberately separate from sprite-sheet frame playback: an object can have one, both, or neither.

The current sub-grid mover list is:

- Player character.
- Enemies, including rats and skeletons.
- Pushable barrels in a Floor Trigger Door Barrel Set.

These are the objects whose logical tile coordinates can change during an accepted turn. A barrel uses the same 250 ms transition as the player push that moved it, so the two remain visually synchronized.

Grid-aligned, state-changing objects do not enter this list: terrain and walls; floor triggers; doors; pickups, chests, and stairs; torches, traps, decorations; particles; and UI effects. A trigger and door instead redraw their active/open frame as the domain state changes.

The Floor Trigger Door Barrel Set's trigger uses the three-frame third row of `props-animated.png` (tiles 14 through 16). It holds tile 14 while off. Once occupancy activates the linked door, it plays tiles 14, 15, and 16 once, then holds tile 16 while on. Leaving the trigger immediately returns it to tile 14; its animation is visual only, while door traversal still follows the resolved domain state.

Camera motion is also separate. `camera-animation-system.ts` animates the shared game-view camera transform for camera-only feedback such as player damage. Camera following derives its center from the presented player position, but it is not a movable world object and does not participate in sub-grid collision or turn playback.
