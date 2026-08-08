import type { Category } from "@/types";

/**
 * Rank as an object ball. Pool numbers its balls, so the podium doesn't need
 * gold/silver/bronze: 1 is the yellow, 2 the blue, 3 the red, everyone else
 * is the cue ball. Reads instantly to anyone who plays.
 */
const BALL: Record<number, { bg: string; fg: string }> = {
  1: { bg: "bg-ball-1", fg: "text-pocket" },
  2: { bg: "bg-ball-2", fg: "text-white" },
  3: { bg: "bg-ball-3", fg: "text-white" },
};

/** `lg` is for the one hero rank per page; lists always use `sm`. */
const SIZE = {
  sm: "h-7 w-7 text-caption",
  lg: "h-14 w-14 text-h2",
} as const;

export function BallBadge({
  rank,
  size = "sm",
  className = "",
}: {
  rank: number;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const ball = BALL[rank];
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "font-mono font-semibold tabular-nums",
        SIZE[size],
        ball ? `${ball.bg} ${ball.fg}` : "bg-ball-cue text-ink-soft",
        className,
      ].join(" ")}
    >
      {rank}
    </span>
  );
}

const CATEGORY_LABEL: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

/**
 * Division. Still no hue — red means "act" and green means "won frame", and a
 * third colour here would spend the budget on a label. Prominence comes from
 * contrast and weight instead: rail surface, full-strength ink, semibold.
 */
export function CategoryBadge({
  category,
  full = false,
}: {
  category: Category;
  full?: boolean;
}) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-control border border-hairline-strong bg-rail px-2 font-mono text-caption font-semibold uppercase tracking-[0.06em] text-ink"
      title={CATEGORY_LABEL[category]}
    >
      {full ? CATEGORY_LABEL[category] : `${category}ª`}
    </span>
  );
}

export { CATEGORY_LABEL };
