export const STAIR_DESCENT_STEP_COUNT = 10;
export const STAIR_DESCENT_STEP_DURATION_MS = 200;
export const STAIR_DESCENT_STEP_DELAY_MS = STAIR_DESCENT_STEP_DURATION_MS * 2;
export const STAIR_DESCENT_STEP_INTERVAL_MS = STAIR_DESCENT_STEP_DURATION_MS + STAIR_DESCENT_STEP_DELAY_MS;
export const STAIR_DESCENT_DURATION_MS = STAIR_DESCENT_STEP_COUNT * STAIR_DESCENT_STEP_DURATION_MS + (STAIR_DESCENT_STEP_COUNT - 1) * STAIR_DESCENT_STEP_DELAY_MS;
export const STAIR_DESCENT_NET_STEP_PX = 20;
export const STAIR_DESCENT_UPWARD_PX = 5;
// The top of the hero's main PNG begins 26 pixels above the stair-cell origin.
// The first foreground tile begins 32 pixels below it, so its top edge passes
// below the mask once the descent has advanced more than 58 pixels.
export const STAIR_DESCENT_MASK_CROSSING_OFFSET_PX = 58;

/** A five-pixel lift followed by a twenty-five-pixel drop, repeated down the stairs. */
export function stairDescentOffset(elapsedMs: number) {
  const elapsed = Math.max(0, Math.min(STAIR_DESCENT_DURATION_MS, elapsedMs));
  const step = Math.min(STAIR_DESCENT_STEP_COUNT - 1, Math.floor(elapsed / STAIR_DESCENT_STEP_INTERVAL_MS));
  const progress = elapsed >= STAIR_DESCENT_DURATION_MS ? 1 : Math.min(1, (elapsed - step * STAIR_DESCENT_STEP_INTERVAL_MS) / STAIR_DESCENT_STEP_DURATION_MS);
  if (progress === 1) return (step + 1) * STAIR_DESCENT_NET_STEP_PX;
  return step * STAIR_DESCENT_NET_STEP_PX - (STAIR_DESCENT_NET_STEP_PX / 2 + STAIR_DESCENT_UPWARD_PX) * Math.sin(Math.PI * progress) + STAIR_DESCENT_NET_STEP_PX * progress;
}

export function stairDescentIsMasked(elapsedMs: number) {
  return stairDescentOffset(elapsedMs) > STAIR_DESCENT_MASK_CROSSING_OFFSET_PX;
}
import type { Direction } from "../../game/types.ts";


export function stairDescentHeading(heading: Direction): Direction {
  return heading === "n" ? "s" : heading;
}
