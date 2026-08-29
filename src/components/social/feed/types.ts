import type { Drill, DrillLog, Game, Tournament } from "@/types";

/** One row of the club's history: a match, a logged drill, or one of the two
 *  things that get created rather than played — a drill or a tournament. */
export type FeedItem = {
  at: string;
  /** One match, or the run of fixtures one tournament night produced. */
  games?: Game[];
  log?: DrillLog;
  drill?: Drill;
  tournament?: Tournament;
};

/** What the filter above the feed sorts rows into — one kind per row shape, so
 *  every row in the feed answers to exactly one tab. */
export type FeedKind =
  "all" | "matches" | "newDrills" | "drillResults" | "tournaments";

/** Two rows can share an instant, and one pair always does: a finished
 *  tournament is dated by its last fixture, which is a row of its own. Sorting
 *  by time alone leaves that tie to the order the lists were merged in, which
 *  put the fixture above the result it produced. The conclusion goes first. */
export const rank = (item: FeedItem) => (item.tournament ? 0 : 1);

/** How many fixtures a grouped tournament card lists before handing over to the
 *  tournament's own page. */
export const GROUP_ROWS = 5;

export const kindOf = (item: FeedItem): Exclude<FeedKind, "all"> =>
  item.games
    ? "matches"
    : item.drill
      ? "newDrills"
      : item.log
        ? "drillResults"
        : "tournaments";
