export function TimeInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value}
      disabled={disabled}
      // Clearing the field yields "", which is not a time. Ignored rather than
      // stored: parseSchedule would drop it on the way back out anyway, and
      // silently losing the row someone was halfway through editing is worse.
      onChange={(e) => e.target.value && onChange(e.target.value)}
      className="h-8 rounded-control border border-hairline bg-pocket px-2 text-body tabular-nums text-ink transition-colors duration-150 hover:border-hairline-strong disabled:opacity-50"
    />
  );
}
