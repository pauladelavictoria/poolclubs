import { describe, expect, it } from "vitest";
import {
  eligibleToAdd,
  findOutstandingMatch,
  planKnockout,
  planStart,
  seedEntrants,
  sortPlayedMatches,
  tournamentResults,
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
    expect(
      seedEntrants([3, 1, 2], ranking, (id) =>
        id === 1 ? "Alex" : id === 3 ? "Zoe" : "Middle",
      ),
    ).toEqual([2, 1, 3]);
  });

  it("handles no ranking at all — everyone sorts by name", () => {
    expect(
      seedEntrants([3, 1, 2], null, (id) =>
        id === 1 ? "Alex" : id === 2 ? "Bea" : "Cy",
      ),
    ).toEqual([1, 2, 3]);
  });
});

describe("tournamentResults", () => {
  const league = { format: "league" as const, points_win: 3, points_play: 1 };

  it("reads a league's podium off the standings table, not the match graph", () => {
    const matches = [fixture(1, 2, { winner: 1, racks: [5, 3] })];
    expect(tournamentResults(league, [1, 2], matches).podium).toEqual({
      first: 1,
      second: 2,
      third: [],
    });
  });

  it("crowns whoever tops the points table — podium and table can't disagree", () => {
    // 2: one win, two played → 1 + 2 = 3 points; 1: one win, one played → 2.
    // Ranked on wins alone, 1 would top it (tie on wins, better racks).
    const { table, podium } = tournamentResults(
      { format: "league", points_win: 1, points_play: 1 },
      [1, 2, 3],
      [
        fixture(1, 2, { winner: 1, racks: [5, 0] }),
        fixture(2, 3, { winner: 2, racks: [5, 4] }),
      ],
    );
    expect(podium.first).toBe(2);
    expect([podium.first, podium.second, ...podium.third]).toEqual(
      table.map((r) => r.playerId),
    );
  });

  it("reads a knockout's podium off who lost to whom", () => {
    const final = fixture(1, 2, { winner: 1, racks: [5, 3] });
    final.bracket = "final";
    expect(
      tournamentResults({ ...league, format: "double_elim" }, [1, 2], [final])
        .podium,
    ).toEqual({
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
    expect(eligibleToAdd(players, null, [1]).map((p) => p.id)).toEqual([2, 3]);
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

describe("planStart — cutting a draw", () => {
  const entrants = (ids: number[], unpaid: number[] = []) =>
    ids.map((player_id) => ({ player_id, paid: !unpaid.includes(player_id) }));
  const base = {
    advance: 4,
    legs: 1 as const,
    single_from: 2,
    requires_payment: true,
  };

  it("counts the minimum on who is left once the unpaid are dropped", () => {
    // Four groups need 12; 12 entered but 5 unpaid is 7 — too thin.
    const t = {
      ...base,
      format: "group_knockout" as const,
      advance: 8,
      tournament_players: entrants(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        [8, 9, 10, 11, 12],
      ),
    };
    expect(() => planStart(t, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toThrow(
      "not enough entrants",
    );
  });

  it("drops the unpaid from a knockout and seeds only who is left", () => {
    const plan = planStart(
      {
        ...base,
        format: "double_elim",
        tournament_players: entrants([1, 2, 3, 4], [4]),
      },
      [4, 1, 2, 3],
    );
    expect(plan.drop).toEqual([4]);
    expect(plan).toMatchObject({ from: "open", to: "running" });
    const seated = plan.matches.flatMap((m) => [m.p1_id, m.p2_id]);
    expect(seated).not.toContain(4);
  });

  it("keeps a league's unpaid in the table", () => {
    const plan = planStart(
      {
        ...base,
        format: "league",
        tournament_players: entrants([1, 2, 3], [3]),
      },
      [1, 2, 3],
    );
    expect(plan.drop).toEqual([]);
    expect(plan.matches).toHaveLength(3);
  });

  it("stops a group tournament at groups", () => {
    const plan = planStart(
      {
        ...base,
        format: "group_knockout",
        advance: 2,
        tournament_players: entrants([1, 2, 3]),
      },
      [1, 2, 3],
    );
    expect(plan.to).toBe("groups");
  });
});

describe("planKnockout", () => {
  it("refuses while a group match is unplayed", () => {
    const m = fixture(1, 2);
    m.bracket = "group";
    m.group_no = 1;
    expect(() =>
      planKnockout({
        advance: 2,
        tournament_players: [{ player_id: 1 }, { player_id: 2 }],
        tournament_matches: [m],
      }),
    ).toThrow("groups unfinished");
  });
});
