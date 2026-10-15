import type { PointerEventHandler, ReactNode } from "react";
import type { Orientation } from "../../ui/layout.ts";

export function GameScreen({ children, onPointerDown, orientation = "landscape" }: { children: ReactNode; onPointerDown?: PointerEventHandler<HTMLElement>; orientation?: Orientation }) {
  return <main className="game-screen" data-orientation={orientation} onPointerDown={onPointerDown}>{children}</main>;
}
