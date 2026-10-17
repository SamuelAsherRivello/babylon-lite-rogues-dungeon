export const PICKUP_OSCILLATION_PERIOD_MS = 2400;
export const PICKUP_OSCILLATION_AMPLITUDE_PX = 1.5;
export const PICKUP_SHADOW_MINIMUM_WIDTH = 0.8;

/** Returns a smooth vertical main-art offset without changing a pickup's ground position. */
export function pickupOscillationOffset(timeMs: number, amplitudePx: number, periodMs = PICKUP_OSCILLATION_PERIOD_MS) {
  if (!Number.isFinite(timeMs) || !Number.isFinite(amplitudePx) || !Number.isFinite(periodMs) || amplitudePx <= 0 || periodMs <= 0) return 0;
  return Math.sin((timeMs / periodMs) * Math.PI * 2) * amplitudePx;
}

/** Returns the shadow-width scale for the current upward portion of a pickup's motion. */
export function pickupShadowWidthScale(offsetPx: number, amplitudePx: number) {
  if (!Number.isFinite(offsetPx) || !Number.isFinite(amplitudePx) || amplitudePx <= 0) return 1;
  const lift = Math.max(0, Math.min(1, -offsetPx / amplitudePx));
  return 1 - (1 - PICKUP_SHADOW_MINIMUM_WIDTH) * lift;
}
