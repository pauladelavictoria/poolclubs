import { type ReactNode } from "react";

/**
 * One facet inside the menu: its name, then its options.
 *
 * `FilterPills` deliberately draws no label of its own — a visible label per row
 * would double the height of an inline filter bar. In a menu the constraint is
 * reversed: the rows are stacked and unlabelled pills stop saying what they
 * belong to. So the label lives here rather than in the control.
 */
export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="text-caption font-medium text-ink-faint">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
