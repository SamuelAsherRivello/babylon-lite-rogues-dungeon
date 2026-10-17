import { useEffect, useRef, useState } from "react";
import type { AttributeName, Attributes } from "../types.ts";
import { attributeLabels, progressionStatNames } from "../../systems/procedural/world-procedural-system.ts";
import { Tooltip } from "../../ui/Tooltip.tsx";
import { GameCard, type PanelPopup } from "../cards/game-card.tsx";

const columns = [progressionStatNames.slice(0, 5), progressionStatNames.slice(5)] as const;
export const attributeHelp: Record<AttributeName, string> = {
  health: "Maximum Health; zero ends the run.",
  stamina: "Low Stamina lowers damage.",
  offense: "Attack power after Stamina readiness.",
  defense: "Defense reduces incoming damage.",
  mana: "Maximum Mana for abilities.",
  vitality: "(Not implemented.)",
  strength: "(Not implemented.)",
  luck: "Improves loot quality.",
  recovery: "Adds Stamina restored per move.",
  stealth: "(Not implemented.)",
};

export function DeltaValue({ value, tone = "" }: { value: number; tone?: "" | "green" | "red" }) {
  const previousTone = useRef(tone);
  const [pulseVersion, setPulseVersion] = useState(0);
  useEffect(() => {
    const toneChanged = previousTone.current !== tone;
    previousTone.current = tone;
    if (toneChanged && tone) setPulseVersion((version) => version + 1);
  }, [tone]);
  return <span className="delta_value"><b key={pulseVersion} className={["delta_value_number", tone && `delta_value_${tone}`, pulseVersion > 0 && "delta_value_pulse"].filter(Boolean).join(" ")}>{value}</b></span>;
}

export type AttributeAdjustments = {
  canDecrease(name: AttributeName): boolean;
  canIncrease(name: AttributeName): boolean;
  onDecrease(name: AttributeName): void;
  onIncrease(name: AttributeName): void;
};

export function AttributePanel({ attributes, preview = null, help = {}, theme = "dark", adjustments }: { attributes: Attributes; preview?: Attributes | null; help?: Partial<Record<AttributeName, string>>; theme?: "light" | "dark"; adjustments?: AttributeAdjustments }) {
  return <div className={`attribute_grid attribute-panel attribute-panel--${theme}`}>{columns.map((column, index) => <div key={index}>{column.map((name) => {
    const value = preview?.[name] ?? attributes[name];
    const tone = value === attributes[name] ? "" : value > attributes[name] ? "green" : "red";
    const label = <span className="attribute_panel__label">{attributeLabels[name]}</span>;
    const valueControl = adjustments ? <span className="attribute_adjustment"><button type="button" aria-label={`Decrease ${attributeLabels[name]}`} disabled={!adjustments.canDecrease(name)} onClick={() => adjustments.onDecrease(name)}>‹</button><DeltaValue value={value} tone={tone} /><button type="button" aria-label={`Increase ${attributeLabels[name]}`} disabled={!adjustments.canIncrease(name)} onClick={() => adjustments.onIncrease(name)}>›</button></span> : <DeltaValue value={value} tone={tone} />;
    return <div className="attribute_item" key={name}>{help[name] ? <Tooltip content={help[name]}><button tabIndex={-1} type="button" className="attribute_tooltip_trigger">{attributeLabels[name]}</button></Tooltip> : label}{valueControl}</div>;
  })}</div>)}</div>;
}

export function AttributesCard({ attributes, preview = null, contentHidden = false, panelPopup, adjustments }: { attributes: Attributes; preview?: Attributes | null; contentHidden?: boolean; panelPopup?: PanelPopup; adjustments?: AttributeAdjustments }) {
  return <GameCard title="Attributes" contentHidden={contentHidden} panelPopup={panelPopup}><AttributePanel attributes={attributes} preview={preview} help={attributeHelp} adjustments={adjustments} /></GameCard>;
}
