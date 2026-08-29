/**
 * The daily table: one point for turning up, one for the win, and half a point
 * for every rack past the margin the divisions predicted. Beating someone two
 * divisions above you is worth more than beating your equal by the same score.
 *
 * Pure so it can be checked without a renderer — see dailyScore.test.ts.
 * The all-time board is Elo instead, in hooks/useEloRanking.ts.
 */
import type { Game, Player, DailyRankingEntry } from "@/types";

const POINTS_PLAYED = 1;
const POINTS_WIN = 1;
const POINTS_MARGIN_BONUS = 0.5;

/** How many racks the winner was expected to win by, from the divisions alone.
 *  Category 1 is the strongest, so a 1 beating a 3 is expected to be a 2-rack
 *  job and earns no bonus for being one. */
const expectedMargin = (winner: DailyRankingEntry, loser: DailyRankingEntry) =>
  loser.category - winner.category;

/** How many results the score string shows. */
const FORM_LENGTH = 10;

export function tallyDaily(
  games: Game[],
  players: Player[],
): DailyRankingEntry[] {
  const entryById = new Map<number, DailyRankingEntry>(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        playerName: player.name,
        category: player.category,
        points: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        racksLosed: 0,
        racksWon: 0,
        last10Games: [],
      },
    ]),
  );

  // Newest first, stated here rather than inherited from the caller's query:
  // the form string is documented most-recent-first, so the order results
  // arrive in decides which ten of them get shown.
  const newestFirst = [...games].sort((a, b) =>
    b.played_at.localeCompare(a.played_at),
  );

  for (const game of newestFirst) {
    const p1 = entryById.get(game.player_1_id);
    const p2 = entryById.get(game.player_2_id);
    if (!p1 || !p2) continue;

    const s1 = game.player_1_score;
    const s2 = game.player_2_score;
    // Numeric columns, so this only fires on data that got in another way.
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue;

    // A draw has no winner to award, and a match is played to a decider, so an
    // equal row is bad data rather than a result. Counting it made a single
    // player both the winner and the loser of the same match.
    if (s1 === s2) continue;

    const p1Won = s1 > s2;
    const winner = p1Won ? p1 : p2;
    const loser = p1Won ? p2 : p1;
    // Racks belong to whoever won them, not to a slot in the row: reading them
    // off s1/s2 handed the winner the loser's racks whenever player 2 won.
    const winnerRacks = p1Won ? s1 : s2;
    const loserRacks = p1Won ? s2 : s1;

    winner.gamesPlayed += 1;
    winner.gamesWon += 1;
    winner.points += POINTS_PLAYED + POINTS_WIN;
    winner.racksWon += winnerRacks;
    winner.racksLosed += loserRacks;

    loser.gamesPlayed += 1;
    loser.points += POINTS_PLAYED;
    loser.racksWon += loserRacks;
    loser.racksLosed += winnerRacks;

    const expected = expectedMargin(winner, loser);
    const margin = winnerRacks - loserRacks;
    if (margin > expected) {
      winner.points += (margin - expected) * POINTS_MARGIN_BONUS;
    }

    // Keep the first ten seen, which are the ten most recent. Pushing every
    // result and shifting the overflow kept the *oldest* ten instead.
    if (winner.last10Games.length < FORM_LENGTH) winner.last10Games.push(true);
    if (loser.last10Games.length < FORM_LENGTH) loser.last10Games.push(false);
  }

  return [...entryById.values()]
    .filter((entry) => entry.gamesPlayed !== 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gamesWon - a.gamesWon ||
        a.racksLosed - b.racksLosed ||
        b.category - a.category,
    );
}
