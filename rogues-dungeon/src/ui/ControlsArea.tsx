import type { ReactNode } from "react";
import { TabControl } from "./TabControl.tsx";

interface ControlsAreaProps {
  expanded: boolean;
  titleVisible: boolean;
  titleText: string;
  onToggle(): void;
  children: ReactNode;
}

export function ControlsArea({ expanded, titleVisible, titleText, onToggle, children }: ControlsAreaProps) {
  return <div className={`controls-area${expanded ? " controls-area--expanded" : ""}${titleVisible ? " controls-area--title-visible" : ""}`}>
    <div className="controls-area_surface">
      <TabControl ariaLabel={expanded ? "Collapse keyboard controls" : "Expand keyboard controls"} expanded={expanded} onClick={onToggle} />
      <section className="keyboard_tray_panel" aria-label="Keyboard controls" aria-hidden={!expanded}><div className="keyboard_tray_rows">{children}</div></section>
    </div>
    <button tabIndex={-1} type="button" className="keyboard_tray_title" aria-label={expanded ? "Collapse keyboard controls" : "Expand keyboard controls"} aria-expanded={expanded} aria-hidden={!titleVisible} onClick={onToggle}>{titleText}</button>
  </div>;
}
