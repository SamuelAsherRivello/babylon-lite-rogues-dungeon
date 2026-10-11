interface PivotPointProps {
  visible?: boolean;
}

export function PivotPoint({ visible = true }: PivotPointProps) {
  if (!visible) return null;
  return <span className="pivot-point" aria-hidden="true" />;
}
