import type { ReactNode } from "react";

export function MainMenuWindow({ children }: { children: ReactNode }) {
  return <section className="main-menu-window">{children}</section>;
}
