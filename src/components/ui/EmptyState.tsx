import type { ReactNode } from "react";

/**
 * Empty is a state, not an accident. Say what's missing and how to fill it.
 */
export function EmptyState({
  icon,
  art,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  /** An illustration (see components/ui/Shot), replacing the icon circle
   *  entirely when given — the two are alternatives, not layers. */
  art?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {art ? (
        <div className="mb-4 w-28 overflow-hidden rounded-card">{art}</div>
      ) : (
        icon && (
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-felt-raised text-ink-faint">
            {icon}
          </div>
        )
      )}
      <p className="text-h4 font-medium text-ink">{title}</p>
      {hint && (
        <p className="mt-1 max-w-[38ch] text-body text-ink-faint">{hint}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
