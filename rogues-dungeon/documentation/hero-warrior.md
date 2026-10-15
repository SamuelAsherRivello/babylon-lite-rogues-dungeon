# Hero Warrior Animation Mapping

Runtime assets are read from `public/assets/art/vendors/dungeons-and-pixels-v1.4/Characters/Hero_Warrior/Frames/` and are registered through the generic sprite-sheet animation system.

| Animation | Directions | Frames | Dimensions | Loop behavior |
|---|---|---:|---|---|
| Idle | Down, Side, Up | 4 each | 32x48 | Infinite (`loopCount: -1`) |
| Run | Down, Side, Up | 6 each | 32x48 | Infinite (`loopCount: -1`) |
| Attack | Down, Side, Up | 4 each | 32x48 | One play (`loopCount: 0`) |
| Death | None | 6 | 48x48 | One play (`loopCount: 0`) |

The catalog exposes every animation with `Idle/Side` as the player's right-facing start. The renderer must place the bottom center of the active frame on the bottom edge of the player's 32x32 logical grid cell; the upper portion may extend above the cell. Animation playback does not change the player's logical position or collision.

Hero Warrior artwork is authored facing right. The player character starts with an east (`e`) movement heading and uses the default X scale. A successful west (`w`) movement changes the heading and mirrors the artwork on the X axis. North and south headings keep the default horizontal orientation. The same heading concept is available to enemies and future NPCs; a heading records their last successful cardinal movement.

Hero Warrior playback uses animation speed `0.5`, so each frame remains visible twice as long as a generic animation at speed `1`.

The current generated Tiled map contains a `player` object at pixel `(1344, 1344)`, corresponding to cell `(42, 42)`. That object remains a logical placement marker; the Hero Warrior artwork is supplied by the runtime renderer.

The supplied source is the user-provided `Dungeons-and-Pixels-v1.4` pack retained under `public/assets/`. No license or attribution file was found in the supplied pack during inspection, so the project does not assert a license and must confirm required credit before public release.
