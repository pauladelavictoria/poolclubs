import * as React from "react";
import { LuChevronDown } from "react-icons/lu";
import { cardClasses } from "@/components/ui/cardStyles";

/**
 * The one container. Surface shift + hairline, never a shadow — depth strategy
 * for this app is lightness, because shadows don't read on near-black.
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cardClasses({ className })} {...props} />;
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
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-hairline px-4 py-3">
      <h2 className="text-h4 font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

/**
 * A card that folds away. A native <details>: the toggle, the keyboard and
 * Esc come with the element, and there is no open state to keep anywhere —
 * the same trade the organiser's panel makes in TournamentAdminPanel.
 *
 * Open by default, because a card the reader has to open to discover is a
 * card they will not open. Collapsing is for the long lists — thirty
 * fixtures between the table and everything under it.
 */
export function CollapsibleCard({
  title,
  className,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  className?: string;
  /** Off for a card whose title already answers it — a count of what is left
   *  to play is the whole message; the list behind it is for whoever wants it. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={cardClasses({
        className: ["group overflow-hidden", className]
          .filter(Boolean)
          .join(" "),
      })}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 group-open:border-b group-open:border-hairline [&::-webkit-details-marker]:hidden">
        <h2 className="text-h4 font-semibold text-ink">{title}</h2>
        <LuChevronDown
          className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      {children}
    </details>
  );
}
