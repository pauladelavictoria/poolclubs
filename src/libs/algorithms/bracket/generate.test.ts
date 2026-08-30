import { describe, expect, it } from "vitest";
import {
  buildGroups,
  buildKnockout,
  buildLeague,
  qualifiers,
  seedOrder,
} from "./generate";
import { placings } from "./podium";
import { field, ids, of, playOut } from "./testHelpers";

describe("seedOrder", () => {
  it("seeds small fields, 1 meeting the last seed", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8), "1 meets 8, not 2").toEqual([
      1, 8, 4, 5, 2, 7, 3, 6,
    ]);
  });

  it("pairs i against n+1-i at every size", () => {
    for (const size of [2, 4, 8, 16, 32]) {
      const order = seedOrder(size);
      expect(new Set(order).size, "every seed placed once").toBe(size);
      for (let i = 0; i < size; i += 2) {
        expect(order[i] + order[i + 1]).toBe(size + 1);
      }
    }
  });
});

describe("buildKnockout — single elimination", () => {
  it.each([
    [2, 1],
    [4, 3],
    [5, 7],
    [8, 7],
    [16, 15],
  ] as const)("%i players makes %i matches, no losers bracket, one final", (n, expected) => {
    const ms = buildKnockout(field(n), { doubleElim: false }, ids());
    expect(ms.length).toBe(expected);
    expect(of(ms, "losers").length, "no losers bracket").toBe(0);
    expect(of(ms, "final").length, "exactly one final").toBe(1);
    expect(
      ms.filter((m) => m.winner_to === null).length,
      "only the final leads nowhere",
    ).toBe(1);
  });
});

describe("buildKnockout — double elimination", () => {
  it.each([4, 5, 8, 16])("%i players", (n) => {
    const ms = buildKnockout(field(n), { doubleElim: true }, ids());
    const size = 2 ** Math.ceil(Math.log2(n));
    // A double-elimination bracket is 2·size − 2 matches: everyone but the
    // champion loses twice, plus the single grand final.
    expect(ms.length).toBe(2 * size - 2);
    expect(of(ms, "final").length).toBe(1);

    // Every match but the final sends its winner somewhere.
    for (const m of ms) {
      if (m.bracket === "final") {
        expect(m.winner_to).toBeNull();
        continue;
      }
      expect(m.winner_to, `${m.bracket} r${m.round}s${m.slot} has no winner_to`).toBeTruthy();
      expect(m.winner_to_slot === 1 || m.winner_to_slot === 2).toBe(true);
    }

    // Every seat is fed by at most one match, or the bracket would overwrite it.
    const seats = new Map<string, number>();
    for (const m of ms) {
      for (const [to, slot] of [
        [m.winner_to, m.winner_to_slot],
        [m.loser_to, m.loser_to_slot],
      ] as const) {
        if (!to || !slot) continue;
        const key = `${to}:${slot}`;
        seats.set(key, (seats.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of seats)
      expect(count, `two feeders for ${key}`).toBe(1);

    // Only the winners bracket sheds losers, and only into the losers bracket.
    const byId = new Map(ms.map((m) => [m.id, m]));
    for (const m of ms) {
      if (!m.loser_to) continue;
      expect(m.bracket).toBe("winners");
      expect(byId.get(m.loser_to)!.bracket).toBe("losers");
    }
  });
});

describe("buildKnockout — byes", () => {
  it("resolves walkovers up front for a five-player field in an eight-slot bracket", () => {
    const ms = buildKnockout(field(5), { doubleElim: true }, ids());
    const round1 = of(ms, "winners").filter((m) => m.round === 1);
    const byes = round1.filter((m) => m.p1_id === null || m.p2_id === null);
    expect(byes.length, "three of the four openers are walkovers").toBe(3);
    for (const m of byes) {
      expect(m.winner_id, "a walkover is settled at generation").not.toBeNull();
    }
    const contested = round1.filter(
      (m) => m.p1_id !== null && m.p2_id !== null,
    );
    expect(contested.length).toBe(1);
    expect(contested[0].winner_id, "a real match waits for a result").toBeNull();

    // Walkover winners are already standing in the next round.
    const round2 = of(ms, "winners").filter((m) => m.round === 2);
    expect(
      round2.filter((m) => m.p1_id !== null || m.p2_id !== null).length,
      "both semi-finals already know at least one player",
    ).toBe(2);
  });
});

describe("buildLeague — leagues", () => {
  it.each(
    [2, 3, 4, 5, 8].flatMap((n) =>
      ([1, 2] as const).map((legs) => [n, legs] as const),
    ),
  )("%i players, %i leg(s)", (n: number, legs: 1 | 2) => {
    const ms = buildLeague(field(n), legs, ids());
    expect(ms.length).toBe((legs * n * (n - 1)) / 2);
    for (const id of field(n)) {
      const played = ms.filter((m) => m.p1_id === id || m.p2_id === id);
      expect(played.length, `player ${id} meets everyone`).toBe(
        legs * (n - 1),
      );
      expect(
        new Set(played.map((m) => (m.p1_id === id ? m.p2_id : m.p1_id)))
          .size,
        `player ${id} meets a different opponent each time`,
      ).toBe(n - 1);
    }
    // No fixture is scheduled against an empty seat, odd field or not.
    for (const m of ms) {
      expect(m.p1_id !== null && m.p2_id !== null).toBe(true);
    }
    // Nobody plays twice on the same matchday.
    const days = new Map<number, number[]>();
    for (const m of ms) {
      const day = days.get(m.round) ?? [];
      day.push(m.p1_id!, m.p2_id!);
      days.set(m.round, day);
    }
    for (const [round, players] of days) {
      expect(new Set(players).size, `clash on round ${round}`).toBe(
        players.length,
      );
    }
  });
});

describe("buildGroups — groups", () => {
  it("splits into four groups of three, snake-seeded so top seeds are not stacked", () => {
    const ms = buildGroups(field(12), 4, 1, ids());
    const groups = [1, 2, 3, 4].map((g) => ms.filter((m) => m.group_no === g));
    for (const g of groups) {
      const members = new Set(g.flatMap((m) => [m.p1_id!, m.p2_id!]));
      expect(members.size, "four groups of three").toBe(3);
      expect(g.length, "three fixtures in a group of three").toBe(3);
    }
    expect(
      groups[0].some((m) => m.p1_id === 1 || m.p2_id === 1),
      "the top seed heads the first group",
    ).toBe(true);
    // Snake seeding spreads the strength: seeds 1..4 land one per group.
    const topSeedGroups = [1, 2, 3, 4].map(
      (seed) => ms.find((m) => m.p1_id === seed || m.p2_id === seed)!.group_no,
    );
    expect(new Set(topSeedGroups).size, "top seeds are not stacked").toBe(4);
    for (const m of ms) expect(m.bracket).toBe("group");
  });
});

describe("qualifiers", () => {
  it("seeds winners first, then runners-up, and avoids a group-phase rerun in round 1", () => {
    // Four groups; winners 10,20,30,40 and runners-up 11,21,31,41.
    const tables = [10, 20, 30, 40].map((w) => [
      { playerId: w },
      { playerId: w + 1 },
    ]);
    const seeds = qualifiers(tables, 8);
    expect(seeds).toEqual([10, 20, 30, 40, 11, 21, 31, 41]);

    // Fed to the bracket, no opener is a rerun of a group match.
    const ms = buildKnockout(seeds, { doubleElim: false }, ids());
    const groupOf = (id: number) => Math.floor(id / 10);
    for (const m of ms.filter((x) => x.round === 1)) {
      expect(
        groupOf(m.p1_id!),
        `${m.p1_id} v ${m.p2_id} already met in the group phase`,
      ).not.toBe(groupOf(m.p2_id!));
    }
  });
});

describe("buildKnockout — double elimination that stops part way (singleFrom)", () => {
  it("runs double elimination through the merge and single elimination after it", () => {
    // Two lives until the last 16, one after it. 32 players: winners rounds
    // 1-2 and both losers rounds are the double-elimination half, and rounds
    // 3-6 are a plain single-elimination draw of the 8 + 8 who survive it.
    const ms = buildKnockout(
      field(32),
      { doubleElim: true, singleFrom: 16 },
      ids(),
    );
    const round = (side: string, r: number) =>
      ms.filter((m) => m.bracket === side && m.round === r);

    expect(round("winners", 1).length).toBe(16);
    expect(round("winners", 2).length).toBe(8);
    expect(round("losers", 1).length).toBe(8);
    expect(round("losers", 2).length).toBe(8);
    expect(
      ms.filter((m) => m.bracket === "losers" && m.round > 2).length,
      "the losers bracket stops at the merge",
    ).toBe(0);
    expect(round("winners", 3).length, "the merged stage is 16 players").toBe(
      8,
    );
    expect(round("winners", 4).length).toBe(4);
    expect(round("winners", 5).length).toBe(2);
    expect(ms.filter((m) => m.bracket === "final").length).toBe(1);

    // Nobody goes out on one loss before the merge, and everybody does after it.
    for (const m of ms.filter(
      (m) => m.bracket === "winners" && m.round <= 2,
    )) {
      expect(m.loser_to, `winners r${m.round} should drop its loser`).toBeTruthy();
    }
    for (const m of ms.filter((m) => m.bracket === "winners" && m.round > 2)) {
      expect(m.loser_to, "one loss is out from the merge on").toBeNull();
    }

    // The 16 seats of the merged stage are filled half from each bracket.
    const stage = round("winners", 3);
    const feeds = (slot: 1 | 2) =>
      stage.map((s) =>
        ms.find((m) => m.winner_to === s.id && m.winner_to_slot === slot)!,
      );
    expect(feeds(1).every((m) => m.bracket === "winners" && m.round === 2)).toBe(
      true,
    );
    expect(feeds(2).every((m) => m.bracket === "losers" && m.round === 2)).toBe(
      true,
    );

    const played = playOut(ms);
    const { first, second, third } = placings(played);
    expect(first, "the top seed wins out").toBe(1);
    expect(third.length, "it ends single elimination, so third is joint").toBe(
      2,
    );
    expect(
      new Set([first, second, ...third]).size,
      "four distinct names",
    ).toBe(4);
  });

  it("treats a cutoff at or above the field as the whole draw played single elimination, not an error", () => {
    // "single elimination from the last 16" over a field of eight.
    const ms = buildKnockout(
      field(8),
      { doubleElim: true, singleFrom: 16 },
      ids(),
    );
    expect(ms.filter((m) => m.bracket === "losers").length).toBe(0);
    expect(placings(playOut(ms)).third.length).toBe(2);

    // And the default is still a full double-elimination draw.
    const full = buildKnockout(field(8), { doubleElim: true }, ids());
    expect(full.some((m) => m.bracket === "losers")).toBe(true);
    expect(placings(playOut(full)).third.length).toBe(1);
  });
});
