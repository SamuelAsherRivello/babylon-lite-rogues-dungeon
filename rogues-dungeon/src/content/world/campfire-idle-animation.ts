export const CAMPFIRE_IDLE_FRAME_DURATION_MS = 140;

export function campfireIdleFramePaths(baseUrl = "/") {
  return Array.from({ length: 3 }, (_, index) => `${baseUrl}assets/art/custom/campfire-idle-${index + 1}.png`);
}
