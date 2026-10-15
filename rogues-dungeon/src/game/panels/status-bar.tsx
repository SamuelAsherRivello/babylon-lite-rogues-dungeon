import type { ReactNode } from "react";

export function StatusBar({ children }: { children: ReactNode }) {
  return <footer className="status-bar">{children}</footer>;
}
