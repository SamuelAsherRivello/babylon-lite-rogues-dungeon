import { abilityCatalog } from "../../systems/procedural/world-procedural-system.ts";
import type { Campaign, Item } from "../types.ts";
import { itemDisplayName, itemPresentation, SlotItem, stackInventoryItems, type DragPresentation } from "../game.tsx";

export function ItemDragPreview({ campaign, drag }: { campaign: Campaign; drag: DragPresentation | null }) {
  if (!drag) return null;
  if (drag.source.kind === "ability") {
    const ability = drag.source.item.abilityId ? abilityCatalog[drag.source.item.abilityId] : null;
    return ability && <div className="item-drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type="ability" number={drag.source.index} text={ability.title} icon={ability.icon} cost={ability.manaCost} accentColor="#c0aaff" /></div>;
  }
  const item = drag.source.item as Item;
  const presentation = itemPresentation(item);
  const quantity = drag.source.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.source.index]?.quantity ?? 1 : drag.source.kind === "inventory" ? stackInventoryItems(campaign.player.inventory).find((stack) => stack.item.id === item.id)?.quantity ?? 1 : 1;
  return <div className="item-drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><SlotItem type={drag.source.kind === "slot" ? "equipment" : drag.source.kind === "quick-slot" ? "quick" : "inventory"} text={itemDisplayName(item, quantity)} icon={presentation.icon} cost={presentation.cost} /></div>;
}
