import { describe, expect, it } from "vitest";
import {
  bracketIndex,
  buildGroups,
  buildKnockout,
  buildLeague,
  placings,
  qualifiers,
  raceFor,
  resolveBracket,
  seedOrder,
  type PlannedMatch,
} from "./bracket";

/** Deterministic ids, so a failure names the same match twice running. */
const ids = () => {
  let n = 0;
  return () => `m${++n}`;
};

const field = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const of = (ms: PlannedMatch[], bracket: string) =>
  ms.filter((m) => m.bracket === bracket);

/**
 * Files a result for every match that has two players, re-deriving the
 * bracket after each one, until nothing is playable. `pick` decides who
 * wins; the default is the better seed.
 */
function playOut(
  matches: PlannedMatch[],
  pick: (a: number, b: number) => number = Math.min,
) {
  let current = resolveBracket(matches);
  let guard = matches.length * 4;
  for (;;) {
    const next = current.find(
      (m) => m.winner_id === null && m.p1_id !== null && m.p2_id !== null,
    );
    if (!next) break;
    next.winner_id = pick(next.p1_id!, next.p2_id!);
    current = resolveBracket(current);
    expect(--guard, "playthrough did not converge").toBeGreaterThan(0);
  }
  return current;
}

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

describe("playing a whole bracket out", () => {
  it("has the top seed win out at every field size and shape, with nothing left stuck and exactly one final", () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 11, 16]) {
      for (const doubleElim of [false, true]) {
        for (const singleFrom of [undefined, 2, 4, 8, 16]) {
          const played = playOut(
            buildKnockout(field(n), { doubleElim, singleFrom }, ids()),
          );
          const final = played.find((m) => m.bracket === "final")!;
          expect(
            final.winner_id,
            `${n} players, doubleElim=${doubleElim}, singleFrom=${singleFrom}: the top seed should win out`,
          ).toBe(1);
          for (const m of played) {
            const stuck =
              m.winner_id === null && (m.p1_id !== null || m.p2_id !== null);
            expect(
              stuck,
              `${n}/${singleFrom}: ${m.bracket} r${m.round}s${m.slot} never resolved`,
            ).toBe(false);
          }
          expect(
            played.filter((m) => m.bracket === "final").length,
            "exactly one match is the final",
          ).toBe(1);
        }
      }
    }
  });

  it("lets a losers-bracket run survive one defeat and reach the grand final", () => {
    // The point of a losers bracket: one defeat is survivable, two is not.
    // Seed 2 loses its opener to seed 1 and still reaches the grand final.
    const ms = buildKnockout(field(4), { doubleElim: true }, ids());
    const played = playOut(ms, (a, b) =>
      a === 1 || b === 1 ? 1 : Math.min(a, b),
    );
    const final = played.find((m) => m.bracket === "final")!;
    expect(final.p1_id, "the unbeaten player comes in through seat 1").toBe(1);
    expect(
      final.p2_id,
      "somebody comes up from the losers bracket",
    ).not.toBeNull();
    expect(final.p2_id).not.toBe(1);
  });
});

describe("resolveBracket — advancement", () => {
  it("advances winners up and drops losers into the losers bracket", () => {
    const ms = buildKnockout(field(4), { doubleElim: true }, ids());
    const r1 = of(ms, "winners").filter((m) => m.round === 1);
    // 1 beats 4, 3 beats 2.
    r1[0].winner_id = 1;
    r1[1].winner_id = 3;

    const resolved = resolveBracket(ms);
    const wbFinal = resolved.find(
      (m) => m.bracket === "winners" && m.round === 2,
    )!;
    expect(
      [wbFinal.p1_id, wbFinal.p2_id],
      "winners advance",
    ).toEqual([1, 3]);

    const lb = resolved.filter(
      (m) => m.bracket === "losers" && m.round === 1,
    )[0];
    expect([lb.p1_id, lb.p2_id], "losers drop into round 1").toEqual([4, 2]);
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

describe("bracketIndex — numbering and seat provenance", () => {
  it("numbers every match once, 1..n with no gaps, winners bracket before losers", () => {
    const ms = buildKnockout(field(8), { doubleElim: true }, ids());
    const index = bracketIndex(ms);

    const numbers = ms.map((m) => index.number(m.id)!);
    expect(new Set(numbers).size, "every match numbered once").toBe(
      ms.length,
    );
    expect(
      [...numbers].sort((a, b) => a - b),
      "numbered 1..n with no gaps",
    ).toEqual(ms.map((_, i) => i + 1));

    // The winners bracket is played first, so it holds the low numbers.
    const wb = ms.filter((m) => m.bracket === "winners");
    const lb = ms.filter((m) => m.bracket === "losers");
    expect(
      Math.max(...wb.map((m) => index.number(m.id)!)) <
        Math.min(...lb.map((m) => index.number(m.id)!)),
      "the main draw is numbered before the repêchage",
    ).toBe(true);
  });

  it("explains every empty seat with a source match numbered earlier", () => {
    const ms = buildKnockout(field(8), { doubleElim: true }, ids());
    const index = bracketIndex(ms);

    for (const m of ms) {
      for (const slot of [1, 2] as const) {
        const occupied = slot === 1 ? m.p1_id : m.p2_id;
        if (occupied !== null || m.winner_id !== null) continue;
        const from = index.source(m.id, slot);
        expect(
          from,
          `${m.bracket} r${m.round}s${m.slot} seat ${slot} unexplained`,
        ).toBeTruthy();
        expect(
          from!.number < index.number(m.id)!,
          "a seat is filled by an earlier match",
        ).toBe(true);
      }
    }
  });

  it("names no source for the seat a walkover's absent loser would have fed", () => {
    // A walkover has no loser, so the seat it would have fed promises nothing.
    const ms = buildKnockout(field(5), { doubleElim: true }, ids());
    const index = bracketIndex(ms);
    const bye = ms.find(
      (m) => m.winner_id !== null && m.loser_to !== null && m.p2_id === null,
    )!;
    expect(bye.loser_to).not.toBeNull();
    expect(
      index.source(bye.loser_to!, bye.loser_to_slot as 1 | 2),
      "nobody is promised the loser of a match that was never played",
    ).toBeUndefined();
  });
});

describe("raceFor — race lengths", () => {
  const races = { race_to: 5, race_semi: 6, race_final: 7 };

  it("gives double elimination a semi race for the last round of each half and a final race for the grand final", () => {
    // Double elimination: the grand final is the final, and the last round of
    // each half is a semi — both of them feed it.
    const de = buildKnockout(field(8), { doubleElim: true }, ids());
    const race = (m: (typeof de)[number]) => raceFor(m, races, de);
    const lastWinners = Math.max(
      ...de.filter((m) => m.bracket === "winners").map((m) => m.round),
    );
    const lastLosers = Math.max(
      ...de.filter((m) => m.bracket === "losers").map((m) => m.round),
    );

    expect(race(de.find((m) => m.bracket === "final")!)).toBe(7);
    expect(
      race(de.find((m) => m.bracket === "winners" && m.round === lastWinners)!),
    ).toBe(6);
    expect(
      race(de.find((m) => m.bracket === "losers" && m.round === lastLosers)!),
    ).toBe(6);
    expect(
      race(de.find((m) => m.bracket === "winners" && m.round === 1)!),
      "an opener is the base race",
    ).toBe(5);
  });

  it("labels a single-elimination semi and final without double-counting either", () => {
    // Single elimination: the last winners round is the semi, and the match
    // after it is already labelled `final` — so nothing is counted as both.
    const se = buildKnockout(field(8), { doubleElim: false }, ids());
    const semis = se.filter((m) => m.bracket === "winners" && m.round === 2);
    expect(semis.length).toBe(2);
    for (const m of semis) expect(raceFor(m, races, se)).toBe(6);
    expect(raceFor(se.find((m) => m.bracket === "final")!, races, se)).toBe(
      7,
    );
  });

  it("gives a round robin no closing stage", () => {
    const league = buildLeague(field(4), 1, ids());
    for (const m of league) expect(raceFor(m, races, league)).toBe(5);
  });

  it("falls back unset overrides to the base race rather than to nothing", () => {
    const de = buildKnockout(field(8), { doubleElim: true }, ids());
    const flat = { race_to: 4, race_semi: null, race_final: null };
    for (const m of de) expect(raceFor(m, flat, de)).toBe(4);
  });
});

describe("placings — the podium", () => {
  it("makes third place one player in double elimination, since the losers final decides it", () => {
    const played = playOut(buildKnockout(field(8), { doubleElim: true }, ids()));
    const { first, second, third } = placings(played);
    expect(first, "the top seed wins out").toBe(1);
    expect(second).not.toBeNull();
    expect(second).not.toBe(first);
    expect(third.length, "third place was actually played").toBe(1);
    expect(!third.includes(first!) && !third.includes(second!)).toBe(true);
  });

  it("never separates the two beaten semi-finalists in single elimination", () => {
    const played = playOut(
      buildKnockout(field(8), { doubleElim: false }, ids()),
    );
    const { first, second, third } = placings(played);
    expect(first).toBe(1);
    expect(third.length, "joint third").toBe(2);
    expect(
      new Set([first, second, ...third]).size,
      "four distinct names",
    ).toBe(4);
  });

  it("has nobody in third for a two-player final", () => {
    const played = playOut(buildKnockout(field(2), { doubleElim: true }, ids()));
    expect(placings(played)).toEqual({ first: 1, second: 2, third: [] });
  });

  it("shows nothing until the final has been played", () => {
    const unplayed = buildKnockout(field(4), { doubleElim: true }, ids());
    expect(placings(unplayed)).toEqual({
      first: null,
      second: null,
      third: [],
    });
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
