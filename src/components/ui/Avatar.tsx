import { CLUB_BALL_COLORS } from "@/types";

/** A deterministic pick from the eight ball colours, keyed by `seed` rather
 *  than any club — so a face grid of mostly-null avatar_urls gets real colour
 *  variety instead of twenty-four identical grey circles. */
const seedBall = (seed: number | string) => {
  const key = String(seed);
  let hash = 0;
  for (let i = 0; i < key.length; i++)
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
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
  mark = false,
  className = "h-7 w-7",
}: {
  name: string;
  url?: string | null;
  /** Tints the fallback initial from the ball palette. Pass wherever faces
   *  appear in bulk (a roster, a face pile); omit under /app so the authed
   *  side stays byte-identical. */
  seed?: number | string;
  /** This is a logo, not a face. Club logos are nearly always transparent PNGs
   *  drawn dark-on-clear, so on a dark surface they disappear: `mark` puts white
   *  behind the image. It also switches to `object-contain`, because cropping a
   *  face at the edges is fine and cropping a wordmark is not. */
  mark?: boolean;
  /** Size lives here — pass the height/width utility pair you need. */
  className?: string;
}) {
  const ring = `shrink-0 rounded-full outline outline-1 -outline-offset-1 outline-white/10`;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${ring} ${className} ${
          mark ? "bg-white object-contain p-0.5" : "object-cover"
        }`}
      />
    );
  }

  const ball = seed !== undefined ? seedBall(seed) : undefined;

  return (
    <span
      aria-hidden
      data-ball={ball}
      // Seeded fallbacks are a solid ball, not a tint: a face grid is where the
      // palette earns its keep, and a 14% wash of eight hues averages back out
      // to the same grey it was meant to replace. `flood` is the same
      // strike/pocket pair the primary button ships, so it is already
      // contrast-checked in both modes.
      className={`${ring} ${className} flex items-center justify-center text-caption font-semibold ${
        ball ? "flood" : "bg-felt-raised text-ink-soft"
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
