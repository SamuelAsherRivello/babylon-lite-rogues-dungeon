import type { ReactNode } from "react";
/**
 * Minimal starter component for reusable UI composition.
 */
export function Template({ children = null }: { children?: ReactNode }) {
  return children;
}
