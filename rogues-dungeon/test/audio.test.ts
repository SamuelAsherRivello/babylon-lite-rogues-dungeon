import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { AUDIO_ASSETS, createAudioManager } from '../src/systems/audio/audio-system.ts';

function recorder() {
  const made: { src: string; volume: number; loop: boolean; playCount: number; play(): Promise<void> }[] = [];
  return { made, createAudio(src: string) { const audio = { src, volume: 1, loop: false, playCount: 0, play() { this.playCount++; return Promise.resolve(); } }; made.push(audio); return audio; } };
}

test('query mute prevents audio creation and stays authoritative over preferences', () => {
  const fake = recorder(); const audio = createAudioManager({ search: '?seed=abc&mute=1', createAudio: fake.createAudio });
  audio.setPreferences({ sfxVolume: 100, musicVolume: 100, muteAll: false });
  assert.equal(audio.hardMuted, true); assert.equal(audio.isMuted('sfx'), true); assert.equal(audio.isMuted('music'), true);
  assert.equal(audio.startMusic(), false); assert.equal(audio.playCue('accepted'), false);
  audio.playEvents([{ type: 'player.moved', outcome: 'committed', facts: {} }]);
  assert.equal(fake.made.length, 0);
});

test('prewarming loads the complete catalog while ordinary playback stays available', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  audio.setPreferences({ sfxVolume: 35, musicVolume: 24, muteAll: false });
  assert.equal(audio.playCue('accepted'), true);
  const firstWarmup = audio.prewarm();
  assert.equal(audio.isPrewarmed(), false);
  assert.equal(audio.prewarm(), firstWarmup);
  await firstWarmup;
  assert.equal(audio.isPrewarmed(), true);
  assert.deepEqual(fake.made.map(({ src }) => src), [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx).flatMap((src) => [src, src])]);
  assert.equal(audio.startMusic(), true);
  const music = fake.made[0];
  assert.equal(music.src, AUDIO_ASSETS.music[0]); assert.equal(music.loop, true); assert.equal(music.volume, 0.24);
  assert.equal(audio.playCue('accepted'), true); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.accepted)?.volume, 0.35);
  audio.setPreferences({ sfxVolume: 0, musicVolume: 47, muteAll: false });
  assert.equal(music.volume, 0.47); assert.equal(audio.isMuted('sfx'), true); assert.equal(audio.isMuted('music'), false);
  assert.equal(audio.playCue('accepted'), false);
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: true });
  assert.equal(music.volume, 0); assert.equal(audio.playCue('accepted'), false); assert.equal(audio.isMuted(), true);
});

test('music begins from the activating gesture before preloading completes', () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  assert.equal(audio.isPrewarmed(), false);
  assert.equal(audio.startMusic(), true);
  assert.equal(fake.made[0].playCount, 1);
});

test('committed simulation events map to one cue and rejected events stay quiet', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: false });
  await audio.prewarm();
  audio.playEvents([
    { type: 'player.moved', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'committed', facts: { source: 'wand' } },
    { type: 'resource.changed', outcome: 'committed', facts: { cause: 'enemy-attack' } },
    { type: 'enemy.defeated', outcome: 'committed', facts: {} },
    { type: 'item.collected', outcome: 'committed', facts: {} },
    { type: 'potion.consumed', outcome: 'committed', facts: {} },
    { type: 'chest.opened', outcome: 'committed', facts: {} },
    { type: 'crate.bumped', outcome: 'committed', facts: {} },
    { type: 'realm.entered', outcome: 'committed', facts: {} },
    { type: 'ability.used', outcome: 'committed', facts: {} },
    { type: 'barrel.pushed', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'rejected', facts: {} },
  ]);
  assert.deepEqual(new Set(fake.made.filter(({ playCount }) => playCount > 0).map(({ src }) => src)), new Set([AUDIO_ASSETS.sfx.footstep, AUDIO_ASSETS.sfx.weaponHit, AUDIO_ASSETS.sfx.enemyHit, AUDIO_ASSETS.sfx.enemyFall, AUDIO_ASSETS.sfx.pickupClick, AUDIO_ASSETS.sfx.potion, AUDIO_ASSETS.sfx.chest, AUDIO_ASSETS.sfx.stairs, AUDIO_ASSETS.sfx.ability, AUDIO_ASSETS.sfx.barrelSlide, AUDIO_ASSETS.sfx.crateHit]));
});

test('equipment drop feedback distinguishes accepted and rejected drops', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  await audio.prewarm();
  audio.playDropResult(true); audio.playDropResult(false);
  assert.deepEqual(fake.made.filter(({ playCount }) => playCount > 0).map(({ src }) => src), [AUDIO_ASSETS.sfx.accepted, AUDIO_ASSETS.sfx.rejected]);
  const muted = createAudioManager({ search: '?mute=1', createAudio: fake.createAudio });
  assert.equal(muted.playDropResult(true), false);
});

test('footsteps are rate-limited and bundled audio assets exist', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  await audio.prewarm();
  assert.equal(audio.playCue('footstep', 1000), true); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.footstep)?.volume, 0.2); assert.equal(audio.playCue('footstep', 1050), false); assert.equal(audio.playCue('footstep', 1100), true);
  audio.playCue('key'); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.key)?.volume, 0.4);
  audio.playCue('inventory'); assert.equal(fake.made.find(({ src }) => src === AUDIO_ASSETS.sfx.inventory)?.volume, 0.4);
  const root = new URL('../public/assets/audio/', import.meta.url);
  const docs = await readFile(new URL('../documentation/audio.md', import.meta.url), 'utf8');
  assert.equal(AUDIO_ASSETS.music.length, 3); assert.equal(Object.keys(AUDIO_ASSETS.sfx).length, 16);
  for (const path of [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx)]) {
    await access(new URL(path.replace(/^.*?assets\/audio\//, ''), root));
    assert.ok(docs.includes(path.split('/').at(-1)!), `missing provenance entry for ${path}`);
  }
  assert.match(docs, /Diegetic/); assert.match(docs, /Non-diegetic/); assert.match(docs, /CC0/);
});
