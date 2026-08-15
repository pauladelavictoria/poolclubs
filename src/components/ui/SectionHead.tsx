import type { ReactNode } from "react";

/**
 * A body section's own heading, for the detail pages that shed their `Card`
 * boxes in favour of a hairline. Runs at `text-h2` (24) against `CardHeader`'s
 * `text-h4` (18): with a hero at `text-display` (48) that gives the editorial
 * contrast the public redesign wants — 48 / 24 / 16 — instead of 32 / 18 / 16.
 */
export function SectionHead({
  title,
  action,
}: {
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3">
      <h2 className="text-h2 font-semibold tracking-tight text-ink">{title}</h2>
      {action}
    </div>
  );
}
