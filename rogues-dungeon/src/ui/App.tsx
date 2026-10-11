import type { ReactNode } from "react";
import type { Orientation } from "./layout.ts";
import { useEffect, useMemo, useState } from "react";
import { BrowserSurface } from "./BrowserSurface.tsx";
import { classifyPlatform, layoutForPlatform } from "./layout.ts";
import { LayoutContext } from "./layout-context.ts";

export function App({ content = null, gutters = {} }: { content?: ReactNode; gutters?: Partial<Record<string, ReactNode>> }) {
  useEffect(() => {
    // Also cover browser-focusable scroll regions and controls added at runtime.
    const preventTabNavigation = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener("keydown", preventTabNavigation, true);
    return () => window.removeEventListener("keydown", preventTabNavigation, true);
  }, []);
  const platform = classifyPlatform({ userAgentDataMobile: navigator.userAgentData?.mobile, userAgent: navigator.userAgent });
  const canOverride = platform === "pc" && import.meta.env.DEV;
  const [developerAspect, setDeveloperAspect] = useState<Orientation | null>(null);
  const layout = layoutForPlatform(platform, canOverride ? developerAspect : null);
  const context = useMemo(() => ({ platform, orientation: layout.orientation, canOverride, setDeveloperAspect }), [platform, layout.orientation, canOverride]);
  return <LayoutContext.Provider value={context}><BrowserSurface layout={layout} gutters={gutters}>{content}</BrowserSurface></LayoutContext.Provider>;
}
