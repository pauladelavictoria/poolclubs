/**
 * Rank as an object ball. Pool numbers its balls, so the podium doesn't need
 * gold/silver/bronze: 1 is the yellow, 2 the blue, 3 the red, everyone else
 * is the cue ball. Reads instantly to anyone who plays.
 */
export const BALL: Record<number, { bg: string; fg: string }> = {
  1: { bg: "bg-ball-1", fg: "text-pocket" },
  2: { bg: "bg-ball-2", fg: "text-white" },
  3: { bg: "bg-ball-3", fg: "text-white" },
};

/** The same fill and text pair, for anything that wears a rank's colour without
 *  being a circle — the podium paints its whole step with it. */
export const ballTone = (rank: number) =>
  BALL[rank] ?? { bg: "bg-ball-cue", fg: "text-ink-soft" };
