import type { ReactNode } from "react";
import type { Orientation } from "./layout.ts";
import { useEffect, useMemo, useState } from "react";
import { BrowserSurface } from "./BrowserSurface.tsx";
import { classifyPlatform, layoutForPlatform } from "./layout.ts";
import { LayoutContext } from "./layout-context.ts";

const PIVOT_POINTS_STORAGE_KEY = "rogues-dungeon.dev.show-pivot-points";
const SEQUENTIALLY_FOCUSABLE_SELECTOR = "a[href], area[href], button, input, select, textarea, iframe, object, embed, [contenteditable]:not([contenteditable=\"false\"]), [tabindex]";

function readShowPivotPoints() {
  try { return localStorage.getItem(PIVOT_POINTS_STORAGE_KEY) === "true"; } catch { return false; }
}

export function App({ content = null, gutters = {} }: { content?: ReactNode; gutters?: Partial<Record<string, ReactNode>> }) {
  useEffect(() => {
    // The game is pointer, touch, and game-key controlled: never let its UI join
    // the browser's sequential focus navigation, including controls added later.
    const removeFromTabOrder = (root: ParentNode) => {
      const elements: HTMLElement[] = root instanceof HTMLElement && root.matches(SEQUENTIALLY_FOCUSABLE_SELECTOR)
        ? [root, ...root.querySelectorAll<HTMLElement>(SEQUENTIALLY_FOCUSABLE_SELECTOR)]
        : Array.from(root.querySelectorAll<HTMLElement>(SEQUENTIALLY_FOCUSABLE_SELECTOR));
      elements.forEach((element) => {
        if (element.tabIndex !== -1) element.tabIndex = -1;
      });
    };
    removeFromTabOrder(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) removeFromTabOrder(mutation.target);
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) removeFromTabOrder(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["tabindex", "href", "contenteditable"] });
    const preventTabNavigation = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", preventTabNavigation, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", preventTabNavigation, true);
    };
  }, []);
  const platform = classifyPlatform({ userAgentDataMobile: navigator.userAgentData?.mobile, userAgent: navigator.userAgent });
  const canOverride = platform === "pc" && import.meta.env.DEV;
  const [developerAspect, setDeveloperAspect] = useState<Orientation | null>(null);
  const [showPivotPoints, setShowPivotPoints] = useState(readShowPivotPoints);
  const setPersistentShowPivotPoints = (value: boolean | ((current: boolean) => boolean)) => setShowPivotPoints((current) => {
    const next = typeof value === "function" ? value(current) : value;
    try { localStorage.setItem(PIVOT_POINTS_STORAGE_KEY, String(next)); } catch { /* session fallback */ }
    return next;
  });
  const layout = layoutForPlatform(platform, canOverride ? developerAspect : null);
  const context = useMemo(() => ({ platform, orientation: layout.orientation, canOverride, showPivotPoints: canOverride && showPivotPoints, setShowPivotPoints: setPersistentShowPivotPoints, setDeveloperAspect }), [platform, layout.orientation, canOverride, showPivotPoints]);
  return <LayoutContext.Provider value={context}><BrowserSurface layout={layout} gutters={gutters}>{content}</BrowserSurface></LayoutContext.Provider>;
}
