import { fmt } from "./dayLabel";

/**
 * When a tournament happens, as one line.
 *
 * The columns are `date`, not `timestamptz`, and they arrive as "2026-09-14".
 * `new Date("2026-09-14")` is midnight *UTC*, which formats as the 13th for
 * every reader west of Greenwich — so the parts are split by hand and handed to
 * the local-time constructor instead. The date a club announced is a label, not
 * an instant, and it must read the same in Madrid and in Bogotá.
 */
const parseDay = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const DAY = { day: "numeric", month: "long", year: "numeric" } as const;

/**
 * "14 September 2026", or "14 – 16 September 2026" for a draw that runs over a
 * weekend and a league that runs over a season.
 *
 * `formatRange` rather than joining two formatted dates with a dash: it is what
 * collapses the shared month and year, and it does it per locale — Spanish says
 * "14-16 de septiembre de 2026", English does not. Native to Intl, so it costs
 * nothing.
 *
 * Null when there is no start, which is the tournament nobody has dated yet:
 * every caller renders nothing rather than an empty line.
 */
export const eventDates = (
  startsOn: string | null,
  endsOn: string | null,
  locale: string,
): string | null => {
  if (!startsOn) return null;

  const from = parseDay(startsOn);
  const formatter = fmt(locale, DAY);
  if (!endsOn) return formatter.format(from);

  const to = parseDay(endsOn);
  // Same day either side is one date, not a range of length zero — formatRange
  // renders that as a plain date anyway in most locales, but not in all.
  return to.getTime() === from.getTime()
    ? formatter.format(from)
    : formatter.formatRange(from, to);
};

/** Whether a dated tournament has not started yet — what decides if the page
 *  says "starts on" or just prints the dates. */
export const isUpcoming = (startsOn: string | null, now = new Date()) =>
  !!startsOn && parseDay(startsOn).getTime() > now.getTime();
