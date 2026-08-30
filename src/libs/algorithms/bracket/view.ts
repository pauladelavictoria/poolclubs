import { leaguePodium, standings } from "@/libs/algorithms/leagueTable";
import { eligible } from "./generate";
import { placings } from "./podium";
import type { Places } from "./podium";
import type { Category, DailyRankingEntry, TournamentMatch } from "@/types";

/**
 * The derived facts TournamentPage renders — split out of the component so
 * each is checkable on its own, rather than only through the page. See
 * view.test.ts.
 */

/** Strongest first, so the bracket seeds itself off the club's own ranking.
 *  Anyone with no games yet sits at the bottom, ordered by name. */
export function seedEntrants(
  entrants: number[],
  ranking: Pick<DailyRankingEntry, "playerId">[] | null,
  nameOf: (id: number) => string,
): number[] {
  const rank = new Map((ranking ?? []).map((e, i) => [e.playerId, i]));
  return [...entrants].sort(
    (a, b) =>
      (rank.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b) ?? Number.MAX_SAFE_INTEGER) ||
      nameOf(a).localeCompare(nameOf(b)),
  );
}

/** A knockout's podium is who lost to whom; a league's is just the top of the
 *  table, since there is no final to read it off. */
export function tournamentPodium(
  format: "double_elim" | "league" | "group_knockout",
  entrants: number[],
  matches: TournamentMatch[],
): Places {
  return format === "league"
    ? leaguePodium(standings(entrants, matches))
    : placings(matches);
}

/** The outstanding fixture between two entrants. A pair with nothing left to
 *  play has no match to file against, which is what stops a league turning
 *  into whoever-plays-most. */
export function findOutstandingMatch(
  matches: TournamentMatch[],
  a: number,
  b: number,
): TournamentMatch | undefined {
  return matches.find(
    (m) =>
      m.winner_id === null &&
      ((m.p1_id === a && m.p2_id === b) || (m.p1_id === b && m.p2_id === a)),
  );
}

/** Most recent first — a league is read as "what happened lately", not as a
 *  calendar. Fixtures generated at the same time have no order of their own,
 *  so an unplayed one falls back to its number (the caller's own order). */
export function sortPlayedMatches(matches: TournamentMatch[]): TournamentMatch[] {
  return [...matches].sort((a, b) =>
    (b.game?.played_at ?? "").localeCompare(a.game?.played_at ?? ""),
  );
}

/** Who the organiser can still put in: the club roster this tournament is
 *  open to, minus whoever is already entered. */
export function eligibleToAdd<T extends { id: number; category: Category }>(
  players: T[],
  category: Category | null,
  entrants: number[],
): T[] {
  return eligible(players, category).filter((p) => !entrants.includes(p.id));
}
