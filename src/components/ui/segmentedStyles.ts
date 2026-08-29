/** The shell and the pills of a segmented control, in their own file so both
 *  the button-based <Segmented> and the link-based RankingPeriodTabs can wear
 *  them — same reason buttonStyles/cardStyles are split out. */
export const segmentedShell =
  "inline-flex rounded-control border border-hairline bg-pocket p-0.5";

export const segmentedItem = (selected: boolean) =>
  [
    // .tap and the touch step for the same reason buttonClasses carries them:
    // RankingPeriodTabs wears these on links, which the `button` floor misses.
    "tap inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-caption font-medium",
    "pointer-coarse:px-4 pointer-coarse:text-body",
    "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
    selected ? "bg-rail text-ink" : "text-ink-faint hover:text-ink-soft",
  ].join(" ");
