/** The shell and the pills of a segmented control, in their own file so both
 *  the button-based <Segmented> and the link-based RankingPeriodTabs can wear
 *  them — same reason buttonStyles/cardStyles are split out. */
// `w-max`, not just inline-flex: inside a scrolling box the shell would
// otherwise take the box's width and squeeze the pills instead of overflowing
// it, which is what a scrolling box is for.
export const segmentedShell =
  "inline-flex w-max rounded-control border border-hairline bg-pocket p-0.5";

export const segmentedItem = (selected: boolean) =>
  [
    // .tap and the touch step for the same reason buttonClasses carries them:
    // RankingPeriodTabs wears these on links, which the `button` floor misses.
    // A pill is one line and its own width. The height is fixed, so a label
    // allowed to wrap draws its second line outside the pill.
    "tap inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 text-caption font-medium",
    "pointer-coarse:px-4 pointer-coarse:text-body",
    "transition-[background-color,color] duration-150 ease-[var(--ease-out)]",
    selected ? "bg-rail text-ink" : "text-ink-faint hover:text-ink-soft",
  ].join(" ");
