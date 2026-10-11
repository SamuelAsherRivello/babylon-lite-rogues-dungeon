import type { Direction } from "./types.ts";
const MOVEMENT_CODES = Object.freeze<Record<string, Direction>>({ KeyW: "n", KeyA: "w", KeyS: "s", KeyD: "e", ArrowUp: "n", ArrowLeft: "w", ArrowDown: "s", ArrowRight: "e" });

// A deliberate initial delay prevents a held input from skipping several tactical turns.
export const WALK_INITIAL_DELAY = 400;
export const WALK_REPEAT_DELAY = 200;
export const SPRINT_INITIAL_DELAY = 250;
export const SPRINT_REPEAT_DELAY = 125;

export function getMoveInitialDelay(sprint: boolean) {
  return sprint ? SPRINT_INITIAL_DELAY : WALK_INITIAL_DELAY;
}

export function getMoveRepeatDelay(sprint: boolean) {
  return sprint ? SPRINT_REPEAT_DELAY : WALK_REPEAT_DELAY;
}

// A modifier added during an already-held movement should use its repeat cadence,
// rather than making the player wait through another initial-held-key delay.
export function getMoveScheduleDelay(sprint: boolean, continuing = false) {
  return continuing ? getMoveRepeatDelay(sprint) : getMoveInitialDelay(sprint);
}

export function getMovementKey(event: { code?: string; key?: string }) {
  const code = MOVEMENT_CODES[event.code ?? ""] ? event.code : event.key === "w" || event.key === "W" ? "KeyW" : event.key === "a" || event.key === "A" ? "KeyA" : event.key === "s" || event.key === "S" ? "KeyS" : event.key === "d" || event.key === "D" ? "KeyD" : event.key === "ArrowUp" ? "ArrowUp" : event.key === "ArrowLeft" ? "ArrowLeft" : event.key === "ArrowDown" ? "ArrowDown" : event.key === "ArrowRight" ? "ArrowRight" : null;
  return code ? { code, direction: MOVEMENT_CODES[code] } : null;
}

export function getLatestMovement(heldMovements: ReadonlyMap<string, { direction: Direction }>, sprintHeld = false) {
  const last = [...heldMovements.values()].at(-1);
  return last ? { direction: last.direction, sprint: sprintHeld } : null;
}
