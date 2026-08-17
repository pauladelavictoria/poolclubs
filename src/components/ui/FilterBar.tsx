import type { ReactNode } from "react";

/**
 * The strip of filters that sits between a page title and its list.
 *
 * It exists because three pages each spelled the shell out by hand and each one
 * drifted: games wore `px-3 py-2.5` with 32px selects, drills wore `p-2` with
 * full-width 40px ones that read as a form rather than a toolbar, and training
 * progress wore no shell at all — which put an inset `bg-pocket` control
 * directly on the `bg-pocket` canvas, so the field had no fill to be inset
 * against and only its hairline showed.
 *
 * One shell, `sm` controls inside it. The controls are `bg-pocket` on the bar's
 * `bg-felt`, which is the same inset relationship every input in the app has to
 * the card it sits in — that is what makes a filter bar read as a toolbar on
 * the page rather than as content.
 *
 * `trailing` is pinned to the far end for the things that annotate the filters
 * rather than being one — a result count, most of the time.
 */
export function FilterBar({
  children,
  trailing,
  className = "",
}: {
  children: ReactNode;
  /** Right-aligned, and hidden below `sm` where the row has no room to spare. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-control border border-hairline bg-felt p-2",
        className,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {trailing && (
          <span className="ml-auto hidden pr-1 font-mono text-caption tabular-nums text-ink-faint sm:block">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}
