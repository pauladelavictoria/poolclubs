/**
 * Self-check for the round-robin table. No test runner in this project:
 *   node src/libs/leagueTable.check.ts
 */
import assert from "node:assert/strict";
import type { TournamentMatch } from "../types/index.ts";
import { groupStandings, leaguePodium, standings } from "./leagueTable.ts";
import { buildGroups } from "./bracket.ts";

let seq = 0;
const fixture = (
  p1: number,
  p2: number,
  result?: { winner: number; racks: [number, number] },
): TournamentMatch => ({
  id: `m${++seq}`,
  tournament_id: 1,
  bracket: "league",
  round: 1,
  slot: 0,
  group_no: null,
  p1_id: p1,
  p2_id: p2,
  winner_id: result?.winner ?? null,
  game_id: result ? `g${seq}` : null,
  winner_to: null,
  winner_to_slot: null,
  loser_to: null,
  loser_to_slot: null,
  game: result
    ? {
        player_1_id: p1,
        player_1_score: result.racks[0],
        player_2_score: result.racks[1],
        created_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}Z`,
      }
    : null,
});

// Entrants appear before they have played.
{
  const table = standings([7, 8, 9], []);
  assert.equal(table.length, 3);
  assert.deepEqual(
    table.map((r) => [r.played, r.wins, r.diff]),
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
  );
}

// Wins, racks and their difference, from both sides of the fixture.
{
  const table = standings(
    [1, 2],
    [fixture(1, 2, { winner: 1, racks: [5, 3] })],
  );
  assert.deepEqual(table[0], {
    playerId: 1,
    played: 1,
    wins: 1,
    losses: 0,
    racksWon: 5,
    racksLost: 3,
    diff: 2,
  });
  assert.deepEqual(table[1], {
    playerId: 2,
    played: 1,
    wins: 0,
    losses: 1,
    racksWon: 3,
    racksLost: 5,
    diff: -2,
  });
}

// The game keeps its own sides, which need not be the fixture's. Player 2 was
// entered first when the score was filed, and still gets their 6 racks.
{
  const match = fixture(1, 2, { winner: 2, racks: [6, 1] });
  match.game = {
    player_1_id: 2,
    player_1_score: 6,
    player_2_score: 1,
    created_at: "2026-01-01T00:00:00Z",
  };
  const table = standings([1, 2], [match]);
  assert.equal(table[0].playerId, 2);
  assert.equal(table[0].racksWon, 6);
  assert.equal(table[1].racksWon, 1);
}

// An unplayed fixture counts for nothing; a walkover counts as a win with no
// racks, because there is no game to take them from.
{
  const table = standings(
    [1, 2, 3],
    [fixture(1, 2), fixture(1, 3, { winner: 1, racks: [0, 0] })],
  );
  const byId = new Map(table.map((r) => [r.playerId, r]));
  assert.equal(byId.get(1)!.played, 1);
  assert.equal(byId.get(1)!.wins, 1);
  assert.equal(byId.get(2)!.played, 0);
  assert.equal(byId.get(3)!.losses, 1);
}

// Order: wins, then rack difference, then racks won, then id.
{
  const table = standings(
    [1, 2, 3],
    [
      fixture(1, 2, { winner: 1, racks: [5, 0] }),
      fixture(2, 3, { winner: 2, racks: [5, 4] }),
      fixture(3, 1, { winner: 1, racks: [2, 5] }),
    ],
  );
  assert.deepEqual(
    table.map((r) => r.playerId),
    [1, 2, 3],
    "two wins first, then the one-win player",
  );
  assert.equal(table[0].wins, 2);
  assert.equal(table[0].diff, 10 - 2);
}

// Equal on wins and difference: more racks won breaks the tie.
{
  const table = standings(
    [1, 2, 3, 4],
    [
      fixture(1, 2, { winner: 1, racks: [7, 5] }),
      fixture(3, 4, { winner: 3, racks: [3, 1] }),
    ],
  );
  // Both winners are +2 and both losers −2, so racks won orders each pair.
  assert.deepEqual(table.map((r) => r.playerId), [1, 3, 2, 4]);
}

// Groups: each table only counts its own group's fixtures.
{
  const matches = buildGroups([1, 2, 3, 4, 5, 6], 2, 1, () => `g${++seq}`).map(
    (m) => ({ ...m, tournament_id: 1, game_id: null, game: null }),
  ) as TournamentMatch[];
  const tables = groupStandings([1, 2, 3, 4, 5, 6], matches, 2);
  assert.equal(tables.length, 2);
  for (const table of tables) {
    assert.equal(table.length, 3, "three players per group");
  }
  const members = tables.map((t) => t.map((r) => r.playerId).sort());
  assert.deepEqual(
    [...members[0], ...members[1]].sort((a, b) => a - b),
    [1, 2, 3, 4, 5, 6],
    "everyone is in exactly one group",
  );
}

// The podium a league feeds to the feed card: top three, and no invented
// places when only two people played.
{
  const table = standings(
    [1, 2],
    [fixture(1, 2, { winner: 1, racks: [5, 3] })],
  );
  assert.deepEqual(leaguePodium(table), { first: 1, second: 2, third: [] });
  assert.deepEqual(leaguePodium([]), { first: null, second: null, third: [] });
}

console.log("leagueTable.check.ts ok");
