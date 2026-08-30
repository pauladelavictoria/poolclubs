/**
 * When a club's day starts and ends.
 *
 * Not midnight. A club night that runs to two in the morning is one night, and
 * the last three races of it belong to the night they were played in — not to a
 * Sunday nobody was there for. So a day runs from DAY_START_HOUR to
 * DAY_START_HOUR, and everything the daily ranking counts is bucketed that way.
 *
 * This is also a correctness fix and not only a nicety: the ranges used to be
 * built as UTC midnights against a locally-formatted date, so in summer every
 * result filed after 22:00 UTC — one in the morning here — landed in the
 * previous day's range and vanished from the night's own standings.
 *
 * A zone, not an offset: Spain is UTC+1 half the year and UTC+2 the other half,
 * and an offset captured in October is wrong in April. Intl knows the rules.
 *
 * Fixed in code rather than read from the device, because the server renders
 * these pages too — a range computed from the visitor's clock would be a
 * different range on each side of hydration, and a member watching from another
 * country would see the night cut in a different place than the room does.
 *
 * The club's own zone lives on its row (`clubs.timezone`, see
 * sql/schema.sql) and reaches every one of these as an argument. This is
 * the fallback for a club that has none and for a value Intl does not know: a
 * junk zone must not be able to throw inside a date range.
 */
export const CLUB_TZ = "Europe/Madrid";

/** Whether this machine's Intl knows the zone. A zone comes off a database row
 *  an admin typed into, and the zone lists of two runtimes are not identical. */
const isZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("sv-SE", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * The zone to bucket a club's nights by.
 *
 * Takes the club rather than a string so every caller reads the same field, and
 * so the fallback is in one place: an unset column, an empty string and a zone
 * this runtime has never heard of all land on CLUB_TZ rather than on an
 * exception thrown from inside a range.
 */
export const zoneOf = (club?: { timezone?: string | null } | null): string => {
  const tz = club?.timezone?.trim();
  return tz && isZone(tz) ? tz : CLUB_TZ;
};

/** 06:00. Before this, you are still in yesterday's night. */
export const DAY_START_HOUR = 6;

const pad = (n: number) => String(n).padStart(2, "0");

/** The club's wall clock for an instant, as "YYYY-MM-DD HH:mm:ss" — sortable,
 *  parseable, and the one locale that formats it that way by default.
 *
 *  Exported for libs/algorithms/schedule.ts, which asks the same question of the
 *  same zone ("what time is it *there*") and must not grow a second answer. */
export const wallClock = (ts: number, tz: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(ts));

/** How far ahead of UTC the zone is at that instant, in milliseconds. */
const offsetAt = (ts: number, tz: string) =>
  Date.parse(`${wallClock(ts, tz).replace(" ", "T")}Z`) - ts;

/** The day before or after a "YYYY-MM-DD" key, by `days`. Plain UTC arithmetic:
 *  a key is a calendar label, not an instant, so no zone is involved yet. */
export function shiftKey(key: string, days: number): string {
  const ts = Date.parse(`${key}T00:00:00Z`) + days * 86_400_000;
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * The instant a wall-clock time in the zone actually happened.
 *
 * Two passes, which is the standard way round the chicken and egg: the offset
 * depends on the instant, and the instant is what we are solving for. The first
 * pass gets within an hour, the second lands it — including on the two nights a
 * year when the clocks move.
 */
function instantOf(key: string, hour: number, tz: string): number {
  const asIfUtc = Date.parse(`${key}T${pad(hour)}:00:00Z`);
  const once = asIfUtc - offsetAt(asIfUtc, tz);
  return asIfUtc - offsetAt(once, tz);
}

/**
 * Which day a result belongs to. Anything before the start hour counts as the
 * day before — the night it was actually part of.
 */
export function dayKeyOf(
  ts: number | Date,
  tz: string = CLUB_TZ,
  startHour: number = DAY_START_HOUR,
): string {
  const at = typeof ts === "number" ? ts : ts.getTime();
  const [date, time] = wallClock(at, tz).split(" ");
  return Number(time.slice(0, 2)) < startHour ? shiftKey(date, -1) : date;
}

/**
 * The half-open range of a day, as UTC timestamps for the database.
 *
 * Half-open on purpose: `from <= t < to`, so the instant one night ends is the
 * instant the next begins and no result can land in both or neither.
 */
export function dayRange(
  key: string,
  tz: string = CLUB_TZ,
  startHour: number = DAY_START_HOUR,
): { from: string; to: string } {
  return {
    from: new Date(instantOf(key, startHour, tz)).toISOString(),
    to: new Date(instantOf(shiftKey(key, 1), startHour, tz)).toISOString(),
  };
}
