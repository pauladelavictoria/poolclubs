/**
 * The table a round robin produces — one row per entrant, whether the round
 * robin is a whole league or one group of a group tournament.
 *
 * Deliberately not Elo: inside a closed field everyone plays everyone, so wins
 * and rack difference say everything a rating would. The all-time board stays
 * in hooks/useEloRanking.ts and gets these games anyway, because a tournament
 * result is a normal `games` row.
 *
 * Pure — see leagueTable.test.ts.
 */
import type { TournamentMatch } from "@/types";

export type Standing = {
  playerId: number;
  played: number;
  wins: number;
  losses: number;
  racksWon: number;
  racksLost: number;
  /** racksWon − racksLost, the first tie-break after wins. */
  diff: number;
  /** wins × pointsWin + played × pointsPlay — the club's own scoring, 0 when
   *  `standings` was called with no `points` config (a group table, which has
   *  none of its own). */
  points: number;
};

/** Per-win and per-match values a league sets for itself — see
 *  `tournaments.points_win` / `points_play` in sql/schema.sql. */
export type LeaguePoints = { win: number; play: number };

/** Only the fields a result is read off, so a caller that fetched four columns
 *  of a fixture rather than the whole row can still build a table. */
export type ResultMatch = Pick<
  TournamentMatch,
  "p1_id" | "p2_id" | "winner_id" | "game"
>;

const empty = (playerId: number): Standing => ({
  playerId,
  played: 0,
  wins: 0,
  losses: 0,
  racksWon: 0,
  racksLost: 0,
  diff: 0,
  points: 0,
});

/**
 * `playerIds` seeds the table so entrants who have not played yet still appear.
 * Only matches with a winner count; racks come from the joined game, so a
 * result filed without one (a walkover) counts as a win with no racks.
 *
 * `points` ranks the table by the club's own scoring first; omitted (a group
 * table), every row's points stay 0 and the order falls back to wins as before.
 */
export function standings(
  playerIds: number[],
  matches: ResultMatch[],
  points?: LeaguePoints,
): Standing[] {
  const rows = new Map(playerIds.map((id) => [id, empty(id)]));
  const row = (id: number) => {
    const found = rows.get(id) ?? empty(id);
    rows.set(id, found);
    return found;
  };

  for (const match of matches) {
    if (match.winner_id === null) continue;
    if (match.p1_id === null || match.p2_id === null) continue;

    const winner = row(match.winner_id);
    const loser = row(
      match.p1_id === match.winner_id ? match.p2_id : match.p1_id,
    );
    winner.played += 1;
    winner.wins += 1;
    loser.played += 1;
    loser.losses += 1;

    const game = match.game;
    if (!game) continue;
    // The game stores its own sides, which need not match the fixture's.
    const p1Racks = game.player_1_score;
    const p2Racks = game.player_2_score;
    const winnerRacks =
      game.player_1_id === winner.playerId ? p1Racks : p2Racks;
    const loserRacks = game.player_1_id === winner.playerId ? p2Racks : p1Racks;

    winner.racksWon += winnerRacks;
    winner.racksLost += loserRacks;
    loser.racksWon += loserRacks;
    loser.racksLost += winnerRacks;
  }

  return [...rows.values()]
    .map((r) => ({
      ...r,
      diff: r.racksWon - r.racksLost,
      points: points ? r.wins * points.win + r.played * points.play : 0,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.diff - a.diff ||
        b.racksWon - a.racksWon ||
        a.playerId - b.playerId,
    );
}

/** A league has no final to read a podium off, so the table is the podium.
 *  Only the places the table can actually fill. */
export const leaguePodium = (table: Standing[]) => ({
  first: table[0]?.playerId ?? null,
  second: table[1]?.playerId ?? null,
  third: table[2] ? [table[2].playerId] : [],
});

/** One table per group, in group order. */
export function groupStandings(
  playerIds: number[],
  matches: TournamentMatch[],
  groups: number,
): Standing[][] {
  return Array.from({ length: groups }, (_, i) => {
    const inGroup = matches.filter((m) => m.group_no === i + 1);
    const entrants = playerIds.filter((id) =>
      inGroup.some((m) => m.p1_id === id || m.p2_id === id),
    );
    return standings(entrants, inGroup);
  });
}

/** Only the two seats, so a caller holding the four columns
 *  `leagueFixturesQuery` selects can ask these as well as one holding whole
 *  rows. */
type Seats = { p1_id: number | null; p2_id: number | null };

/**
 * The fixtures these two still owe each other.
 *
 * A list and not one match: a two-legged league has them down to play twice,
 * and which leg is being played is the caller's question — the tablet takes the
 * first one left, the game editor offers the choice.
 */
export const fixturesBetween = <F extends Seats>(
  fixtures: F[],
  a: number | null | undefined,
  b: number | null | undefined,
): F[] =>
  a == null || b == null
    ? []
    : fixtures.filter(
        (f) =>
          (f.p1_id === a && f.p2_id === b) || (f.p1_id === b && f.p2_id === a),
      );

/**
 * Whether this player still has a fixture to play — against one particular
 * opponent once the other side has been picked.
 *
 * What narrows the two name lists when a match is started *as* a league match:
 * the openings are the fixtures, so anybody the league has nothing left for is
 * not an answer to "who is playing".
 */
export const hasFixture = <F extends Seats>(
  fixtures: F[],
  id: number,
  against?: number | null,
): boolean =>
  against == null
    ? fixtures.some((f) => f.p1_id === id || f.p2_id === id)
    : id !== against && fixturesBetween(fixtures, id, against).length > 0;

/**
 * One played fixture read from `id`'s side: whether they won and the racks
 * each way — null racks for a walkover, which has no game. Null while the
 * fixture is unplayed. The game keeps its own sides, as in `standings`.
 */
export const resultFor = (match: ResultMatch, id: number) => {
  if (match.winner_id === null) return null;
  const game = match.game;
  const first = game?.player_1_id === id;
  return {
    won: match.winner_id === id,
    mine: game ? (first ? game.player_1_score : game.player_2_score) : null,
    theirs: game ? (first ? game.player_2_score : game.player_1_score) : null,
  };
};
