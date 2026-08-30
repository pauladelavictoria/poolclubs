import { describe, expect, it } from "vitest";
import { buildKnockout } from "./generate";
import { bracketIndex } from "./numbering";
import { field, ids } from "./testHelpers";

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
