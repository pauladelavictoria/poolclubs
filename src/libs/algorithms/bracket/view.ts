import type { ResultMatch, Standing } from "@/libs/algorithms/leagueTable";
import {
  buildGroups,
  buildKnockout,
  buildLeague,
  eligible,
  groupCount,
  minimumEntrants,
  qualifiers,
  type PlannedMatch,
} from "./generate";
import {
  groupStandings,
  leaguePodium,
  standings,
} from "@/libs/algorithms/leagueTable";
import { placings } from "./podium";
import type { MatchLike } from "./resolve";
import type { Places } from "./podium";
import type {
  BracketSide,
  Category,
  DailyRankingEntry,
  TournamentMatch,
} from "@/types";

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

/**
 * The league table and the podium, from one reading — so a page, a feed card
 * and the OG image can never crown different winners. A knockout's podium is
 * who lost to whom; a league's is the top of its own table, ranked by the
 * league's own points.
 *
 * `table` is the league table; for a knockout it is computed anyway (cheap) and
 * ignored by callers.
 */
export function tournamentResults<
  M extends ResultMatch & MatchLike & { bracket: BracketSide; round: number },
>(
  tournament: {
    format: "double_elim" | "league" | "group_knockout";
    points_win: number;
    points_play: number;
  },
  entrants: number[],
  matches: M[],
): { table: Standing[]; podium: Places } {
  const table = standings(entrants, matches, {
    win: tournament.points_win,
    play: tournament.points_play,
  });
  const podium =
    tournament.format === "league" ? leaguePodium(table) : placings(matches);
  return { table, podium };
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
export function sortPlayedMatches(
  matches: TournamentMatch[],
): TournamentMatch[] {
  return [...matches].sort((a, b) =>
    (b.game?.played_at ?? "").localeCompare(a.game?.played_at ?? ""),
  );
}

/** Who the organiser can still put in: the club roster this tournament is
 *  open to, minus whoever is already entered. */
export function eligibleToAdd<
  T extends { id: number; category: Category; name: string },
>(players: T[], category: Category | null, entrants: number[]): T[] {
  return eligible(players, category).filter((p) => !entrants.includes(p.id));
}

type Format = "double_elim" | "league" | "group_knockout";

/** A plan the database applies in one go (cut_fixtures in sql/schema.sql):
 *  entrants out, fixtures in, status moved on — all of it or none. */
export type FixturePlan = {
  from: "open" | "groups";
  to: "groups" | "running";
  drop: number[];
  matches: PlannedMatch[];
};

/**
 * Who a draw is cut for. Unpaid entrants are only caught here: the setting
 * that makes them meaningful also decides whether they can slip into a draw.
 * A league has no fixed bracket to protect, so its unpaid entrant is the club
 * chasing a payment, not a reason to leave the table.
 *
 * `field` is who is left, and what the minimum is counted against — counting
 * the unpaid who are about to go is how a group draw got cut too thin to fill
 * its groups.
 */
export function startField(tournament: {
  format: Format;
  advance: number | null;
  requires_payment: boolean;
  tournament_players: { player_id: number; paid: boolean }[];
}) {
  const drop =
    tournament.requires_payment && tournament.format !== "league"
      ? tournament.tournament_players
          .filter((e) => !e.paid)
          .map((e) => e.player_id)
      : [];
  const field = tournament.tournament_players
    .map((e) => e.player_id)
    .filter((id) => !drop.includes(id));
  return {
    drop,
    field,
    minimum: minimumEntrants(tournament.format, tournament.advance),
  };
}

/**
 * Starting a tournament: the field (see `startField`) seeded strongest first,
 * cut into the format's fixtures. A group tournament stops at "groups" — its
 * bracket is drawn only once the qualifiers are known (`planKnockout`).
 */
export function planStart(
  tournament: Parameters<typeof startField>[0] & {
    legs: 1 | 2;
    single_from: number;
  },
  seeded: number[],
): FixturePlan {
  const { drop, field, minimum } = startField(tournament);
  if (field.length < minimum) throw new Error("not enough entrants");
  const ids = seeded.filter((id) => field.includes(id));

  const format: Format = tournament.format;
  switch (format) {
    case "league":
      return {
        from: "open",
        to: "running",
        drop,
        matches: buildLeague(ids, tournament.legs),
      };
    case "double_elim":
      return {
        from: "open",
        to: "running",
        drop,
        matches: buildKnockout(ids, {
          doubleElim: true,
          singleFrom: tournament.single_from,
        }),
      };
    case "group_knockout":
      return {
        from: "open",
        to: "groups",
        drop,
        matches: buildGroups(
          ids,
          groupCount(tournament.advance ?? 2),
          tournament.legs,
        ),
      };
    default: {
      const unknown: never = format;
      throw new Error(`unknown format ${String(unknown)}`);
    }
  }
}

/** The second half of a group tournament, once every group match has a
 *  result: the qualifiers, seeded off the group tables, into a knockout. */
export function planKnockout(tournament: {
  advance: number | null;
  tournament_players: { player_id: number }[];
  tournament_matches: TournamentMatch[];
}): FixturePlan {
  const advance = tournament.advance ?? 2;
  const groupMatches = tournament.tournament_matches.filter(
    (m) => m.bracket === "group",
  );
  if (groupMatches.some((m) => m.winner_id === null))
    throw new Error("groups unfinished");

  const tables = groupStandings(
    tournament.tournament_players.map((p) => p.player_id),
    groupMatches,
    groupCount(advance),
  );
  return {
    from: "groups",
    to: "running",
    drop: [],
    matches: buildKnockout(qualifiers(tables, advance), { doubleElim: false }),
  };
}

/**
 * How many rows of each group table to mark as going through: the two per
 * group (`groupCount` is advance ÷ 2) while the groups are still being played.
 * Once the knockout is cut the bracket says who is left and the tables only say
 * how they got there, so the marks come off — on every page that shows them.
 */
export const qualifyMarks = (status: string) => (status === "groups" ? 2 : 0);
