import type { Key } from "@/i18n";

const midnight = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const daysAgo = (date: Date) =>
  Math.round(
    (midnight(new Date()).getTime() - midnight(date).getTime()) / 86_400_000,
  );

/** "Today" / "Yesterday" / "Monday, 3 March" — the header a list of results
 *  groups under. Shared so the feed and the games list agree. */
export const dayLabel = (
  date: Date,
  t: (key: Key) => string,
  locale: string,
) => {
  const days = daysAgo(date);
  if (days === 0) return t("games.today");
  if (days === 1) return t("games.yesterday");
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
};

export const sameDay = (a: Date, b: Date) =>
  a.toDateString() === b.toDateString();
