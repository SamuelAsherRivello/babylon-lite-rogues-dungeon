import type { ReactNode } from "react";
import { useUiMotion } from "../../ui/ui-transition-system.tsx";

export function WorldViewRegion({ children, primaryOpen, secondaryOpen }: { children: ReactNode; primaryOpen: boolean; secondaryOpen: boolean }) {
  const widthPercent = primaryOpen ? secondaryOpen ? 56 : 78 : secondaryOpen ? 78 : 100;
  const motion = useUiMotion("game-view", { widthPercent });
  return <section className="world-view-region" style={motion}>{children}</section>;
}
