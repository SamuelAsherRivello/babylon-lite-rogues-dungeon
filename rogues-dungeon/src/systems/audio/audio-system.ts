import type { GameEvent, Preferences } from "../../game/types.ts";
export interface AudioHandle {
  preload?: string;
  currentTime?: number;
  volume: number;
  loop: boolean;
  play(): Promise<void> | void;
  load?(): void;
  addEventListener?(type: "canplay" | "error", listener: () => void, options?: { once?: boolean }): void;
  removeEventListener?(type: "canplay" | "error", listener: () => void): void;
}
const baseUrl = import.meta.env?.BASE_URL ?? "/";

export const AUDIO_ASSETS = Object.freeze({
  music: Object.freeze([
    `${baseUrl}assets/audio/music/spooky_dungeon.ogg`,
    `${baseUrl}assets/audio/music/end_dungeon.mp3`,
    `${baseUrl}assets/audio/music/dungeon_04.ogg`,
  ]),
  sfx: Object.freeze({
    footstep: `${baseUrl}assets/audio/sfx/footstep.ogg`,
    weaponHit: `${baseUrl}assets/audio/sfx/weapon_hit.ogg`,
    enemyHit: `${baseUrl}assets/audio/sfx/enemy_hit.ogg`,
    enemyFall: `${baseUrl}assets/audio/sfx/enemy_fall.ogg`,
    potion: `${baseUrl}assets/audio/sfx/potion.ogg`,
    chest: `${baseUrl}assets/audio/sfx/chest.ogg`,
    pickupClick: `${baseUrl}assets/audio/sfx/pickup-click.wav`,
    collect: `${baseUrl}assets/audio/sfx/collect.ogg`,
    key: `${baseUrl}assets/audio/sfx/key.ogg`,
    inventory: `${baseUrl}assets/audio/sfx/inventory.ogg`,
    stairs: `${baseUrl}assets/audio/sfx/stairs.ogg`,
    accepted: `${baseUrl}assets/audio/sfx/ui_accept.ogg`,
    rejected: `${baseUrl}assets/audio/sfx/ui_reject.ogg`,
    ability: `${baseUrl}assets/audio/sfx/ability.ogg`,
    barrelSlide: `${baseUrl}assets/audio/sfx/barrel-slide.wav`,
    crateHit: `${baseUrl}assets/audio/sfx/crate-hit.wav`,
  }),
});

const eventCues: Readonly<Partial<Record<string, keyof typeof AUDIO_ASSETS.sfx>>> = Object.freeze({
  "player.moved": "footstep",
  "enemy.defeated": "enemyFall",
  "potion.consumed": "potion",
  "item.collected": "pickupClick",
  "chest.opened": "chest",
  "crate.bumped": "crateHit",
  "realm.entered": "stairs",
  "ability.used": "ability",
  "barrel.pushed": "barrelSlide",
});

const SFX_VOLUME_MULTIPLIERS: Readonly<Partial<Record<keyof typeof AUDIO_ASSETS.sfx, number>>> = Object.freeze({
  footstep: 0.25,
  key: 0.5,
  inventory: 0.5,
  barrelSlide: 0.45,
  crateHit: 0.5,
});

function readVolume(value: unknown, fallback: number) { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100 ? value : fallback; }
function muteFromSearch(search: string) { return new URLSearchParams(search).get("mute") === "1"; }
function ignoreRejectedPlay(result: Promise<void> | void) { if (result && typeof result.catch === "function") result.catch(() => {}); }
function warmAudio(audio: AudioHandle) {
  audio.preload = "auto";
  const addListener = audio.addEventListener;
  const removeListener = audio.removeEventListener;
  if (!addListener || !removeListener) {
    audio.load?.();
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => {
      removeListener.call(audio, "canplay", finish);
      removeListener.call(audio, "error", finish);
      resolve();
    };
    addListener.call(audio, "canplay", finish, { once: true });
    addListener.call(audio, "error", finish, { once: true });
    audio.load?.();
  });
}

export function createAudioManager({ search = "", createAudio = (src) => new Audio(src), random = Math.random }: { search?: string; createAudio?: (src: string) => AudioHandle; random?: () => number } = {}) {
  const hardMuted = muteFromSearch(search);
  let preferences = { sfxVolume: 80, musicVolume: 1, muteAll: false };
  let musicAudio: AudioHandle | null = null;
  const prewarmedMusic: AudioHandle[] = [];
  const prewarmedSfx = new Map<keyof typeof AUDIO_ASSETS.sfx, AudioHandle[]>();
  const nextSfxHandle = new Map<keyof typeof AUDIO_ASSETS.sfx, number>();
  let lastFootstepAt = -Infinity;
  let warmupComplete = hardMuted;
  let warmup: Promise<void> | null = null;

  const busMuted = (bus: "sfx" | "music") => hardMuted || preferences.muteAll || preferences[`${bus}Volume`] === 0;
  const setPreferences = (value: Partial<Pick<Preferences, "sfxVolume" | "musicVolume" | "muteAll">> = {}) => {
    preferences = {
      sfxVolume: readVolume(value.sfxVolume, 80),
      musicVolume: readVolume(value.musicVolume, 1),
      muteAll: value.muteAll === true,
    };
    if (musicAudio) musicAudio.volume = busMuted("music") ? 0 : preferences.musicVolume / 100;
  };

  const prewarm = () => {
    if (warmup) return warmup;
    if (hardMuted) return Promise.resolve();
    prewarmedMusic.push(...AUDIO_ASSETS.music.map((src) => createAudio(src)));
    for (const [cue, src] of Object.entries(AUDIO_ASSETS.sfx) as [keyof typeof AUDIO_ASSETS.sfx, string][]) {
      // A pair keeps repeated impacts responsive without requiring a cold element.
      prewarmedSfx.set(cue, [createAudio(src), createAudio(src)]);
    }
    const handles = [...prewarmedMusic, ...prewarmedSfx.values()].flat();
    warmup = Promise.all(handles.map(warmAudio)).then(() => { warmupComplete = true; });
    return warmup;
  };

  const playCue = (cue: keyof typeof AUDIO_ASSETS.sfx, now = Date.now()) => {
    const src = AUDIO_ASSETS.sfx[cue];
    if (!src || busMuted("sfx")) return false;
    // Calling play() while an element is still loading is supported by browsers and
    // preserves the user-gesture authorization that unlocked audio. Waiting for
    // canplay here loses that authorization on slower connections.
    prewarm();
    if (cue === "footstep") {
      if (now - lastFootstepAt < 90) return false;
      lastFootstepAt = now;
    }
    const handles = prewarmedSfx.get(cue);
    if (!handles?.length) return false;
    const index = nextSfxHandle.get(cue) ?? 0;
    const audio = handles[index];
    nextSfxHandle.set(cue, (index + 1) % handles.length);
    if (audio.currentTime !== undefined) audio.currentTime = 0;
    audio.volume = preferences.sfxVolume / 100 * (SFX_VOLUME_MULTIPLIERS[cue] ?? 1);
    ignoreRejectedPlay(audio.play());
    return true;
  };

  const playEvents = (events: (Pick<GameEvent, "type" | "facts"> & Partial<GameEvent>)[] = []) => {
    for (const event of events) {
      if (event.outcome === "rejected") continue;
      let cue = eventCues[event.type];
      if (event.type === "combat.hit" && !event.facts?.source) cue = "weaponHit";
      if (event.type === "resource.changed" && event.facts?.cause === "enemy-attack") cue = "enemyHit";
      if (cue) playCue(cue);
    }
  };

  const startMusic = () => {
    if (busMuted("music")) return false;
    // Create and begin the selected track during the input event. Its pending
    // play request will resolve once it has buffered instead of being rejected by
    // autoplay policy after asynchronous preloading completes.
    prewarm();
    if (musicAudio) return true;
    const tracks = AUDIO_ASSETS.music;
    const index = Math.min(tracks.length - 1, Math.max(0, Math.floor(random() * tracks.length)));
    musicAudio = prewarmedMusic[index];
    if (!musicAudio) return false;
    musicAudio.loop = true;
    musicAudio.volume = preferences.musicVolume / 100;
    ignoreRejectedPlay(musicAudio.play());
    return true;
  };

  const playDropResult = (accepted: boolean) => playCue(accepted ? "accepted" : "rejected");

  return Object.freeze({
    hardMuted,
    prewarm,
    isPrewarmed: () => warmupComplete,
    setPreferences,
    startMusic,
    playCue,
    playDropResult,
    playEvents,
    isMuted: (bus: "sfx" | "music" | null = null) => bus ? busMuted(bus) : hardMuted || preferences.muteAll,
  });
}
