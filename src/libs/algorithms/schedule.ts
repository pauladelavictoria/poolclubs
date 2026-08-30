import { wallClock } from "@/libs/algorithms/day";

/**
 * When a club is open.
 *
 * `clubs.schedule` is a `jsonb` column with no CHECK behind it, so this file is
 * the only thing standing between a hand-edited row and a crashed public page.
 * Everything here is tolerant by construction: `parseSchedule` never throws and
 * never returns a half-valid shape — a value it does not recognise becomes an
 * absent day, and a club with nothing valid renders as "no hours".
 *
 * jsonb rather than columns because it is display data. Nothing queries it,
 * nothing joins on it, and "open on Tuesday afternoons" is not a question the
 * database is ever asked.
 */

/** Monday first, matching libs/algorithms/monthGrid and all three locales. */
export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/** "17:00"–"23:30". A list per day, so a club that shuts for the afternoon is
 *  two ranges and a club that shuts on Monday is an absent key. */
export type Range = [string, string];
export type Schedule = Partial<Record<Weekday, Range[]>>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const isDay = (k: string): k is Weekday =>
  (WEEKDAYS as readonly string[]).includes(k);

const isRange = (v: unknown): v is Range =>
  Array.isArray(v) &&
  v.length === 2 &&
  typeof v[0] === "string" &&
  typeof v[1] === "string" &&
  HHMM.test(v[0]) &&
  HHMM.test(v[1]);

/**
 * Whatever came out of the column, as a Schedule.
 *
 * Silent about what it drops. The admin editor below is the place that refuses
 * bad input; by the time a value is being read back, complaining at a visitor
 * about the club's data would be noise they can do nothing with.
 */
export function parseSchedule(json: unknown): Schedule {
  if (typeof json !== "object" || json === null || Array.isArray(json))
    return {};

  const out: Schedule = {};
  for (const [key, value] of Object.entries(json)) {
    if (!isDay(key) || !Array.isArray(value)) continue;
    const ranges = value.filter(isRange);
    // An empty day and an absent day mean the same thing — closed — so only one
    // of them is ever stored.
    if (ranges.length > 0) out[key] = ranges;
  }
  return out;
}

/**
 * Open all day.
 *
 * An end equal to its start is the degenerate case of the wrapping rule below —
 * it runs from midnight round to midnight — so this needs no special case in
 * `isOpenNow` and never has. What it needed was a way to say it: two time
 * inputs cannot express "all day" without somebody typing 00:00 to 23:00 and
 * quietly losing an hour, which is exactly what happens in practice.
 */
export const ALL_DAY: Range = ["00:00", "00:00"];

/** One range, covering the whole day. Anything more than one range cannot be,
 *  and a day that is closed is not. */
export const isAllDay = (ranges?: Range[]) =>
  ranges?.length === 1 && ranges[0][0] === ranges[0][1];

/** Open around the clock, every day — what a 24/7 club looks like. */
export const isAlwaysOpen = (s: Schedule) =>
  WEEKDAYS.every((day) => isAllDay(s[day]));

/** That same schedule, to write. */
export const allWeek = (): Schedule =>
  Object.fromEntries(WEEKDAYS.map((day) => [day, [[...ALL_DAY] as Range]]));

/** A run of consecutive days that all say the same thing. `ranges` empty means
 *  closed, exactly as an absent day does everywhere else here. */
export type WeekRow = { days: Weekday[]; ranges: Range[] };

/** Two days say the same thing. Serialised rather than compared field by field:
 *  a day is at most a handful of ranges, and the shape is already plain data. */
const sameRanges = (a: Range[], b: Range[]) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * The week as the fewest rows that still say all of it.
 *
 * "Monday–Friday 17:00–23:00, Saturday 12:00–02:00, Sunday closed" is how
 * opening hours are written everywhere, and it is what stops a club that is
 * open around the clock rendering as seven identical lines.
 *
 * Runs are consecutive only, and the week does not wrap: a club closed on
 * Sunday and Monday gets two rows, not a "Sunday–Monday" that reads as a span
 * running the wrong way through the week. Every other hours table in the world
 * does it this way.
 */
export function weekRows(s: Schedule): WeekRow[] {
  const rows: WeekRow[] = [];

  for (const day of WEEKDAYS) {
    const ranges = s[day] ?? [];
    const last = rows[rows.length - 1];
    if (last && sameRanges(last.ranges, ranges)) last.days.push(day);
    else rows.push({ days: [day], ranges });
  }

  return rows;
}

/** Nothing set at all: the caller shows nothing rather than seven "closed"s. */
export const isEmpty = (s: Schedule) => WEEKDAYS.every((d) => !s[d]?.length);

/** The club's own weekday and "HH:MM" for an instant. The zone is the club's,
 *  never the visitor's — a member reading from another country is asking
 *  whether the *club* is open. */
function localParts(now: number, tz: string): { day: Weekday; time: string } {
  const [date, time] = wallClock(now, tz).split(" ");
  // A date key is a calendar label; parsing it as UTC gives its weekday without
  // dragging the zone back in. getUTCDay is 0 for Sunday, so rotate to Monday.
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { day: WEEKDAYS[(dow + 6) % 7], time: time.slice(0, 5) };
}

/**
 * Open right now, in the club's own clock.
 *
 * A range whose end is not after its start wraps past midnight — `["21:00",
 * "02:00"]` is a Friday that runs into Saturday morning, which is most of them.
 * That is why yesterday's ranges are checked too: at 01:00 on Saturday it is
 * *Friday's* row that is keeping the doors open. `["12:00","12:00"]` is the
 * degenerate case of the same rule and means open all day.
 *
 * Half-open, like dayRange: `from <= t < to`, so a club closing at 23:30 is shut
 * at 23:30.
 */
export function isOpenNow(s: Schedule, tz: string, now: number): boolean {
  const { day, time } = localParts(now, tz);
  const yesterday = WEEKDAYS[(WEEKDAYS.indexOf(day) + 6) % 7];

  for (const [from, to] of s[day] ?? [])
    if (to > from ? time >= from && time < to : time >= from) return true;

  // Only the tail of a wrapping range — a normal one ended yesterday.
  for (const [from, to] of s[yesterday] ?? [])
    if (to <= from && time < to) return true;

  return false;
}
