import * as React from "react";

/** Card header: title left, actions right, hairline under. */
export function CardHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline px-4 py-3">
      <h2 className="text-h4 font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
