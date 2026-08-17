/**
 * Self-check for the daily table. No test runner in this project:
 *   node src/libs/dailyScore.check.ts
 */
import assert from "node:assert/strict";
import type { Game, Player } from "../types/index.ts";
import { tallyDaily } from "./dailyScore.ts";

const player = (id: number, category: 1 | 2 | 3): Player => ({
  id,
  name: `p${id}`,
  category,
  club_id: 1,
  status: "active",
  person_id: id,
  slug: `p${id}`,
  user_id: null,
  avatar_url: null,
  is_public: true,
});

/** Same division either side, so no margin is expected of anyone by default. */
const PLAYERS = [player(1, 2), player(2, 2)];

let seq = 0;
const game = (
  p1: number,
  s1: number,
  p2: number,
  s2: number,
  at = `2026-03-0${++seq}T10:00:00.000Z`,
): Game => ({
  id: `g${seq}`,
  club_id: 1,
  player_1_id: p1,
  player_2_id: p2,
  player_1_score: s1,
  player_2_score: s2,
  player_1b_id: null,
  player_2b_id: null,
  played_at: at,
  created_at: at,
  mode: "single",
  discipline: "9ball",
});

const byId = (rows: ReturnType<typeof tallyDaily>, id: number) =>
  rows.find((r) => r.playerId === id)!;

// The bug this exists for: racks follow whoever won them, not the column they
// were written in. Player 2 wins 5-2, so player 2 has five and player 1 has two.
{
  const rows = tallyDaily([game(1, 2, 2, 5)], PLAYERS);
  assert.equal(byId(rows, 2).racksWon, 5);
  assert.equal(byId(rows, 2).racksLosed, 2);
  assert.equal(byId(rows, 1).racksWon, 2);
  assert.equal(byId(rows, 1).racksLosed, 5);
  assert.equal(byId(rows, 2).gamesWon, 1);
  assert.equal(byId(rows, 1).gamesWon, 0);
}

// ...and the same match with the winner in column one, for symmetry
{
  const rows = tallyDaily([game(1, 5, 2, 2)], PLAYERS);
  assert.equal(byId(rows, 1).racksWon, 5);
  assert.equal(byId(rows, 1).racksLosed, 2);
  assert.equal(byId(rows, 2).racksWon, 2);
}

// A draw is not a result: it used to make player 2 both winner and loser, worth
// two matches and a win that never happened.
{
  const rows = tallyDaily([game(1, 3, 2, 3)], PLAYERS);
  assert.deepEqual(rows, []);
}

// Points: 1 for playing, 1 for the win, half per rack past the expected margin.
// Equal divisions expect 0, so a 5-2 win pays 2 + 3 * 0.5.
{
  const rows = tallyDaily([game(1, 5, 2, 2)], PLAYERS);
  assert.equal(byId(rows, 1).points, 3.5);
  assert.equal(byId(rows, 2).points, 1);
}

// A stronger player (category 1) beating a weaker one (3) is expected to win by
// two, so only the third rack of a 3-0 earns a bonus: 2 + 1 * 0.5.
{
  const rows = tallyDaily([game(1, 3, 2, 0)], [player(1, 1), player(2, 3)]);
  assert.equal(byId(rows, 1).points, 2.5);
}

// Beating someone two divisions above you is expected to be a loss, so every
// rack of the margin counts: 2 + (3 - -2) * 0.5.
{
  const rows = tallyDaily([game(1, 3, 2, 0)], [player(1, 3), player(2, 1)]);
  assert.equal(byId(rows, 1).points, 4.5);
}

// A win under the expected margin is worth the win and nothing more
{
  const rows = tallyDaily([game(1, 3, 2, 2)], [player(1, 1), player(2, 3)]);
  assert.equal(byId(rows, 1).points, 2);
}

// Unknown players and unparseable scores are skipped, not counted
assert.deepEqual(tallyDaily([game(1, 5, 99, 2)], PLAYERS), []);
{
  // The columns are bigint, so a non-number can only arrive if something wrote
  // one another way. Skipped rather than scored as a zero.
  const bad = { ...game(1, 5, 2, 2), player_1_score: NaN };
  assert.deepEqual(tallyDaily([bad], PLAYERS), []);
}

// Form is the ten most recent, newest first — not the ten oldest, which is what
// pushing everything and shifting the overflow left behind.
{
  // Twelve matches, oldest first in the input, player 1 winning only the last
  const many = Array.from({ length: 12 }, (_, i) =>
    game(1, i === 11 ? 5 : 0, 2, i === 11 ? 0 : 5, `2026-04-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`),
  );
  const rows = tallyDaily(many, PLAYERS);
  const form = byId(rows, 1).last10Games;
  assert.equal(form.length, 10);
  // The most recent match is player 1's only win, and it leads
  assert.equal(form[0], true);
  assert.equal(form.slice(1).some(Boolean), false);
  // Every match still counts towards the totals, only the form is capped
  assert.equal(byId(rows, 1).gamesPlayed, 12);
}

// Order: points, then wins, then fewest racks conceded, then lower division
{
  const rows = tallyDaily(
    [game(1, 5, 2, 0), game(2, 5, 3, 4), game(3, 0, 1, 5)],
    [player(1, 2), player(2, 2), player(3, 2)],
  );
  assert.deepEqual(
    rows.map((r) => r.playerId),
    [1, 2, 3],
  );
  assert.ok(rows[0].points >= rows[1].points);
}

// The input array is left alone — it is react-query's cached data
{
  const games = [game(1, 5, 2, 0), game(2, 5, 1, 0)];
  const before = games.map((g) => g.id);
  tallyDaily(games, PLAYERS);
  assert.deepEqual(
    games.map((g) => g.id),
    before,
  );
}

console.log("dailyScore: ok");
