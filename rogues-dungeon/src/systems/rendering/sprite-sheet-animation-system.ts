export type SpriteFrame = Readonly<{
  path: string;
  widthPx: number;
  heightPx: number;
  sheetFrame?: number;
}>;

export type SpriteSource = Readonly<{
  kind: "frames";
  frames: readonly SpriteFrame[];
}> | Readonly<{
  kind: "sheet";
  path: string;
  cellWidthPx: number;
  cellHeightPx: number;
  columns: number;
  rows: number;
  frameCount?: number;
}>;

export type SpriteAnimationDefinition = Readonly<{
  name: string;
  source: SpriteSource;
  frameDurationMs: number;
  loopCount: number;
}>;

export type SpriteAnimationSummary = Readonly<{
  name: string;
  frameCount: number;
  frameDurationMs: number;
  loopCount: number;
  frames: readonly SpriteFrame[];
}>;

export type SpriteAnimationState = Readonly<{
  animation: string;
  speed: number;
  frameIndex: number;
  frame: SpriteFrame;
  playing: boolean;
  completed: boolean;
  loopsCompleted: number;
}>;

export type SpriteSheetAnimationEntity = Readonly<{
  listAnimations(): readonly SpriteAnimationSummary[];
  selectAnimation(name: string, restart?: boolean): void;
  start(): void;
  stop(): void;
  update(deltaMs: number): void;
  getSpeed(): number;
  setSpeed(speed: number): void;
  getState(): SpriteAnimationState;
  dispose(): void;
}>;

function positiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) throw new RangeError(`${label} must be a positive integer`);
  return value;
}

function validateLoopCount(loopCount: number) {
  if (!Number.isInteger(loopCount) || loopCount < -1) throw new RangeError("loopCount must be -1 or a non-negative integer");
  return loopCount;
}

function validateSpeed(speed: number) {
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError("animation speed must be a positive number");
  return speed;
}

function validateFrame(frame: SpriteFrame, index: number) {
  if (!frame.path) throw new Error(`frame ${index} is missing a path`);
  positiveInteger(frame.widthPx, `frame ${index} widthPx`);
  positiveInteger(frame.heightPx, `frame ${index} heightPx`);
  return Object.freeze({ ...frame });
}

function expandSource(source: SpriteSource): readonly SpriteFrame[] {
  if (source.kind === "frames") {
    if (!Array.isArray(source.frames) || source.frames.length === 0) throw new Error("frame source must contain at least one frame");
    return Object.freeze(source.frames.map(validateFrame));
  }
  if (!source.path) throw new Error("sprite sheet is missing a path");
  const columns = positiveInteger(source.columns, "sprite sheet columns");
  const rows = positiveInteger(source.rows, "sprite sheet rows");
  const frameCount = source.frameCount ?? columns * rows;
  if (!Number.isInteger(frameCount) || frameCount <= 0 || frameCount > columns * rows) throw new RangeError("sprite sheet frameCount must fit within its grid");
  const widthPx = positiveInteger(source.cellWidthPx, "sprite sheet cellWidthPx");
  const heightPx = positiveInteger(source.cellHeightPx, "sprite sheet cellHeightPx");
  return Object.freeze(Array.from({ length: frameCount }, (_, sheetFrame) => Object.freeze({ path: source.path, widthPx, heightPx, sheetFrame })));
}

function normalizeAnimation(definition: SpriteAnimationDefinition): SpriteAnimationSummary {
  if (!definition.name) throw new Error("animation name is required");
  if (!Number.isFinite(definition.frameDurationMs) || definition.frameDurationMs <= 0) throw new RangeError(`${definition.name} frameDurationMs must be positive`);
  validateLoopCount(definition.loopCount);
  const frames = expandSource(definition.source);
  return Object.freeze({ name: definition.name, frameCount: frames.length, frameDurationMs: definition.frameDurationMs, loopCount: definition.loopCount, frames });
}

export function createSpriteSheetAnimationEntity(definitions: readonly SpriteAnimationDefinition[], initialAnimation = definitions[0]?.name, options: Readonly<{ speed?: number }> = {}): SpriteSheetAnimationEntity {
  if (!Array.isArray(definitions) || definitions.length === 0) throw new Error("at least one animation is required");
  const animations = new Map<string, SpriteAnimationSummary>();
  for (const definition of definitions) {
    const animation = normalizeAnimation(definition);
    if (animations.has(animation.name)) throw new Error(`duplicate animation: ${animation.name}`);
    animations.set(animation.name, animation);
  }
  if (!initialAnimation || !animations.has(initialAnimation)) throw new Error(`unknown initial animation: ${initialAnimation ?? ""}`);
  let current = animations.get(initialAnimation)!;
  let frameIndex = 0;
  let elapsedMs = 0;
  let loopsCompleted = 0;
  let playing = false;
  let completed = false;
  let disposed = false;
  let speed = validateSpeed(options.speed ?? 1);

  function assertActive() { if (disposed) throw new Error("animation entity is disposed"); }
  function selectAnimation(name: string, restart = true) {
    assertActive();
    const next = animations.get(name);
    if (!next) throw new Error(`unknown animation: ${name}`);
    if (next === current && !restart) return;
    current = next; frameIndex = 0; elapsedMs = 0; loopsCompleted = 0; completed = false;
  }
  function start() { assertActive(); if (!completed) playing = true; }
  function stop() { assertActive(); playing = false; }
  function update(deltaMs: number) {
    assertActive();
    if (!playing) return;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError("deltaMs must be non-negative");
    elapsedMs += deltaMs * speed;
    while (elapsedMs >= current.frameDurationMs && playing) {
      elapsedMs -= current.frameDurationMs;
      if (frameIndex < current.frameCount - 1) { frameIndex++; continue; }
      loopsCompleted++;
      if (current.loopCount !== -1 && loopsCompleted > current.loopCount) { playing = false; completed = true; continue; }
      frameIndex = 0;
    }
  }
  function getSpeed() { assertActive(); return speed; }
  function setSpeed(nextSpeed: number) { assertActive(); speed = validateSpeed(nextSpeed); }
  function getState(): SpriteAnimationState {
    assertActive();
    return Object.freeze({ animation: current.name, speed, frameIndex, frame: current.frames[frameIndex], playing, completed, loopsCompleted });
  }
  function dispose() { disposed = true; playing = false; }
  return Object.freeze({
    listAnimations: () => Object.freeze([...animations.values()]),
    selectAnimation, start, stop, update, getSpeed, setSpeed, getState, dispose,
  });
}
