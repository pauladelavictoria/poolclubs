import { useId } from "react";
import {
  BALLS,
  BALL_COLORS,
  BALL_RADIUS,
  isStriped,
} from "@/libs/drillGeometry";
import type { Category, Discipline } from "@/types";
import { useT } from "@/i18n";

/**
 * A real ball, drawn the way the drill editor draws it on the felt.
 *
 * Shared rather than duplicated: the picker that chooses 9-ball and the palette
 * that drags a 9 onto a table are showing the same object, and they should not
 * be able to drift apart.
 */
/**
 * Sphere shading, shared by every ball on the page.
 *
 * The gradients carry no colour of their own — a white bloom and a black rim
 * falloff painted over whatever fill the ball already has — so one pair of
 * defs serves all sixteen balls instead of a gradient per hue. Duplicate ids
 * across svgs are harmless because every copy is identical.
 */
export function BallShadingDefs() {
  return (
    <>
      <radialGradient id="ball-gloss" cx="0.34" cy="0.3" r="0.62">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
        <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ball-shade" cx="0.36" cy="0.32" r="0.78">
        <stop offset="50%" stopColor="#000000" stopOpacity="0" />
        <stop offset="85%" stopColor="#000000" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.6" />
      </radialGradient>
    </>
  );
}

/**
 * Drawn over the ball's fill, under its number. Light comes from the upper
 * left, so on a turned table this belongs inside the upright group — a
 * highlight that rotates with the felt reads as a lamp lying on its side.
 */
export function BallShading({ r = BALL_RADIUS }: { r?: number }) {
  return (
    <>
      <circle r={r} fill="url(#ball-shade)" />
      <circle r={r} fill="url(#ball-gloss)" />
      <ellipse
        cx={-r * 0.34}
        cy={-r * 0.4}
        rx={r * 0.24}
        ry={r * 0.16}
        fill="#FFFFFF"
        opacity={0.7}
      />
    </>
  );
}

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
      <defs>
        <BallShadingDefs />
      </defs>
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
      {/* Drawn over the stripe so it rings the whole ball. Without it a yellow
          or a striped ball has no edge at all on a pale surface. */}
      <circle
        r={BALL_RADIUS}
        fill="none"
        stroke="var(--color-hairline-strong)"
        strokeWidth={0.1}
      />
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

/** The same fill and text pair, for anything that wears a rank's colour without
 *  being a circle — the podium paints its whole step with it. */
// eslint-disable-next-line react-refresh/only-export-components
export const ballTone = (rank: number) =>
  BALL[rank] ?? { bg: "bg-ball-cue", fg: "text-ink-soft" };

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
  const ball = ballTone(rank);
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full",
        "font-mono font-semibold tabular-nums",
        SIZE[size],
        ball.bg,
        ball.fg,
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
