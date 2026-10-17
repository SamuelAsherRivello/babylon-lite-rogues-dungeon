import { useState } from "react";
import type { AttributeName, Campaign } from "../types.ts";
import { attributeLabels, progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Dialog } from "../../ui/Dialog.tsx";

export function ProgressionWindow({ campaign, onClose, onConfirm }: { campaign: Campaign; onClose(): void; onConfirm(allocation: Partial<Record<AttributeName, number>>): void }) {
  const [draft, setDraft] = useState<Partial<Record<AttributeName, number>>>({});
  const spent = Object.values(draft).reduce((sum, value) => sum + (value ?? 0), 0);
  const remaining = campaign.progression.attributePoints - spent;
  const change = (name: AttributeName, amount: number) => setDraft((current) => {
    const allocated = current[name] ?? 0;
    if (amount < 0) return { ...current, [name]: Math.max(0, allocated - 1) };
    if (remaining <= 0 || campaign.progression.attributes[name] + allocated >= 99) return current;
    return { ...current, [name]: allocated + 1 };
  });
  return <Dialog title="Progression" onClose={onClose} className="progression-window"><p>You have {campaign.progression.attributePoints} Attribute Points.</p><div className="progression-window__attributes">{progressionStatNames.map((name) => <div key={name}><span>{attributeLabels[name]} {campaign.progression.attributes[name]}{draft[name] ? ` + ${draft[name]}` : ""}</span><button type="button" disabled={!draft[name]} onClick={() => change(name, -1)}>−</button><button type="button" disabled={remaining <= 0 || campaign.progression.attributes[name] + (draft[name] ?? 0) >= 99} onClick={() => change(name, 1)}>+</button></div>)}</div><button type="button" disabled={!spent} onClick={() => onConfirm(draft)}>Confirm {spent} Attribute Point{spent === 1 ? "" : "s"}</button></Dialog>;
}
