import { ballTone } from "./ballTones";

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
