export type Orientation = "landscape" | "portrait";
export interface Layout { orientation: Orientation; width: number; height: number; label?: string; gutterBackground?: string }
// Change these presets to update the template's supported aspect ratios in one place.
// Layout dimensions are CSS pixels; renderer resolution and DPR belong to a future integration.
export const aspectRatioPresets = Object.freeze({ landscape: Object.freeze({ width: 16, height: 9, label: "16:9" }), portrait: Object.freeze({ width: 9, height: 16, label: "9:16" }) });

export const defaultLayout: Readonly<Layout> = Object.freeze({
  orientation: "landscape",
  ...aspectRatioPresets.landscape,
});

const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i;
export function classifyPlatform({ userAgentDataMobile, userAgent = "" }: { userAgentDataMobile?: boolean; userAgent?: string } = {}) {
  if (userAgentDataMobile === true || mobileUserAgent.test(userAgent)) return "mobile";
  return "pc";
}
export function layoutForPlatform(platform: string, developerAspect: Orientation | null = null) {
  const orientation = platform === "mobile" ? "portrait" : developerAspect === "portrait" ? "portrait" : "landscape";
  return Object.freeze({ orientation, ...aspectRatioPresets[orientation] });
}

export function validateLayout(layout: Layout) {
  const { width, height, orientation } = layout;
  if (![width, height].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error("Viewport width and height must be finite positive numbers; for example, 16 and 9.");
  }
  if (!((orientation === "landscape" && width > height) || (orientation === "portrait" && height > width))) {
    throw new Error("Rogue's Dungeon layout dimensions must match its named orientation.");
  }
  if (!Number.isFinite(width / height) || width / height <= 0) {
    throw new Error("Viewport ratio is outside the supported numeric range; use smaller ratio dimensions.");
  }
  return layout;
}

export function fitViewport(surfaceWidth: number, surfaceHeight: number, layout: Layout) {
  validateLayout(layout);
  if (![surfaceWidth, surfaceHeight].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error("Browser surface dimensions must be finite nonnegative CSS pixel values.");
  }
  const ratio = layout.width / layout.height;
  const width = Math.min(surfaceWidth, surfaceHeight * ratio);
  const height = width / ratio;
  return { width, height, x: (surfaceWidth - width) / 2, y: (surfaceHeight - height) / 2 };
}
