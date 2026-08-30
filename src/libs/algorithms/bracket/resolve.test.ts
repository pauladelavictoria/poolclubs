import { describe, expect, it } from "vitest";
import { buildKnockout } from "./generate";
import { resolveBracket } from "./resolve";
import { field, ids, playOut } from "./testHelpers";

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
    const r1 = ms.filter((m) => m.bracket === "winners" && m.round === 1);
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
