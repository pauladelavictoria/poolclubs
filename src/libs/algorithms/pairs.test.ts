import { describe, expect, it } from "vitest";
import { canPair, pairNameOf, pairRules, partnersOf } from "./pairs";

describe("canPair", () => {
  it("takes any pair with no minimum", () => {
    expect(canPair(null, 1, 1)).toBe(true);
  });

  it("lets a 1 pair only with a 3 when the sum is at least 4", () => {
    expect(canPair(4, 1, 3)).toBe(true);
    expect(canPair(4, 1, 2)).toBe(false);
    expect(canPair(4, 1, 1)).toBe(false);
    expect(canPair(4, 2, 2)).toBe(true);
    expect(canPair(4, 3, 3)).toBe(true);
  });
});

describe("pairRules", () => {
  const offered = (c: Parameters<typeof pairRules>[0]) =>
    pairRules(c).map((r) => [r.minSum, r.forbidden.map((p) => p.join("+"))]);

  it("offers three rules across every division", () => {
    expect(offered(null)).toEqual([
      [3, ["1+1"]],
      [4, ["1+1", "1+2"]],
      [5, ["1+1", "1+2", "1+3", "2+2"]],
    ]);
  });

  it("offers only what the ticked divisions can meet", () => {
    expect(offered([2, 3])).toEqual([[5, ["2+2"]]]);
    expect(offered([1, 2])).toEqual([[3, ["1+1"]]]);
    // 3 and 4 rule out the same pair here, so it is one rule.
    expect(offered([1, 3])).toEqual([[3, ["1+1"]]]);
    expect(offered([3])).toEqual([]);
  });
});

describe("pairNameOf", () => {
  it("names a pair by both, and a single entrant alone", () => {
    const names = new Map([
      [1, "Ana"],
      [2, "Luis"],
      [3, "Eva"],
    ]);
    const nameOf = pairNameOf(
      partnersOf([
        { player_id: 1, partner_id: 2 },
        { player_id: 3, partner_id: null },
      ]),
      (id) => names.get(id)!,
    );
    expect(nameOf(1)).toBe("Ana / Luis");
    expect(nameOf(3)).toBe("Eva");
  });
});
