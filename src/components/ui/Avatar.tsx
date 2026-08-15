import { CLUB_BALL_COLORS } from "@/types";

const SHAPE = {
  circle: "rounded-full",
  plate: "rounded-sheet",
} as const;

/** A deterministic pick from the eight ball colours, keyed by `seed` rather
 *  than any club — so a face grid of mostly-null avatar_urls gets real colour
 *  variety instead of twenty-four identical grey circles. */
const seedBall = (seed: number | string) => {
  const key = String(seed);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return CLUB_BALL_COLORS[Math.abs(hash) % CLUB_BALL_COLORS.length];
};

/**
 * A face where there is one, the initial where there isn't. Same ring in both
 * cases, so a row of mixed avatars still lines up.
 */
export function Avatar({
  name,
  url,
  seed,
  shape = "circle",
  className = "h-7 w-7",
}: {
  name: string;
  url?: string | null;
  /** Tints the fallback initial from the ball palette. Pass wherever faces
   *  appear in bulk (a roster, a face pile); omit under /app so the authed
   *  side stays byte-identical. */
  seed?: number | string;
  /** A club logo is a mark, not a face — `"plate"` makes it square-ish
   *  instead of round so a club header and a player header don't read
   *  identically. */
  shape?: keyof typeof SHAPE;
  /** Size lives here — pass the height/width utility pair you need. */
  className?: string;
}) {
  const ring = `shrink-0 ${SHAPE[shape]} outline outline-1 -outline-offset-1 outline-white/10`;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${ring} ${className} object-cover`}
      />
    );
  }

  const ball = seed !== undefined ? seedBall(seed) : undefined;

  return (
    <span
      aria-hidden
      data-ball={ball}
      className={`${ring} ${className} flex items-center justify-center text-caption font-semibold ${
        ball ? "bg-strike-tint text-strike" : "bg-felt-raised text-ink-soft"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
