import type { Action, Campaign, DragSource, DropDestination, EquipmentGroup, Item } from "./types.ts";
import { effectiveAttributes, isQuickSlottableItem, previewEquipment } from "../systems/procedural/world-procedural-system.ts";

export function previewInventoryDrop(campaign: Campaign, drag: DragSource | null, group: EquipmentGroup, index: number, targetItem: Item | null) {
  if (!drag) return null;
  if (drag.kind === "inventory" && drag.item.group === group && !targetItem) return previewEquipment(campaign, drag.item, group, index);
  if (drag.kind === "slot" && drag.group === group && drag.index !== index) {
    const projected = structuredClone(campaign); const slots = projected.player.equipment[group];
    [slots[drag.index], slots[index]] = [slots[index], slots[drag.index]];
    return effectiveAttributes(projected);
  }
  return null;
}

export function resolveInventoryDrop(drag: DragSource | null, destination: DropDestination | null, targetItem: Item | null = null): Action | null {
  if (!drag || !destination) return null;
  if (isQuickSlottableItem(drag.item) && destination.kind === "slot") return null;
  if (destination.kind === "quick-slot") {
    if (drag.kind === "quick-slot") {
      if (drag.index === destination.index || (targetItem && (!isQuickSlottableItem(targetItem) || targetItem.consumableResource !== drag.item.consumableResource))) return null;
      return { type: "move-quick-slot", from: drag.index, to: destination.index };
    }
    if (drag.kind !== "inventory" || !isQuickSlottableItem(drag.item) || (targetItem && (!isQuickSlottableItem(targetItem) || targetItem.consumableResource !== drag.item.consumableResource))) return null;
    return { type: "assign-quick-slot", itemId: drag.item.id, index: destination.index };
  }
  if (destination.kind === "slot") {
    const { group, index } = destination;
    if (drag.kind === "inventory" && drag.item.group === group && !targetItem) return { type: "equip", itemId: drag.item.id, group, index };
    if (drag.kind === "slot" && drag.group === group && drag.index !== index) return { type: "reorder-equipment", group, index: drag.index, other: index };
    return null;
  }
  if (destination.kind === "inventory" && drag.kind === "quick-slot") return { type: "return-quick-slot", index: drag.index };
  if (destination.kind === "inventory" && drag.kind === "slot") return { type: "unequip", group: drag.group, index: drag.index };
  return null;
}

export function describeInventoryDrop(campaign: Campaign, drag: DragSource, destination: DropDestination, targetItem: Item | null = null) {
  const action = resolveInventoryDrop(drag, destination, targetItem);
  if (!action) return null;
  if (destination.kind === "inventory" && (drag.kind === "slot" || drag.kind === "quick-slot")) {
    const quantity = drag.kind === "quick-slot" ? campaign.player.quickSlots?.[drag.index]?.quantity ?? 0 : 1;
    if (campaign.player.inventory.length + quantity > campaign.player.inventoryCapacity) return null;
    if (drag.kind === "quick-slot") return { action, destination, preview: null };
    return { action, destination, preview: previewEquipment(campaign, drag.item, drag.group, drag.index, "unequip") };
  }
  if (destination.kind === "quick-slot") return { action, destination, preview: null };
  return { action, destination, preview: previewInventoryDrop(campaign, drag, (destination as Extract<DropDestination, { kind: "slot" }>).group, (destination as Extract<DropDestination, { kind: "slot" }>).index, targetItem) };
}
