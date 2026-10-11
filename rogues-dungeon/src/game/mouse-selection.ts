import type { Position, SelectedCell } from "./types.ts";
type MouseCampaign = { player: Position; floor: Parameters<typeof findCardinalPath>[0] };
import { findCardinalPath } from "./a-star.ts";

export function getMousePathFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null) {
  if (!selectedCell || !campaign?.player || !campaign?.floor) return null;
  return findCardinalPath(campaign.floor, campaign.player, selectedCell);
}

/** Translate the selected world cell into the first step of its cardinal A* route. */
export function getMouseMovementFromSelectedCell(selectedCell: SelectedCell | null, campaign: MouseCampaign | null, path = getMousePathFromSelectedCell(selectedCell, campaign)) {
  if (!campaign || !selectedCell?.pressed) return null;
  const next = path?.[1];
  if (!next) return null;
  const dx = next.x - campaign.player.x;
  const dy = next.y - campaign.player.y;
  if (!dx && !dy) return null;
  const direction = dx === 1 ? "e" : dx === -1 ? "w" : dy === 1 ? "s" : dy === -1 ? "n" : null;
  if (!direction) return null;
  return { direction, sprint: selectedCell.sprint === true };
}
