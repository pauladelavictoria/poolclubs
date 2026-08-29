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
};

const empty = (playerId: number): Standing => ({
  playerId,
  played: 0,
  wins: 0,
  losses: 0,
  racksWon: 0,
  racksLost: 0,
  diff: 0,
});

/**
 * `playerIds` seeds the table so entrants who have not played yet still appear.
 * Only matches with a winner count; racks come from the joined game, so a
 * result filed without one (a walkover) counts as a win with no racks.
 */
export function standings(
  playerIds: number[],
  matches: TournamentMatch[],
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
    .map((r) => ({ ...r, diff: r.racksWon - r.racksLost }))
    .sort(
      (a, b) =>
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
