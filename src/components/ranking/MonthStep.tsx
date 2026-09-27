export function MonthStep({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors duration-150 hover:bg-felt hover:text-ink"
    >
      {children}
    </button>
  );
}
