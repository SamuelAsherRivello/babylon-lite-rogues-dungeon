import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { easeInCubic, easeOutCubic } from "../../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";
import versionText from "../../../../version.txt?raw";

export function MainMenuWindow({ children, footer, exiting = false }: { children: ReactNode; footer: ReactNode; exiting?: boolean }) {
  const [pageLoaded, setPageLoaded] = useState(() => document.readyState === "complete");
  const shown = pageLoaded && !exiting;
  const motion = useUiMotion("main-menu", { opacity: shown ? 1 : pageLoaded ? .8 : 0, scale: shown ? 1 : .8, depth: 2 }, 125, shown ? easeOutCubic : easeInCubic);
  useEffect(() => {
    if (pageLoaded) return undefined;
    const reveal = () => requestAnimationFrame(() => setPageLoaded(true));
    window.addEventListener("load", reveal, { once: true });
    return () => window.removeEventListener("load", reveal);
  }, [pageLoaded]);
  return <section className="main-menu-window" style={motion}>{children}<div className="main-menu-window__footer">{footer}</div><span className="main-menu-window__version">v{versionText.trim().replace(/^version=/, "")}</span></section>;
}
