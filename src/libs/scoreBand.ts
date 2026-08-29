/**
 * Five score bands, one source of truth for both the DOM (inline style) and
 * recharts (which only takes colour values, never classes).
 */
export type ScoreBand = {
  /** Also the translation key: `score.${key}` */
  key: "low" | "midlow" | "mid" | "midhigh" | "high";
  color: string;
  /** Inclusive lower bound, in percent */
  min: number;
};

// Ordered high to low: the first band whose `min` a score clears wins.
export const SCORE_BANDS: ScoreBand[] = [
  { key: "high", color: "#3fbf7f", min: 80 },
  { key: "midhigh", color: "#9ccc4a", min: 60 },
  { key: "mid", color: "#f2b705", min: 40 },
  { key: "midlow", color: "#e8833a", min: 20 },
  { key: "low", color: "#e23744", min: 0 },
];

/** @param pct 0–100 */
export function scoreBand(pct: number): ScoreBand {
  return (
    SCORE_BANDS.find((b) => pct >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1]
  );
}

export function scoreColor(pct: number): string {
  return scoreBand(pct).color;
}

/**
 * Hard-stop gradient stops for a line drawn over [lo, hi].
 *
 * Offsets are in the path's own bounding box (0 = hi, 1 = lo), not pixels, so
 * the banding stays correct at any container size without measuring the chart.
 */
export function bandGradientStops(
  lo: number,
  hi: number,
): { offset: number; color: string }[] {
  const top = scoreBand(hi);
  if (hi <= lo) return [{ offset: 0, color: top.color }];

  const at = (v: number) => (hi - v) / (hi - lo);
  const stops = [{ offset: 0, color: top.color }];

  let band = top;
  // Walk down the boundaries the line actually crosses, doubling each stop so
  // the colour switches abruptly instead of blending through a wrong band.
  while (band.min > lo) {
    const next = scoreBand(band.min - 1);
    stops.push({ offset: at(band.min), color: band.color });
    stops.push({ offset: at(band.min), color: next.color });
    band = next;
  }

  stops.push({ offset: 1, color: band.color });
  return stops;
}

/** Percent of max, clamped and rounded. Guards the max_score = 0 row. */
export function scorePct(score: number, maxScore: number): number {
  if (!maxScore || maxScore <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
}
