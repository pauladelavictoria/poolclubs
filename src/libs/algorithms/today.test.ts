import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETUP,
  balanceDoubles,
  clampRace,
  decodeSetup,
  encodeSetup,
  pairKey,
  seatsNeeded,
  suggestGroups,
} from "./today";

describe("encodeSetup / decodeSetup", () => {
  it("round-trips, which is what the cookie is for", () => {
    const doubles = {
      mode: "doubles" as const,
      discipline: "8ball" as const,
      raceTo: 7,
    };
    expect(encodeSetup(doubles)).toBe("doubles:8ball:7");
    expect(decodeSetup(encodeSetup(doubles))).toEqual(doubles);
  });

  it("defaults when nothing is set yet, which is every club's first night", () => {
    expect(decodeSetup(null)).toEqual(DEFAULT_SETUP);
  });

  it("falls back per-field rather than taking the page down, since a cookie is text a person can edit", () => {
    expect(decodeSetup("nonsense")).toEqual(DEFAULT_SETUP);
    expect(decodeSetup("doubles:snooker:5")).toEqual({
      ...DEFAULT_SETUP,
      mode: "doubles",
    });
    expect(decodeSetup("single:9ball:0").raceTo).toBe(DEFAULT_SETUP.raceTo);
    expect(decodeSetup("single:9ball:900").raceTo).toBe(DEFAULT_SETUP.raceTo);
    expect(decodeSetup("single:9ball:2.5").raceTo).toBe(DEFAULT_SETUP.raceTo);
  });
});

describe("clampRace", () => {
  it("clamps to the 1-50 range", () => {
    expect(clampRace(0)).toBe(1);
    expect(clampRace(99)).toBe(50);
    expect(clampRace(7)).toBe(7);
  });
});

describe("seatsNeeded", () => {
  it("needs four names before a doubles suggestion is one", () => {
    expect(seatsNeeded(DEFAULT_SETUP)).toBe(2);
    expect(seatsNeeded({ ...DEFAULT_SETUP, mode: "doubles" })).toBe(4);
  });
});

describe("suggestGroups — who could play whom", () => {
  const p = (id: number) => ({ id });
  const met = (pairs: [number, number][]) => {
    const seen = new Set(pairs.map(([a, b]) => pairKey(a, b)));
    return (a: number, b: number) => seen.has(pairKey(a, b));
  };

  it("has a symmetric pairKey", () => {
    expect(pairKey(2, 1)).toBe(pairKey(1, 2));
  });

  it("deals the two longest waiters one to each table rather than against each other, when nobody has played", () => {
    // The next two arrivals fill them: both of the long waits get a table.
    expect(
      suggestGroups([p(1), p(2), p(3), p(4)], 2, met([])).map((g) =>
        g.map((x) => x.id),
      ),
    ).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  it("seeds a rematched pair to different tables so they never meet again while there is another table", () => {
    expect(
      suggestGroups([p(1), p(2), p(3), p(4)], 2, met([[1, 2]])).map((g) =>
        g.map((x) => x.id),
      ),
    ).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  it("still offers something rather than nothing when everybody has played everybody", () => {
    expect(
      suggestGroups([p(1), p(2)], 2, met([[1, 2]])).map((g) =>
        g.map((x) => x.id),
      ),
    ).toEqual([[1, 2]]);
  });

  it("requires all four doubles seats to be new to the other three", () => {
    expect(
      suggestGroups(
        [p(1), p(2), p(3), p(4), p(5)],
        4,
        met([
          [1, 2],
          [1, 3],
        ]),
      ).map((g) => g.map((x) => x.id)),
    ).toEqual([[1, 4, 5, 2]]);
  });

  it("does not move the suggestion when somebody checks in far from the head of the queue — the number of matches formed must not depend on how many people are in the room", () => {
    const queue = [p(1), p(2), p(3), p(4), p(5)];
    const before = suggestGroups(queue, 4, met([]), 1);
    const after = suggestGroups(
      [...queue, p(6), p(7), p(8), p(9)],
      4,
      met([]),
      1,
    );
    expect(before.map((g) => g.map((x) => x.id))).toEqual(
      after.map((g) => g.map((x) => x.id)),
    );
    expect(before[0].map((x) => x.id)).toEqual([1, 2, 3, 4]);
  });

  it("returns as many groups as asked for, however many are waiting", () => {
    const queue = [p(1), p(2), p(3), p(4), p(5)];
    expect(suggestGroups(queue, 2, met([]), 1).length).toBe(1);
  });

  it("does not suggest a doubles match from three people", () => {
    expect(suggestGroups([p(1), p(2), p(3)], 4, met([]))).toEqual([]);
  });

  it("does not rematch the only pair who have played just because everybody ahead of them is already placed", () => {
    const sixth = suggestGroups(
      [p(1), p(2), p(3), p(4), p(5), p(6)],
      2,
      met([[5, 6]]),
    ).map((g) => g.map((x) => x.id));
    expect(sixth.length).toBe(3);
    for (const [a, b] of sixth) {
      expect(!(a === 5 && b === 6) && !(a === 6 && b === 5), "5 and 6 rematched").toBe(
        true,
      );
    }
  });
});

describe("balanceDoubles — levelling the pairs", () => {
  const div = (id: number, category: number) => ({ id, category });

  it("pairs one of each division against one of each, given two firsts and two thirds", () => {
    expect(
      balanceDoubles([div(1, 1), div(2, 1), div(3, 3), div(4, 3)]).map(
        (x) => x.id,
      ),
    ).toEqual([1, 3, 2, 4]);
  });

  it("leaves the queue's own order standing when already level", () => {
    expect(
      balanceDoubles([div(1, 1), div(2, 3), div(3, 2), div(4, 2)]).map(
        (x) => x.id,
      ),
    ).toEqual([1, 2, 3, 4]);
  });

  it("levels two seconds against a first and a third as closely as it can", () => {
    expect(
      balanceDoubles([div(1, 1), div(2, 2), div(3, 2), div(4, 3)]).map(
        (x) => x.id,
      ),
    ).toEqual([1, 4, 2, 3]);
  });

  it("leaves singles, or anything else that is not four, alone", () => {
    expect(balanceDoubles([div(1, 1), div(2, 3)]).map((x) => x.id)).toEqual([
      1, 2,
    ]);
  });
});
