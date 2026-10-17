import { useState } from "react";
import type { AttributeName, Campaign } from "../types.ts";
import { Dialog, type DialogCenter } from "../../ui/Dialog.tsx";
import { AttributesCard } from "../panels/attribute-panel.tsx";

export function ProgressionWindow({ campaign, onClose, onConfirm, center }: { campaign: Campaign; onClose(): void; onConfirm(allocation: Partial<Record<AttributeName, number>>): void; center?: DialogCenter | null }) {
  const [draft, setDraft] = useState<Partial<Record<AttributeName, number>>>({});
  const spent = Object.values(draft).reduce((sum, value) => sum + (value ?? 0), 0);
  const remaining = campaign.progression.attributePoints - spent;
  const change = (name: AttributeName, amount: number) => setDraft((current) => {
    const allocated = current[name] ?? 0;
    if (amount < 0) return { ...current, [name]: Math.max(0, allocated - 1) };
    if (remaining <= 0 || campaign.progression.attributes[name] + allocated >= 99) return current;
    return { ...current, [name]: allocated + 1 };
  });
  const preview = { ...campaign.progression.attributes };
  for (const [name, amount] of Object.entries(draft) as [AttributeName, number][]) preview[name] += amount;
  const adjustments = {
    canDecrease: (name: AttributeName) => Boolean(draft[name]),
    canIncrease: (name: AttributeName) => remaining > 0 && campaign.progression.attributes[name] + (draft[name] ?? 0) < 99,
    onDecrease: (name: AttributeName) => change(name, -1),
    onIncrease: (name: AttributeName) => change(name, 1),
  };
  return <Dialog title="Progression" onClose={onClose} className="progression-window" center={center}><div className="progression-window__attributes"><AttributesCard attributes={campaign.progression.attributes} preview={preview} adjustments={adjustments} /></div><p className="body_text">Spend {campaign.progression.attributePoints} Attribute Points.</p><div className="progression-window__actions"><button type="button" disabled={!spent} onClick={() => onConfirm(draft)}>Confirm {spent} Attribute Point{spent === 1 ? "" : "s"}</button><button type="button" onClick={onClose}>Cancel</button></div></Dialog>;
}
