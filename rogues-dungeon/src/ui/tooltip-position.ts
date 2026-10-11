interface Bounds { left: number; right: number; top: number; bottom: number }
export function findTooltipPosition(viewport: Bounds & { originLeft?: number; originTop?: number }, target: Bounds, tooltip: { width: number; height: number }, gap = 8) {
  const localTarget = {
    left: target.left - (viewport.originLeft ?? 0),
    right: target.right - (viewport.originLeft ?? 0),
    top: target.top - (viewport.originTop ?? 0),
    bottom: target.bottom - (viewport.originTop ?? 0),
  };
  const minimumLeft = viewport.left + gap;
  const maximumLeft = Math.max(minimumLeft, viewport.right - tooltip.width - gap);
  const minimumTop = viewport.top + gap;
  const maximumTop = Math.max(minimumTop, viewport.bottom - tooltip.height - gap);
  const centeredTop = (localTarget.top + localTarget.bottom - tooltip.height) / 2;
  const top = Math.max(minimumTop, Math.min(centeredTop, maximumTop));
  const candidates = [
    { left: localTarget.right + gap, top },
    { left: localTarget.left - tooltip.width - gap, top },
  ];
  const candidate = candidates.find(({ left }) => left >= minimumLeft && left <= maximumLeft)
    ?? { left: localTarget.left >= (viewport.left + viewport.right) / 2 ? candidates[1].left : candidates[0].left, top };
  return {
    left: Math.max(minimumLeft, Math.min(candidate.left, maximumLeft)),
    top: candidate.top,
  };
}
