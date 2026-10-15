import type { GameEvent, Preferences } from "../../game/types.ts";
export interface AudioHandle {
  preload?: string;
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
    stairs: `${baseUrl}assets/audio/sfx/stairs.ogg`,
    accepted: `${baseUrl}assets/audio/sfx/ui_accept.ogg`,
    rejected: `${baseUrl}assets/audio/sfx/ui_reject.ogg`,
    ability: `${baseUrl}assets/audio/sfx/ability.ogg`,
  }),
});

const eventCues: Readonly<Partial<Record<string, keyof typeof AUDIO_ASSETS.sfx>>> = Object.freeze({
  "player.moved": "footstep",
  "enemy.defeated": "enemyFall",
  "potion.consumed": "potion",
  "chest.opened": "chest",
  "realm.entered": "stairs",
  "ability.used": "ability",
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
  let preferences = { sfxVolume: 80, musicVolume: 20, muteAll: false };
  let musicAudio: AudioHandle | null = null;
  let lastFootstepAt = -Infinity;
  let warmupComplete = hardMuted;
  let warmup: Promise<void> | null = null;

  const busMuted = (bus: "sfx" | "music") => hardMuted || preferences.muteAll || preferences[`${bus}Volume`] === 0;
  const setPreferences = (value: Partial<Pick<Preferences, "sfxVolume" | "musicVolume" | "muteAll">> = {}) => {
    preferences = {
      sfxVolume: readVolume(value.sfxVolume, 80),
      musicVolume: readVolume(value.musicVolume, 20),
      muteAll: value.muteAll === true,
    };
    if (musicAudio) musicAudio.volume = busMuted("music") ? 0 : preferences.musicVolume / 100;
  };

  const prewarm = () => {
    if (warmup) return warmup;
    if (hardMuted) return Promise.resolve();
    const handles = [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx)].map((src) => createAudio(src));
    warmup = Promise.all(handles.map(warmAudio)).then(() => { warmupComplete = true; });
    return warmup;
  };

  const playCue = (cue: keyof typeof AUDIO_ASSETS.sfx, now = Date.now()) => {
    const src = AUDIO_ASSETS.sfx[cue];
    if (!src || !warmupComplete || busMuted("sfx")) return false;
    if (cue === "footstep") {
      if (now - lastFootstepAt < 140) return false;
      lastFootstepAt = now;
    }
    const audio = createAudio(src);
    audio.preload = "auto";
    audio.volume = preferences.sfxVolume / 100;
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
    if (!warmupComplete || busMuted("music")) return false;
    if (musicAudio) return true;
    const tracks = AUDIO_ASSETS.music;
    const index = Math.min(tracks.length - 1, Math.max(0, Math.floor(random() * tracks.length)));
    musicAudio = createAudio(tracks[index]);
    musicAudio.preload = "auto";
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
