/**
 * Segmented control. Used by both ranking views, so it lives here rather than
 * as a duplicated utility string in each page.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-control border border-hairline bg-pocket p-0.5"
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
            className={[
              "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-caption font-medium",
              "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
              selected
                ? "bg-rail text-ink"
                : "text-ink-faint hover:text-ink-soft",
            ].join(" ")}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
