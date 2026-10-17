import type { ReactNode } from "react";
import { TabControl } from "../../ui/TabControl.tsx";
import { Tooltip } from "../../ui/Tooltip.tsx";

export type PanelPopup = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?(): void;
};

const cardHelp: Partial<Record<string, string>> = {
  Minimap: "Shows explored map and your position.",
  Quest: "Your current objective.",
  Log: "Recent dungeon and combat events.",
  Status: "Tracks Health, Stamina, Mana, and XP.",
  Attributes: "Character stats and current values.",
  Abilities: "Assigned abilities; each costs Mana.",
  Equipment: "Equipped items change your attributes.",
  Inventory: "Carried items; double-click to equip.",
};

export function GameCard({ title, children, className = "", showTab = false, tabOffsetY = "0px", tabExpanded, onTabClick, tabAriaLabel, contentHidden = false, panelPopup }: {
  title: string;
  children: ReactNode;
  className?: string;
  showTab?: boolean;
  tabOffsetY?: string;
  tabExpanded?: boolean;
  onTabClick?(): void;
  tabAriaLabel?: string;
  contentHidden?: boolean;
  panelPopup?: PanelPopup;
}) {
  const key = title.startsWith("Inventory") ? "Inventory" : title;
  return <section className={`game-card ${className}`}>
    {showTab && onTabClick && <div className="game-card__tab-placement" style={{ top: tabOffsetY }}><TabControl ariaLabel={tabAriaLabel} expanded={tabExpanded} onClick={onTabClick} /></div>}
    <div aria-hidden={contentHidden || undefined}><h2><Tooltip content={cardHelp[key] ?? title}><button tabIndex={-1} type="button" className="game-card__title-trigger">{title}</button></Tooltip></h2>{children}</div>
    {panelPopup && <section className="panel-popup" aria-labelledby={`${key.toLowerCase().replaceAll(" ", "-")}-panel-popup-title`}><div className="panel-popup__content"><h3 id={`${key.toLowerCase().replaceAll(" ", "-")}-panel-popup-title`}>{panelPopup.title}</h3>{panelPopup.body && <p>{panelPopup.body}</p>}{panelPopup.actionLabel && <button type="button" onClick={panelPopup.onAction}>{panelPopup.actionLabel}</button>}</div></section>}
  </section>;
}
