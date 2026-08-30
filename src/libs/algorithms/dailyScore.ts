/**
 * The daily table: one point for turning up, one for the win, and half a point
 * for every rack past the margin the divisions predicted. Beating someone two
 * divisions above you is worth more than beating your equal by the same score.
 *
 * A row is two sides, not two players: doubles pays each of the four the same as
 * a singles match pays its two, and the racks belong to the side rather than to
 * a seat.
 *
 * Pure so it can be checked without a renderer — see dailyScore.test.ts.
 * The all-time board is Elo instead, in libs/algorithms/elo.ts.
 */
import type { Game, Player, DailyRankingEntry } from "@/types";
import { seatsOfSide } from "./night";

const POINTS_PLAYED = 1;
const POINTS_WIN = 1;
/** A pair's division is the mean of the two, so a doubles bonus can land on a
 *  quarter point. Deliberate: rounding the pair first would make a 1 & 3 either
 *  a 1 or a 2, and neither is what they are. */
const POINTS_MARGIN_BONUS = 0.5;

/** How many racks the winner was expected to win by, from the divisions alone.
 *  Category 1 is the strongest, so a 1 beating a 3 is expected to be a 2-rack
 *  job and earns no bonus for being one. */
const expectedMargin = (winnerCategory: number, loserCategory: number) =>
  loserCategory - winnerCategory;

/** The mean division of a side — the player's own for singles. */
const categoryOf = (side: DailyRankingEntry[]) =>
  side.reduce((sum, entry) => sum + entry.category, 0) / side.length;

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

  // A side is one entry for singles and two for doubles. Ids nobody on the
  // roster answers to — a partner who has since left the club — drop out, and
  // the rest of the row still counts.
  const sideOf = (game: Game, side: 1 | 2) =>
    seatsOfSide(game, side)
      .map((id) => entryById.get(id))
      .filter((entry): entry is DailyRankingEntry => entry !== undefined);

  for (const game of newestFirst) {
    const side1 = sideOf(game, 1);
    const side2 = sideOf(game, 2);
    if (side1.length === 0 || side2.length === 0) continue;

    const s1 = game.player_1_score;
    const s2 = game.player_2_score;
    // Numeric columns, so this only fires on data that got in another way.
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) continue;

    // A draw has no winner to award, and a match is played to a decider, so an
    // equal row is bad data rather than a result. Counting it made a single
    // player both the winner and the loser of the same match.
    if (s1 === s2) continue;

    const p1Won = s1 > s2;
    const winners = p1Won ? side1 : side2;
    const losers = p1Won ? side2 : side1;
    // Racks belong to whoever won them, not to a slot in the row: reading them
    // off s1/s2 handed the winner the loser's racks whenever player 2 won.
    const winnerRacks = p1Won ? s1 : s2;
    const loserRacks = p1Won ? s2 : s1;

    const expected = expectedMargin(categoryOf(winners), categoryOf(losers));
    const margin = winnerRacks - loserRacks;
    const bonus =
      margin > expected ? (margin - expected) * POINTS_MARGIN_BONUS : 0;

    for (const winner of winners) {
      winner.gamesPlayed += 1;
      winner.gamesWon += 1;
      winner.points += POINTS_PLAYED + POINTS_WIN + bonus;
      winner.racksWon += winnerRacks;
      winner.racksLosed += loserRacks;
      // Keep the first ten seen, which are the ten most recent. Pushing every
      // result and shifting the overflow kept the *oldest* ten instead.
      if (winner.last10Games.length < FORM_LENGTH)
        winner.last10Games.push(true);
    }

    for (const loser of losers) {
      loser.gamesPlayed += 1;
      loser.points += POINTS_PLAYED;
      loser.racksWon += loserRacks;
      loser.racksLosed += winnerRacks;
      if (loser.last10Games.length < FORM_LENGTH) loser.last10Games.push(false);
    }
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
