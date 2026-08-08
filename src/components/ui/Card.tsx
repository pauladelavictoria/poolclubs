import * as React from "react";

/**
 * The one container. Surface shift + hairline, never a shadow — depth strategy
 * for this app is lightness, because shadows don't read on near-black.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-hairline bg-felt ${className || ""}`}
      {...props}
    />
  );
}

/** Card header: title left, actions right, hairline under. */
export function CardHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
      <h2 className="text-h4 font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
