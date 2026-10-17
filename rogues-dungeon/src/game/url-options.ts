export const MAX_UNSIGNED_32 = 0xffffffff;
export const VALID_SAVE_SLOTS = Object.freeze(["1", "2", "3"]);
export const MAP_FIX_FLAG = "debug-fix-map-autotiled";

function unsignedParam(params: URLSearchParams, name: string, fallback: number | null = null) {
  const value = params.get(name);
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= MAX_UNSIGNED_32 ? number : fallback;
}

function positiveParam<T extends number | null>(params: URLSearchParams, name: string, fallback: T): number | T {
  const value = params.get(name);
  if (value === null || !/^[1-9]\d*$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : fallback;
}

export function parseGameUrlOptions(search = "") {
  const params = new URLSearchParams(search);
  const slotValue = params.get("slot");
  return Object.freeze({
    world: positiveParam(params, "world", 1),
    level: positiveParam(params, "level", 1),
    run: positiveParam(params, "run", 1),
    slot: slotValue !== null && VALID_SAVE_SLOTS.includes(slotValue) ? slotValue : null,
    seed: unsignedParam(params, "seed", unsignedParam(params, "randomSeed")),
    mute: params.get("mute") === "1",
    level1TestMode: params.get("level-1-test-mode") === "true",
    mapFix: params.get(MAP_FIX_FLAG) === "1",
    scenario: params.get("scenario") || null,
    map: params.get("map") || null,
  });
}
