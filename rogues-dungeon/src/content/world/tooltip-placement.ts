interface TooltipRect { left: number; top: number; width: number; height: number }
function overlaps(a: TooltipRect, b: TooltipRect) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

/** Find the valid grid candidate closest to the hovered cell center. */
export function findWorldTooltipPosition(viewport: TooltipRect & { right: number; bottom: number }, tooltip: { width: number; height: number }, protectedRects: TooltipRect[], gap = 8) {
  if (tooltip.width > viewport.width - gap * 2 || tooltip.height > viewport.height - gap * 2) return null;
  const centerX = (rect: TooltipRect) => rect.left + rect.width / 2;
  const centerY = (rect: TooltipRect) => rect.top + rect.height / 2;
  const hovered = protectedRects[0];
  const minX = viewport.left + gap; const maxX = viewport.right - tooltip.width - gap;
  const minY = viewport.top + gap; const maxY = viewport.bottom - tooltip.height - gap;
  const xPositions = new Set([minX, maxX]); const yPositions = new Set([minY, maxY]);
  for (const rect of protectedRects) {
    xPositions.add(rect.left - tooltip.width - gap); xPositions.add(rect.left + rect.width + gap);
    yPositions.add(rect.top - tooltip.height - gap); yPositions.add(rect.top + rect.height + gap);
  }
  const candidates = [];
  for (const y of yPositions) for (const x of xPositions) {
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    const rect = { left: x, top: y, width: tooltip.width, height: tooltip.height };
    if (protectedRects.some((protectedRect) => overlaps(rect, protectedRect))) continue;
    candidates.push({ left: x, top: y, distance: hovered ? Math.hypot(centerX(rect) - centerX(hovered), centerY(rect) - centerY(hovered)) : 0 });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.top - b.top || a.left - b.left);
  return candidates[0] ? { left: candidates[0].left - viewport.left, top: candidates[0].top - viewport.top } : null;
}
