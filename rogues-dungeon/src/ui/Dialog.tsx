import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { easeInCubic, easeOutCubic } from "../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "./ui-transition-system.tsx";

export function Dialog({ title, onClose, children, footer = null, className = "", anchorSelector, anchorAlignment = "center", menuMotion = false }: { title: ReactNode; onClose(): void; children?: ReactNode; footer?: ReactNode; className?: string; anchorSelector?: string; anchorAlignment?: "center" | "top-start"; menuMotion?: boolean }) {
  const closeRef = useRef(onClose);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
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
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); requestClose(); return; }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.removeEventListener("keydown", keydown); };
  }, [menuMotion, visible]);
  useLayoutEffect(() => {
    if (!anchorSelector) return;
    const target = document.querySelector<HTMLElement>(anchorSelector);
    const backdrop = backdropRef.current;
    if (!target || !backdrop) return;
    const measure = () => {
      const targetRect = target.getBoundingClientRect();
      const backdropRect = backdrop.getBoundingClientRect();
      setAnchor(new DOMRect(targetRect.left - backdropRect.left, targetRect.top - backdropRect.top, targetRect.width, targetRect.height));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener("resize", measure);
    target.addEventListener("transitionrun", measure);
    target.addEventListener("transitionend", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); target.removeEventListener("transitionrun", measure); target.removeEventListener("transitionend", measure); };
  }, [anchorSelector]);
  const anchoredStyle = anchor ? anchorAlignment === "top-start" ? { left: anchor.left, top: anchor.top } : { left: anchor.left + anchor.width / 2, top: anchor.top + anchor.height / 2 } : undefined;
  return (
    <div ref={backdropRef} className={`dialog_backdrop${anchorSelector ? " dialog_backdrop--anchored" : ""}`} role="presentation" onClick={requestClose}>
      <section className={`dialog${anchorSelector ? ` dialog--anchor-${anchorAlignment}` : ""} ${className}`.trim()} style={{ ...anchoredStyle, ...(menuMotion ? motion : {}) }} role="dialog" aria-modal="true" aria-labelledby="dialog_title" onClick={(event) => event.stopPropagation()}>
        <header className="dialog_header">
          <h2 id="dialog_title">{title}</h2>
          <button tabIndex={-1} className="dialog_close" type="button" onClick={requestClose} aria-label="Close dialog">×</button>
        </header>
        <div className="dialog_body">{children}</div>
        {footer && <footer className="dialog_footer">{footer}</footer>}
      </section>
    </div>
  );
}
