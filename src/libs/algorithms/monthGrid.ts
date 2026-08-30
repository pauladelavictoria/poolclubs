/**
 * A month, laid out as the cells of a calendar.
 *
 * Pure string and UTC arithmetic, for the same reason `shiftKey` in day.ts is:
 * a "YYYY-MM-DD" key is a calendar label, not an instant. Which *night* a game
 * belongs to is a zone question and day.ts answers it; where the 14th sits in a
 * grid is not, and dragging a timezone into this would only give the layout a
 * way to be wrong at midnight.
 */

/** "YYYY-MM" — a month key, the first seven characters of a day key. */
export const monthOf = (dayKey: string) => dayKey.slice(0, 7);

const parts = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return { y, m };
};

const pad = (n: number) => String(n).padStart(2, "0");

/** The month `n` months either side of this one. Day 1 of month `m + n`, which
 *  `Date.UTC` normalises across the year boundary on its own. */
export function shiftMonth(month: string, n: number): string {
  const { y, m } = parts(month);
  const at = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}`;
}

/** Every day key in the month, in order. `Date.UTC(y, m, 0)` is day zero of the
 *  *next* month, which is the last day of this one — leap years included. */
export function daysInMonth(month: string): string[] {
  const { y, m } = parts(month);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${month}-${pad(i + 1)}`);
}

/**
 * The month padded with nulls to whole weeks, for rendering as a 7-column grid.
 *
 * Monday first, hardcoded. `Intl.Locale.prototype.getWeekInfo` is the honest
 * answer, but all three languages this app speaks (es-ES, en-GB, fr-FR) start
 * the week on Monday, and the app still supports an old tablet's Chrome — see
 * libs/browser/polyfills. So the correct call and the lazy one agree.
 *
 * ponytail: revisit the day a Sunday-first locale is added; it is one line
 * (`(dow - firstDay + 7) % 7`) plus a feature check, not a rewrite.
 */
export function monthGrid(month: string): (string | null)[] {
  const days = daysInMonth(month);
  const { y, m } = parts(month);
  // getUTCDay is 0 for Sunday; +6 % 7 rotates that to 0 for Monday.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...days];
  // Trailing blanks so every row is full and the grid does not reflow when the
  // month changes under it.
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
