import { segmentedShell, segmentedItem } from "@/components/ui/segmentedStyles";

/**
 * Segmented control. Used by both ranking views, so it lives here rather than
 * as a duplicated utility string in each page.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`${segmentedShell} ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={segmentedItem(selected)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
