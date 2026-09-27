export function PhotoUploadStep({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-control bg-pocket/90 text-ink-soft transition-colors duration-150 hover:text-ink disabled:invisible"
    >
      {children}
    </button>
  );
}
