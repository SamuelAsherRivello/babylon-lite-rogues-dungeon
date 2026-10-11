export const RANDOM_SEED_PARAMETER = "randomSeed";
const MAX_RANDOM_SEED = 0xffffffff;

/** Return a valid unsigned 32-bit campaign seed from a URL query string. */
export function randomSeedFromSearch(search = "") {
  const value = new URLSearchParams(search).get(RANDOM_SEED_PARAMETER);
  if (value === null || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const seed = Number(value);
  return Number.isSafeInteger(seed) && seed <= MAX_RANDOM_SEED ? seed : null;
}
