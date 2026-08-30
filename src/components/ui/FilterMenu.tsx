import { useEffect, useRef, useState, type ReactNode } from "react";
import { LuSlidersHorizontal } from "react-icons/lu";
import { useT } from "@/i18n";

/**
 * Every facet on a directory, folded away behind one button.
 *
 * A native `<details>` rather than a popover library: no dependency, keyboard and
 * screen-reader behaviour for free, and it works before hydration, which matters
 * on a route a stranger arrives at from a search engine.
 *
 * It stays open after a choice on purpose. Setting two facets should be one visit
 * to the menu rather than two, and a route change re-renders the page underneath
 * without touching the element's open state.
 *
 * The badge is the whole reason the button can hide the facets safely: folded-away
 * filters that are silently on are how a reader ends up staring at three results
 * and blaming the data.
 */
export function FilterMenu({
  activeCount,
  children,
}: {
  /** How many facets are set. Drawn as a badge so a collapsed menu can never
   *  hide the fact that the list below is filtered. */
  activeCount: number;
  children: ReactNode;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  // Light dismiss, the one thing `<details>` does not bring with it. Still
  // uncontrolled — the open state is the element's, and this only closes it —
  // so the menu keeps working before hydration.
  // ponytail: no popover library; `<details>` covers the rest.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.type === "keydown") {
        if ((e as KeyboardEvent).key !== "Escape") return;
        // Escape closes from inside the menu, so focus has to come back out.
        ref.current?.querySelector("summary")?.focus();
      }
      if (e.type === "pointerdown" && ref.current?.contains(e.target as Node))
        return;
      if (ref.current) ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="relative shrink-0"
    >
      <summary
        aria-label={t("public.filters.title")}
        className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-control border border-hairline text-ink-soft transition-colors duration-150 select-none hover:border-hairline-strong hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <LuSlidersHorizontal className="h-4 w-4" aria-hidden />
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-strike px-1 font-mono text-[11px] font-semibold text-pocket">
            {activeCount}
          </span>
        )}
      </summary>

      <div className="absolute left-0 z-20 mt-2 flex w-[min(90vw,20rem)] flex-col gap-4 rounded-card border border-hairline-strong bg-felt p-4 shadow-pop">
        {children}
      </div>
    </details>
  );
}

/**
 * One facet inside the menu: its name, then its options.
 *
 * `FilterPills` deliberately draws no label of its own — a visible label per row
 * would double the height of an inline filter bar. In a menu the constraint is
 * reversed: the rows are stacked and unlabelled pills stop saying what they
 * belong to. So the label lives here rather than in the control.
 */
export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span className="text-caption font-medium text-ink-faint">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
