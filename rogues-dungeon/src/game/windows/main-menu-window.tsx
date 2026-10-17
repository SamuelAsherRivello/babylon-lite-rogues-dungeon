import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { easeInCubic, easeOutCubic } from "../../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";
import versionText from "../../../../version.txt?raw";

export function MainMenuWindow({ children, footer, exiting = false }: { children: ReactNode; footer: ReactNode; exiting?: boolean }) {
  const [visible, setVisible] = useState(false);
  const shown = visible && !exiting;
  const motion = useUiMotion("main-menu", { opacity: shown ? 1 : .8, scale: shown ? 1 : .8, depth: 2 }, 125, shown ? easeOutCubic : easeInCubic);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <section className="main-menu-window" style={motion}>{children}<div className="main-menu-window__footer">{footer}</div><span className="main-menu-window__version">v{versionText.trim().replace(/^version=/, "")}</span></section>;
}
