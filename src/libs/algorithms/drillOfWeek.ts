/**
 * The drill of the week: one drill the whole app plays for seven days, so a
 * score means something next to everybody else's.
 *
 * Only drills whose score has room to separate players are picked. The catalog
 * is all bounded (max_score 3–100), and a drill out of 3 is a board of ties at
 * the top. A club admin can still pick any drill for their own club.
 *
 * ponytail: rule, not flag — add drills.weekly if the pool needs hand curation.
 */
export const MIN_WEEKLY_MAX_SCORE = 10;

type Pickable = { id: number; club_id: number | null; max_score: number };

/** Monday 00:00, local time. The board counts logs from here. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

/** The week's Monday as the `date` column stores it. */
export function weekKey(d: Date): string {
  const m = weekStart(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${m.getFullYear()}-${pad(m.getMonth() + 1)}-${pad(m.getDate())}`;
}

export const isWeeklyEligible = (drill: Pickable) =>
  drill.club_id === null && drill.max_score >= MIN_WEEKLY_MAX_SCORE;

/**
 * Same pick for every club and every device in a given week.
 *
 * ponytail: rotation by id, so a new drill reshuffles the weeks after it —
 * store a schedule if anybody ever plans around next week's drill.
 */
export function pickWeeklyDrill<T extends Pickable>(
  drills: T[],
  d: Date,
): T | undefined {
  const pool = drills.filter(isWeeklyEligible).sort((a, b) => a.id - b.id);
  if (pool.length === 0) return undefined;
  const m = weekStart(d);
  // UTC of the local Monday: whole days, no DST hour to round away.
  const days = Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) / 86400000;
  return pool[Math.floor(days / 7) % pool.length];
}

/** The club's own pick while it is still this week's, else the rotation. */
export function drillOfWeek<T extends Pickable>(
  club: {
    drill_override_id: number | null;
    drill_override_week: string | null;
  },
  drills: T[],
  d: Date,
): T | undefined {
  if (
    club.drill_override_id !== null &&
    club.drill_override_week === weekKey(d)
  ) {
    const own = drills.find((x) => x.id === club.drill_override_id);
    if (own) return own;
  }
  return pickWeeklyDrill(drills, d);
}
