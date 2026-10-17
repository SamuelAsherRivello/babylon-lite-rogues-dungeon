import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { easeInCubic, easeOutCubic } from "../../systems/animation/tween-animation-system.ts";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";

export function MainMenuWindow({ children, exiting = false }: { children: ReactNode; exiting?: boolean }) {
  const [visible, setVisible] = useState(false);
  const shown = visible && !exiting;
  const motion = useUiMotion("main-menu", { opacity: shown ? 1 : .8, scale: shown ? 1 : .8, depth: 2 }, 125, shown ? easeOutCubic : easeInCubic);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return <section className="main-menu-window" style={motion}>{children}</section>;
}
