import type { ReactNode } from "react";
import { TabControl } from "./TabControl.tsx";
import { useUiMotion } from "./ui-transition-system.tsx";

interface ControlsAreaProps {
  expanded: boolean;
  titleVisible: boolean;
  titleText: string;
  onToggle(): void;
  children: ReactNode;
}

export function ControlsArea({ expanded, titleVisible, titleText, onToggle, children }: ControlsAreaProps) {
  const motion = useUiMotion("status-controls", { y: expanded ? -100 : 0, opacity: 1, depth: 6 });
  return <div className={`controls-area${expanded ? " controls-area--expanded" : ""}${titleVisible ? " controls-area--title-visible" : ""}`}>
    <div className="controls-area_surface" style={motion}>
      <TabControl ariaLabel={expanded ? "Collapse keyboard controls" : "Expand keyboard controls"} expanded={expanded} onClick={onToggle} />
      <section className="keyboard_tray_panel" aria-label="Keyboard controls" aria-hidden={!expanded}><div className="keyboard_tray_rows">{children}</div></section>
      <button tabIndex={-1} type="button" className="keyboard_tray_title" aria-label={expanded ? "Collapse keyboard controls" : "Expand keyboard controls"} aria-expanded={expanded} aria-hidden={!titleVisible} onClick={onToggle}>{titleText}</button>
    </div>
  </div>;
}
