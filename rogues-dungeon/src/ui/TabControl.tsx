import { useContext } from "react";
import { LayoutContext } from "./layout-context.ts";
import { PivotPoint } from "./PivotPoint.tsx";

interface TabControlProps {
  onClick(): void;
  ariaLabel?: string;
  expanded?: boolean;
}

export function TabControl({ onClick, ariaLabel = "Toggle controls", expanded }: TabControlProps) {
  const { showPivotPoints } = useContext(LayoutContext);
  return <button
    tabIndex={-1}
    type="button"
    className="tab-control"
    aria-label={ariaLabel}
    aria-expanded={expanded}
    onClick={onClick}
  >
    <svg className="tab-control__shape" viewBox="0 0 400 55" preserveAspectRatio="none" aria-hidden="true">
      <polygon className="tab-control__fill" points="72,0 328,0 400,55 0,55" />
      <path className="tab-control__edge" d="M72 0H328L400 55M72 0L0 55" />
    </svg>
    <PivotPoint visible={showPivotPoints} />
    <span className="tab-control__caret" aria-hidden="true">⌃</span>
  </button>;
}
