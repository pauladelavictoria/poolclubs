import { useId } from "react";
import { BALLS, BALL_COLORS, BALL_RADIUS, isStriped } from "@/libs/drillGeometry";
import type { Category, Discipline } from "@/types";
import { useT } from "@/i18n";

/**
 * A real ball, drawn the way the drill editor draws it on the felt.
 *
 * Shared rather than duplicated: the picker that chooses 9-ball and the palette
 * that drags a 9 onto a table are showing the same object, and they should not
 * be able to drift apart.
 */
export function BallGlyph({
  color,
  label,
  className = "h-full w-full",
}: {
  color: string;
  label?: string;
  className?: string;
}) {
  // The clip path needs a document-unique id: two of these on one page with the
  // same label would otherwise share one, and the second would clip to the
  // first's geometry.
  const clipId = useId();
  const fill = BALL_COLORS[color] ?? color;
  const striped = isStriped(label);

  return (
    <svg viewBox="-2 -2 4 4" className={className} aria-hidden>
      <circle r={BALL_RADIUS} fill={striped ? "#FFFFFF" : fill} />
      {striped && (
        <>
          <clipPath id={clipId}>
            <circle r={BALL_RADIUS} />
          </clipPath>
          <rect
            x={-BALL_RADIUS}
            y={-BALL_RADIUS * 0.55}
            width={BALL_RADIUS * 2}
            height={BALL_RADIUS * 1.1}
            fill={fill}
            clipPath={`url(#${clipId})`}
          />
        </>
      )}
      {label && (
        <>
          <circle r={0.8} fill="#FFFFFF" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#111111"
            fontSize={label.length > 1 ? 1.05 : 1.35}
          >
            {label}
          </text>
        </>
      )}
    </svg>
  );
}

/** Each discipline is named after the ball that ends the rack. */
const DISCIPLINE_BALL: Record<Discipline, string> = {
  "8ball": "8",
  "9ball": "9",
  "10ball": "10",
};

export function DisciplineBall({
  discipline,
  // Bigger than the icon default: a ball has a number on it, and at 16px the
  // stripe and the digit both stop reading.
  className = "h-5 w-5",
}: {
  discipline: Discipline;
  className?: string;
}) {
  const ball = BALLS.find((b) => b.label === DISCIPLINE_BALL[discipline]);
  if (!ball) return null;
  return (
    <BallGlyph color={ball.color} label={ball.label} className={className} />
  );
}

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
  const { t } = useT();
  const label = t(`category.${category}`);

  return (
    <span
      className="inline-flex h-6 items-center rounded-control border border-hairline-strong bg-rail px-2 font-mono text-caption font-semibold uppercase tracking-[0.06em] text-ink"
      title={label}
    >
      {full ? label : t("category.short", { n: category })}
    </span>
  );
}
