import { describe, expect, it } from "vitest";
import { groupTablesByFacts } from "./tableFacts";

const table = (
  label: string,
  facts: Partial<{
    type: string | null;
    size: string | null;
    brand: string | null;
    felt: string | null;
  }> = {},
) => ({
  label,
  type: "american_pool",
  size: "9ft",
  brand: "Rasson",
  felt: "CPBA Royal",
  ...facts,
});

describe("groupTablesByFacts — a club's tables as the fewest rows that still say all of it", () => {
  it("collapses a whole identical set into one row", () => {
    // The case this exists for: six identical tables as six copies of the
    // same line.
    const rows = groupTablesByFacts([
      table("1"),
      table("2"),
      table("3"),
      table("4"),
      table("5"),
      table("6"),
    ]);
    expect(rows).toEqual([
      {
        labels: ["1", "2", "3", "4", "5", "6"],
        type: "american_pool",
        size: "9ft",
        brand: "Rasson",
        felt: "CPBA Royal",
      },
    ]);
  });

  it("splits off a table whose facts differ at all", () => {
    const rows = groupTablesByFacts([
      table("1"),
      table("2"),
      table("Snooker", { type: "snooker", size: "12ft" }),
    ]);
    expect(rows.map((r) => r.labels)).toEqual([["1", "2"], ["Snooker"]]);
  });

  it("does not merge across a different table in between", () => {
    // Two 9ft tables either side of a snooker table stay two rows, not one —
    // the alternation is the club's own layout, not noise to smooth over.
    const rows = groupTablesByFacts([
      table("1"),
      table("Snooker", { type: "snooker", size: "12ft" }),
      table("2"),
    ]);
    expect(rows.map((r) => r.labels)).toEqual([["1"], ["Snooker"], ["2"]]);
  });

  it("gives an empty list nothing to render", () => {
    expect(groupTablesByFacts([])).toEqual([]);
  });
});
