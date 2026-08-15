import { pickerClasses } from "@/components/ui/buttonStyles";

/**
 * A row of facets, one of which can be on, plus an "any" pill that turns the
 * facet off.
 *
 * A <Segmented> would be wrong here: that control is a view switcher, always in
 * one of its states, and it wears a shell that groups its options into a single
 * unit. A facet row is a set of independent filters that can all be off, and
 * there are several rows of them side by side — so it wears the outlined pill
 * the preference pickers use, which is what `pickerClasses` already is.
 *
 * `value === undefined` means the facet is off, which is also what the URL says
 * when the search param is absent.
 */
export function FilterPills<T extends string>({
  label,
  anyLabel,
  value,
  onChange,
  options,
}: {
  /** Names the group for a screen reader. Not drawn — the pills say what they
   *  are, and a visible label per row would double the height of a filter bar. */
  label: string;
  anyLabel: string;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={label}>
      <button
        type="button"
        aria-pressed={value === undefined}
        onClick={() => onChange(undefined)}
        className={pickerClasses(value === undefined) + " px-3"}
      >
        {anyLabel}
      </button>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          // Tapping the pill that is already on turns it off, so a facet can be
          // cleared without reaching back for "any".
          onClick={() =>
            onChange(value === option.value ? undefined : option.value)
          }
          className={pickerClasses(value === option.value) + " px-3"}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
