import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { easeInCubic, easeOutCubic } from "../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "./ui-transition-system.tsx";

export interface DialogBounds { left: number; top: number; width: number; height: number }
export function dialogBounds(element: Element): DialogBounds { const { left, top, width, height } = element.getBoundingClientRect(); return { left, top, width, height }; }

export function Dialog({ title, onClose, children, footer = null, className = "", bounds, menuMotion = false, dismissible = true }: { title: ReactNode; onClose(): void; children?: ReactNode; footer?: ReactNode; className?: string; bounds?: DialogBounds | null; menuMotion?: boolean; dismissible?: boolean }) {
  const closeRef = useRef(onClose);
  const titleId = useId();
  const [visible, setVisible] = useState(!menuMotion);
  const motion = useUiMotion("settings-menu", { opacity: visible ? 1 : .8, scale: visible ? 1 : .8, depth: 3 }, 125, visible ? easeOutCubic : easeInCubic);
  closeRef.current = onClose;
  const requestClose = () => {
    if (!menuMotion || !visible) { closeRef.current(); return; }
    setVisible(false);
    window.setTimeout(() => closeRef.current(), 125);
  };
  useEffect(() => {
    if (!menuMotion) return undefined;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [menuMotion]);
  useEffect(() => {
    if (!dismissible) return undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); requestClose(); return; }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); };
  }, [dismissible, menuMotion, visible]);
  const boundedStyle = bounds ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height } : undefined;
  return (
    <div className={`dialog_backdrop${bounds ? " dialog_backdrop--bounded" : ""}${dismissible ? "" : " dialog_backdrop--dismiss-disabled"}`} role="presentation" onClick={dismissible ? requestClose : undefined}>
      <section className={`dialog${bounds ? " dialog--bounded" : ""} ${className}`.trim()} style={{ ...boundedStyle, ...(menuMotion ? motion : {}) }} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <header className="dialog_header">
          <h2 id={titleId}>{title}</h2>
          <button tabIndex={-1} className="dialog_close" type="button" onClick={requestClose} aria-label="Close dialog">×</button>
        </header>
        <div className="dialog_body">{children}</div>
        {footer && <footer className="dialog_footer">{footer}</footer>}
      </section>
    </div>
  );
}
