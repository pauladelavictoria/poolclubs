/**
 * A setting that is on or off, with room to say what it means.
 *
 * A native checkbox rather than a hand-rolled switch: it is keyboard-operable,
 * announced correctly, and takes the form's `disabled` and `required` for free.
 * `accent-color` is what makes it wear the club's colour without replacing the
 * control — a styled div with role="switch" would be a lot of code to arrive back
 * where this starts.
 *
 * The whole row is the label, so the hint is part of the hit target rather than
 * text beside it that does nothing when tapped.
 */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] accent-[var(--color-strike)] disabled:cursor-not-allowed"
      />
      <span className="min-w-0">
        <span className="block text-body text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-caption text-ink-faint">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
