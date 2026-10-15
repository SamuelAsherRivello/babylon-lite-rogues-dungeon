import type { ReactNode } from "react";

export function MenuScreen({ children }: { children: ReactNode }) {
  return <main className="menu-screen">{children}</main>;
}
