/**
 * Loading placeholders shaped like the content that replaces them, so the
 * layout doesn't jump. Spinners tell you nothing about what's coming.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-control ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 px-3 py-6">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-40 w-full rounded-card" />
    </div>
  );
}

/** Stand-in for a list of rows (ranking, games, players). */
export function SkeletonRows({
  rows = 6,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-control px-1 py-2.5"
        >
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton
            className="h-3.5 flex-1"
            // Ragged widths read as text, a row of identical bars reads as a table
          />
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}
