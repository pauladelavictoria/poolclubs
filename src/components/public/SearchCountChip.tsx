export function SearchCountChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-hairline bg-felt px-2.5 py-1 font-mono text-caption tabular-nums text-ink-soft">
      {label}
    </span>
  );
}
