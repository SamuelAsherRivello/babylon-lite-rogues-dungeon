export const contentConfig = Object.freeze({
  renderer: "babylon-lite",
  style: "2d",
});

export const pixelPerfectOptions = Object.freeze({
  engine: Object.freeze({ msaaSamples: 1 }),
  texture: Object.freeze({
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
    minFilter: "nearest",
    magFilter: "nearest",
    mipMaps: false,
    // Tiled images are authored with their first row at the top. Keep that row
    // at the top in Babylon Lite's top-left Sprite2D world as well.
    invertY: false,
  }),
});

export function getRenderingPolicy({ renderer, style }: { renderer: string; style: string }) {
  if (renderer !== "babylon-lite") return "renderer-specific";
  return style === "2d" ? "pixel-perfect" : style === "3d" ? "performance-scaled-3d" : "renderer-specific";
}
