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

test('prewarming loads the complete catalog before ordinary playback begins', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio, random: () => 0 });
  audio.setPreferences({ sfxVolume: 35, musicVolume: 24, muteAll: false });
  assert.equal(audio.playCue('accepted'), false);
  const firstWarmup = audio.prewarm();
  assert.equal(audio.isPrewarmed(), false);
  assert.equal(audio.prewarm(), firstWarmup);
  await firstWarmup;
  assert.equal(audio.isPrewarmed(), true);
  assert.deepEqual(fake.made.map(({ src }) => src), [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx)]);
  assert.equal(audio.startMusic(), true);
  const music = fake.made.at(-1)!;
  assert.equal(music.src, AUDIO_ASSETS.music[0]); assert.equal(music.loop, true); assert.equal(music.volume, 0.24);
  assert.equal(audio.playCue('accepted'), true); assert.equal(fake.made.at(-1)?.volume, 0.35);
  audio.setPreferences({ sfxVolume: 0, musicVolume: 47, muteAll: false });
  assert.equal(music.volume, 0.47); assert.equal(audio.isMuted('sfx'), true); assert.equal(audio.isMuted('music'), false);
  assert.equal(audio.playCue('accepted'), false);
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: true });
  assert.equal(music.volume, 0); assert.equal(audio.playCue('accepted'), false); assert.equal(audio.isMuted(), true);
});

test('committed simulation events map to one cue and rejected events stay quiet', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  audio.setPreferences({ sfxVolume: 80, musicVolume: 20, muteAll: false });
  await audio.prewarm();
  const prewarmedCount = fake.made.length;
  audio.playEvents([
    { type: 'player.moved', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'committed', facts: { source: 'wand' } },
    { type: 'resource.changed', outcome: 'committed', facts: { cause: 'enemy-attack' } },
    { type: 'enemy.defeated', outcome: 'committed', facts: {} },
    { type: 'potion.consumed', outcome: 'committed', facts: {} },
    { type: 'chest.opened', outcome: 'committed', facts: {} },
    { type: 'realm.entered', outcome: 'committed', facts: {} },
    { type: 'ability.used', outcome: 'committed', facts: {} },
    { type: 'combat.hit', outcome: 'rejected', facts: {} },
  ]);
  assert.deepEqual(fake.made.slice(prewarmedCount).map(({ src }) => src), [
    AUDIO_ASSETS.sfx.footstep, AUDIO_ASSETS.sfx.weaponHit, AUDIO_ASSETS.sfx.enemyHit,
    AUDIO_ASSETS.sfx.enemyFall, AUDIO_ASSETS.sfx.potion, AUDIO_ASSETS.sfx.chest,
    AUDIO_ASSETS.sfx.stairs, AUDIO_ASSETS.sfx.ability,
  ]);
});

test('equipment drop feedback distinguishes accepted and rejected drops', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  await audio.prewarm();
  const prewarmedCount = fake.made.length;
  audio.playDropResult(true); audio.playDropResult(false);
  assert.deepEqual(fake.made.slice(prewarmedCount).map(({ src }) => src), [AUDIO_ASSETS.sfx.accepted, AUDIO_ASSETS.sfx.rejected]);
  const muted = createAudioManager({ search: '?mute=1', createAudio: fake.createAudio });
  assert.equal(muted.playDropResult(true), false);
});

test('footsteps are rate-limited and bundled audio assets exist', async () => {
  const fake = recorder(); const audio = createAudioManager({ createAudio: fake.createAudio });
  assert.equal(audio.playCue('footstep', 900), false);
  await audio.prewarm();
  assert.equal(audio.playCue('footstep', 1000), true); assert.equal(audio.playCue('footstep', 1100), false); assert.equal(audio.playCue('footstep', 1140), true);
  const root = new URL('../public/assets/audio/', import.meta.url);
  const docs = await readFile(new URL('../documentation/audio.md', import.meta.url), 'utf8');
  assert.equal(AUDIO_ASSETS.music.length, 3); assert.equal(Object.keys(AUDIO_ASSETS.sfx).length, 10);
  for (const path of [...AUDIO_ASSETS.music, ...Object.values(AUDIO_ASSETS.sfx)]) {
    await access(new URL(path.replace(/^.*?assets\/audio\//, ''), root));
    assert.ok(docs.includes(path.split('/').at(-1)!), `missing provenance entry for ${path}`);
  }
  assert.match(docs, /Diegetic/); assert.match(docs, /Non-diegetic/); assert.match(docs, /CC0/);
});
