import { describe, expect, it } from "vitest";
import {
  eligibleToAdd,
  findOutstandingMatch,
  seedEntrants,
  sortPlayedMatches,
  tournamentPodium,
} from "./view";
import type { TournamentMatch } from "@/types";

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

describe("seedEntrants", () => {
  const nameOf = (id: number) => `Player ${id}`;

  it("orders entrants by ranking, strongest first", () => {
    const ranking = [{ playerId: 3 }, { playerId: 1 }, { playerId: 2 }];
    expect(seedEntrants([1, 2, 3], ranking, nameOf)).toEqual([3, 1, 2]);
  });

  it("sinks anyone with no games yet to the bottom, ordered by name", () => {
    const ranking = [{ playerId: 2 }];
    // 1 and 3 have no ranking entry; they fall back to name order.
    expect(seedEntrants([3, 1, 2], ranking, (id) =>
      id === 1 ? "Alex" : id === 3 ? "Zoe" : "Middle",
    )).toEqual([2, 1, 3]);
  });

  it("handles no ranking at all — everyone sorts by name", () => {
    expect(
      seedEntrants([3, 1, 2], null, (id) =>
        id === 1 ? "Alex" : id === 2 ? "Bea" : "Cy",
      ),
    ).toEqual([1, 2, 3]);
  });
});

describe("tournamentPodium", () => {
  it("reads a league's podium off the standings table, not the match graph", () => {
    const matches = [fixture(1, 2, { winner: 1, racks: [5, 3] })];
    expect(tournamentPodium("league", [1, 2], matches)).toEqual({
      first: 1,
      second: 2,
      third: [],
    });
  });

  it("reads a knockout's podium off who lost to whom", () => {
    const final = fixture(1, 2, { winner: 1, racks: [5, 3] });
    final.bracket = "final";
    expect(tournamentPodium("double_elim", [1, 2], [final])).toEqual({
      first: 1,
      second: 2,
      third: [],
    });
  });
});

describe("findOutstandingMatch", () => {
  it("finds the fixture regardless of which side each player is on", () => {
    const m = fixture(2, 1);
    expect(findOutstandingMatch([m], 1, 2)).toBe(m);
    expect(findOutstandingMatch([m], 2, 1)).toBe(m);
  });

  it("returns undefined once the fixture has a result", () => {
    const m = fixture(1, 2, { winner: 1, racks: [5, 3] });
    expect(findOutstandingMatch([m], 1, 2)).toBeUndefined();
  });

  it("returns undefined when the pair has no fixture at all", () => {
    const m = fixture(1, 2);
    expect(findOutstandingMatch([m], 1, 3)).toBeUndefined();
  });
});

describe("sortPlayedMatches", () => {
  it("orders most recently played first", () => {
    const early = fixture(1, 2, { winner: 1, racks: [5, 3] });
    early.game!.played_at = "2026-01-01T00:00:00Z";
    const late = fixture(1, 3, { winner: 1, racks: [5, 3] });
    late.game!.played_at = "2026-01-02T00:00:00Z";
    expect(sortPlayedMatches([early, late])).toEqual([late, early]);
  });

  it("does not mutate the input array", () => {
    const a = fixture(1, 2, { winner: 1, racks: [5, 3] });
    const matches = [a];
    sortPlayedMatches(matches);
    expect(matches).toEqual([a]);
  });
});

describe("eligibleToAdd", () => {
  const players = [
    { id: 1, category: 1 as const, name: "Ana" },
    { id: 2, category: 2 as const, name: "Bea" },
    { id: 3, category: 1 as const, name: "Carla" },
  ];

  it("excludes players already entered", () => {
    expect(eligibleToAdd(players, null, [1]).map((p) => p.id)).toEqual([
      2, 3,
    ]);
  });

  it("restricts to one division when the tournament has one", () => {
    expect(eligibleToAdd(players, 1, []).map((p) => p.id)).toEqual([1, 3]);
  });

  it("allows every division when the tournament has none", () => {
    expect(eligibleToAdd(players, null, []).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
  });

  // One row standing for whoever walked in that night: a bracket entry for it
  // would be several different strangers playing under one name.
  it("never offers the guest placeholder, in any division", () => {
    const withGuest = [
      ...players,
      { id: 4, category: 1 as const, name: "_Invitado" },
    ];
    expect(eligibleToAdd(withGuest, null, []).map((p) => p.id)).toEqual([
      1, 2, 3,
    ]);
    expect(eligibleToAdd(withGuest, 1, []).map((p) => p.id)).toEqual([1, 3]);
  });
});
