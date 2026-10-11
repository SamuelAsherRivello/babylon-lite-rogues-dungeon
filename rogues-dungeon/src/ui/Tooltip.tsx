import type { HTMLAttributes, ReactNode } from "react";
import { cloneElement, isValidElement, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findTooltipPosition } from "./tooltip-position.ts";

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  const anchorRef = useRef<HTMLElement | SVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const id = useId();
  const visible = hovered || focused;

  useLayoutEffect(() => {
    if (!visible) return undefined;
    const update = () => {
      if (anchorRef.current && tooltipRef.current) {
        const viewportElement = document.getElementById("viewport");
        const uiLayer = document.getElementById("ui_layer");
        const bounds = viewportElement?.getBoundingClientRect();
        if (bounds && uiLayer) {
          const result = findTooltipPosition({ left: 0, top: 0, right: bounds.width, bottom: bounds.height, originLeft: bounds.left, originTop: bounds.top }, anchorRef.current.getBoundingClientRect(), tooltipRef.current.getBoundingClientRect());
          setPosition({ left: result.left, top: result.top });
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    if (anchorRef.current) observer.observe(anchorRef.current);
    if (tooltipRef.current) observer.observe(tooltipRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [visible, content]);

  if (!isValidElement<HTMLAttributes<HTMLElement | SVGElement>>(children)) return children ?? null;
  const originalEnter = children.props.onPointerEnter;
  const originalLeave = children.props.onPointerLeave;
  const originalFocus = children.props.onFocus;
  const originalBlur = children.props.onBlur;
  const trigger = cloneElement(children, {
    "aria-describedby": visible ? id : children.props["aria-describedby"],
    onPointerEnter: (event) => { anchorRef.current = event.currentTarget; setHovered(true); originalEnter?.(event); },
    onPointerLeave: (event) => { setHovered(false); originalLeave?.(event); },
    onFocus: (event) => { anchorRef.current = event.currentTarget; setFocused(true); originalFocus?.(event); },
    onBlur: (event) => { setFocused(false); originalBlur?.(event); },
  });
  const uiLayer = document.getElementById("ui_layer");
  return <>{trigger}{visible && uiLayer && createPortal(<div ref={tooltipRef} id={id} className="ui_tooltip" role="tooltip" style={{ left: position.left, top: position.top }}>{content}</div>, uiLayer)}</>;
}
