# Rogue's Dungeon Audio

Audio files are bundled under `public/assets/audio/`. The Music and SFX buses have independent 0–100 levels and a persisted **Mute All** checkbox in Settings. New preferences default to SFX 80, Music 20, and Mute All off. Zero on either slider silences only that bus.

For silent browser automation and AI sessions, open the app with `?mute=1`, for example:

```text
http://localhost:5173/babylon-lite-rogues-dungeon/?mute=1
```

The query override is checked before playback and silences both buses for the page session even if saved preferences are audible. It does not erase saved player settings. Browsers may wait for a user gesture before allowing music to start.

When the main menu opens, the audio manager begins loading every known music and SFX asset in the background. Gameplay never waits for this work. Until every asset has reached a playable state or reported an error, the manager drops playback requests rather than leaving them pending. Once the catalog has settled, later input can start music and game events can play their cues from the warmed browser cache.

## Diegetic and Non-diegetic Cues

| Type | Event | Asset | Source entry | Intent |
|---|---|---|---|---|
| Diegetic | Player moves one tile | `sfx/footstep.ogg` | `sfx100v2_footstep_01.ogg` | Quiet stone step; rate-limited during held movement |
| Diegetic | Player hits an enemy | `sfx/weapon_hit.ogg` | `sfx100v2_metal_hit_01.ogg` | Brief weapon impact |
| Diegetic | Enemy hits the player | `sfx/enemy_hit.ogg` | `sfx100v2_hit_01.ogg` | Muted impact |
| Diegetic | Enemy is defeated | `sfx/enemy_fall.ogg` | `sfx100v2_hit_02.ogg` | Short defeat cue |
| Diegetic | Potion is collected | `sfx/potion.ogg` | `sfx100v2_glass_01.ogg` | Small glass chime |
| Diegetic | Chest opens | `sfx/chest.ogg` | `sfx100v2_lock_open_01.ogg` | Brief latch sound |
| Diegetic | Player enters stairs to descend | `sfx/stairs.ogg` | `sfx100v2_door_01.ogg` | Stone transition cue |
| Non-diegetic | Compatible equipment drop is accepted | `sfx/ui_accept.ogg` | `sfx100v2_switch_01.ogg` | Quiet confirmation |
| Non-diegetic | Equipment drop is rejected | `sfx/ui_reject.ogg` | `sfx100v2_switch_02.ogg` | Soft rejection tick |
| Non-diegetic | Ability activation succeeds | `sfx/ability.ogg` | `sfx100v2_items_01.ogg` | Brief UI confirmation |

The ten SFX are selected from rubberduck's **100 CC0 SFX #2** pack on [OpenGameArt](https://opengameart.org/content/100-cc0-sfx-2), licensed CC0. The archive is not shipped; only the listed files are included. Original entry names are recorded to make each selection traceable.

## Music Tracks

The game chooses one track per page session and loops that track. Music starts after a user gesture when the browser permits playback. Track selection is intentionally not exposed as another setting.

| Track | Bundled file | Creator | Source and license |
|---|---|---|---|
| Spooky Dungeon | `music/spooky_dungeon.ogg` | Memoraphile / You're Perfect Studio | [OpenGameArt](https://opengameart.org/content/spooky-dungeon); CC0 is listed; tagged loopable and seamless |
| JRPG - End Dungeon | `music/end_dungeon.mp3` | HydroGene | [OpenGameArt](https://opengameart.org/content/jrpg-end-dungeon); CC0; creator states it is loopable |
| Dungeon 04 | `music/dungeon_04.ogg` | Beau Buckley / Fantasy Musica | [OpenGameArt](https://opengameart.org/content/dungeon-04); CC BY-SA 4.0; OGG includes loop metadata; attribution: “Music by Beau Buckley” |

The tracks are free to use under their listed licenses. The Dungeon 04 credit and license are retained here; consult the linked CC BY-SA 4.0 terms for redistribution or adaptation. The page identifies loop intent for every track; listening to the loop boundary and assessing repetition at the in-game default Music level remains a human listening check.
