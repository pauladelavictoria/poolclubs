import type { Key } from "@/i18n";

const formatters = new Map<string, Intl.DateTimeFormat>();

export function fmt(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, formatter);
  }
  return formatter;
}

const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

/** "14:35" — the time a result was logged. */
export const timeOf = (date: Date, locale: string) =>
  fmt(locale, TIME).format(date);

/** False for a backdated result, which is stamped at midnight rather than a
 *  fabricated "now" — see toPlayedAt in AddGamePage. Not a perfect test (a
 *  match really played at 00:00:00 reads the same), but a rack finishing on
 *  the stroke of midnight is not a case worth a real flag for. */
export const hasTime = (date: Date) =>
  date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;

const midnight = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const daysAgo = (date: Date) =>
  Math.round(
    (midnight(new Date()).getTime() - midnight(date).getTime()) / 86_400_000,
  );

/**
 * "Today" / "Yesterday" / "Monday, 3 March" — the header a list of results
 * groups under. Shared so the feed and the games list agree.
 *
 * `daysAgo` compares against `new Date()` in the local timezone, and the server's
 * is not the reader's — so for a few hours either side of midnight the server can
 * render "Yesterday" where the browser says "Today". The two call sites carry
 * suppressHydrationWarning for exactly that, and the client's answer wins on the
 * first render.
 *
 * ponytail: the honest fix is passing the reader's timezone down from a loader,
 * or rendering the rules client-only. Neither is worth it for a label that is
 * wrong for one hour a day and self-corrects immediately.
 */
export const dayLabel = (
  date: Date,
  t: (key: Key) => string,
  locale: string,
) => {
  const days = daysAgo(date);
  if (days === 0) return t("games.today");
  if (days === 1) return t("games.yesterday");
  return fmt(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
};

const sameDay = (a: Date, b: Date) =>
  a.toDateString() === b.toDateString();

export const startsNewDay = (date: Date, previous?: Date) =>
  !previous || !sameDay(date, previous);
