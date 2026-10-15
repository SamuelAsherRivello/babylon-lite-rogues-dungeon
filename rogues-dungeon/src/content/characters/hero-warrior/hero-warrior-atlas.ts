/** Decode a PNG animation frame into pixels for Babylon Lite's GPU sprite atlas. */
export async function loadSpriteAtlasFrame(path: string) {
  const response = await fetch(path); if (!response.ok) throw new Error(`Could not load sprite frame: ${path}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
  const context = canvas.getContext("2d")!; context.drawImage(bitmap, 0, 0); bitmap.close();
  return { pixels: new Uint8Array(context.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height, name: path };
}

export const loadHeroWarriorAtlasFrame = loadSpriteAtlasFrame;
