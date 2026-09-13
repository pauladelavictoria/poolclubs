import type { ReactNode } from "react";
import { LuChevronRight } from "react-icons/lu";

/**
 * A setting folded away behind what it is currently set to.
 *
 * Built for forms where a picker is the tallest thing on the page — open, it
 * pushes everything below it off the screen; collapsed, the summary still
 * answers the only question anyone has when scrolling past: what is it set
 * to right now.
 *
 * Native <details>, so open/close, keyboard and screen-reader semantics cost
 * nothing. `value` is whatever the caller currently has staged, not
 * necessarily what is saved — a summary that reverted the moment you
 * collapsed it would be lying about a form that batches its edits into one
 * save (see ClubInfoPage, the first place this pattern was used).
 */
export function Collapsible({
  label,
  hint,
  value,
  bordered = true,
  children,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  /** Off when the caller already draws its own boundary around this — a
   *  divide-y list item, say — where this component's own top border would
   *  sit right next to that one at the same weight, and the two together
   *  read as a flat run of rows rather than "this detail belongs to the
   *  row above it" (see ClubTablesCard, the first place that happened). */
  bordered?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={
        // The border's own visual weight was standing in for space before —
        // pt-4 was there to hold the summary clear of that line. Without a
        // line to clear, the same gap just reads as too much air between a
        // row and its own details, so the unbordered variant gets a plain,
        // smaller margin instead.
        bordered ? "group mt-5 border-t border-hairline pt-4" : "group mt-2"
      }
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <LuChevronRight
          className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-90"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-body font-medium text-ink">
          {label}
        </span>
        <span className="shrink-0 text-caption text-ink-faint group-open:hidden">
          {value}
        </span>
      </summary>
      <div className="mt-3 space-y-3 pl-6">
        <p className="text-body text-ink-soft">{hint}</p>
        {children}
      </div>
    </details>
  );
}
