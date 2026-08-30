import { describe, expect, it } from "vitest";
import type { TournamentMatch } from "@/types";
import { groupStandings, leaguePodium, standings } from "./leagueTable";
import { buildGroups } from "@/libs/algorithms/bracket";

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
        played_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}Z`,
      }
    : null,
});

describe("standings", () => {
  it("lists entrants before they have played", () => {
    const table = standings([7, 8, 9], []);
    expect(table.length).toBe(3);
    expect(table.map((r) => [r.played, r.wins, r.diff])).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it("counts wins, racks and their difference from both sides of the fixture", () => {
    const table = standings(
      [1, 2],
      [fixture(1, 2, { winner: 1, racks: [5, 3] })],
    );
    expect(table[0]).toEqual({
      playerId: 1,
      played: 1,
      wins: 1,
      losses: 0,
      racksWon: 5,
      racksLost: 3,
      diff: 2,
    });
    expect(table[1]).toEqual({
      playerId: 2,
      played: 1,
      wins: 0,
      losses: 1,
      racksWon: 3,
      racksLost: 5,
      diff: -2,
    });
  });

  it("reads racks from the game's own sides, which need not be the fixture's — player 2 was entered first when the score was filed, and still gets their 6 racks", () => {
    const match = fixture(1, 2, { winner: 2, racks: [6, 1] });
    match.game = {
      player_1_id: 2,
      player_1_score: 6,
      player_2_score: 1,
      played_at: "2026-01-01T00:00:00Z",
    };
    const table = standings([1, 2], [match]);
    expect(table[0].playerId).toBe(2);
    expect(table[0].racksWon).toBe(6);
    expect(table[1].racksWon).toBe(1);
  });

  it("counts an unplayed fixture for nothing; a walkover counts as a win with no racks, because there is no game to take them from", () => {
    const table = standings(
      [1, 2, 3],
      [fixture(1, 2), fixture(1, 3, { winner: 1, racks: [0, 0] })],
    );
    const byId = new Map(table.map((r) => [r.playerId, r]));
    expect(byId.get(1)!.played).toBe(1);
    expect(byId.get(1)!.wins).toBe(1);
    expect(byId.get(2)!.played).toBe(0);
    expect(byId.get(3)!.losses).toBe(1);
  });

  it("orders by wins, then rack difference, then racks won, then id", () => {
    const table = standings(
      [1, 2, 3],
      [
        fixture(1, 2, { winner: 1, racks: [5, 0] }),
        fixture(2, 3, { winner: 2, racks: [5, 4] }),
        fixture(3, 1, { winner: 1, racks: [2, 5] }),
      ],
    );
    expect(
      table.map((r) => r.playerId),
      "two wins first, then the one-win player",
    ).toEqual([1, 2, 3]);
    expect(table[0].wins).toBe(2);
    expect(table[0].diff).toBe(10 - 2);
  });

  it("breaks a tie on wins and difference with racks won", () => {
    const table = standings(
      [1, 2, 3, 4],
      [
        fixture(1, 2, { winner: 1, racks: [7, 5] }),
        fixture(3, 4, { winner: 3, racks: [3, 1] }),
      ],
    );
    // Both winners are +2 and both losers −2, so racks won orders each pair.
    expect(table.map((r) => r.playerId)).toEqual([1, 3, 2, 4]);
  });
});

describe("groupStandings", () => {
  it("counts only each group's own fixtures, and puts everyone in exactly one group", () => {
    const matches = buildGroups(
      [1, 2, 3, 4, 5, 6],
      2,
      1,
      () => `g${++seq}`,
    ).map((m) => ({ ...m, tournament_id: 1, game_id: null, game: null })) as TournamentMatch[];
    const tables = groupStandings([1, 2, 3, 4, 5, 6], matches, 2);
    expect(tables.length).toBe(2);
    for (const table of tables) {
      expect(table.length, "three players per group").toBe(3);
    }
    const members = tables.map((t) => t.map((r) => r.playerId).sort());
    expect(
      [...members[0], ...members[1]].sort((a, b) => a - b),
      "everyone is in exactly one group",
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("leaguePodium", () => {
  it("gives the top three, and no invented places when only two people played", () => {
    const table = standings(
      [1, 2],
      [fixture(1, 2, { winner: 1, racks: [5, 3] })],
    );
    expect(leaguePodium(table)).toEqual({ first: 1, second: 2, third: [] });
    expect(leaguePodium([])).toEqual({ first: null, second: null, third: [] });
  });
});
