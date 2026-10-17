export function getInitializationMessage(webGpuAvailable: boolean, error?: unknown) {
  const reason = String((typeof error === "object" && error !== null && "message" in error ? error.message : undefined) ?? error ?? "");
  if (!webGpuAvailable || /#47\b|webgpu.*(?:not available|unsupported)|adapter.*(?:not available|unsupported|not found)/i.test(reason)) {
    return "Babylon Lite requires WebGPU. Enable WebGPU or use a compatible browser and device.";
  }
  if (/render.?target|allocat(?:e|ion)|out of memory|device lost|texture.*(?:limit|dimension|memory)/i.test(reason)) {
    return "Babylon Lite could not allocate the selected render resolution. Choose a smaller resolution or viewport, then check the browser console for details.";
  }
  return "Rendering error. Check the browser console for details.";
}
