import { describe, expect, it } from "vitest";
import { bandGradientStops, scoreBand, scorePct } from "./scoreBand";

describe("scoreBand", () => {
  it("puts every boundary in the band that owns it", () => {
    expect(scoreBand(100).key).toBe("high");
    expect(scoreBand(80).key).toBe("high");
    expect(scoreBand(79).key).toBe("midhigh");
    expect(scoreBand(60).key).toBe("midhigh");
    expect(scoreBand(59).key).toBe("mid");
    expect(scoreBand(40).key).toBe("mid");
    expect(scoreBand(39).key).toBe("midlow");
    expect(scoreBand(20).key).toBe("midlow");
    expect(scoreBand(19).key).toBe("low");
    expect(scoreBand(0).key).toBe("low");
  });
});

describe("scorePct", () => {
  it("never divides by zero and never leaves 0-100", () => {
    expect(scorePct(3, 10)).toBe(30);
    expect(scorePct(1, 3)).toBe(33);
    expect(scorePct(5, 0)).toBe(0);
    expect(scorePct(-1, 10)).toBe(0);
    expect(scorePct(20, 10)).toBe(100);
  });
});

describe("bandGradientStops", () => {
  it("is a single colour for a range inside one band", () => {
    expect(bandGradientStops(92, 98)).toEqual([
      { offset: 0, color: "#3fbf7f" },
      { offset: 1, color: "#3fbf7f" },
    ]);
  });

  it("does not divide by its range when flat (hi === lo)", () => {
    expect(bandGradientStops(50, 50)).toEqual([
      { offset: 0, color: "#f2b705" },
    ]);
  });

  it("doubles the stop when crossing one boundary, so the switch is hard, not blended", () => {
    expect(bandGradientStops(70, 90)).toEqual([
      { offset: 0, color: "#3fbf7f" },
      { offset: 0.5, color: "#3fbf7f" }, // 80 sits halfway down 90→70
      { offset: 0.5, color: "#9ccc4a" },
      { offset: 1, color: "#9ccc4a" },
    ]);
  });

  it("walks every band top to bottom over the full range, and ends at the last one", () => {
    const full = bandGradientStops(0, 100);
    expect(full[0].color).toBe("#3fbf7f");
    expect(full[full.length - 1].color).toBe("#e23744");
    expect(full[full.length - 1].offset).toBe(1);
    expect(full.length).toBe(2 + 2 * 4); // ends + one doubled stop per boundary
  });

  it("never lets offsets leave 0-1 or go backwards", () => {
    const full = bandGradientStops(0, 100);
    expect(
      full.every(
        (s, i) =>
          s.offset >= 0 &&
          s.offset <= 1 &&
          (i === 0 || s.offset >= full[i - 1].offset),
      ),
    ).toBe(true);
  });
});
