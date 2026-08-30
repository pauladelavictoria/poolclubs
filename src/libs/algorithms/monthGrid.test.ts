import { describe, expect, it } from "vitest";
import { daysInMonth, monthGrid, monthOf, shiftMonth } from "./monthGrid";

describe("monthOf", () => {
  it("is the first seven characters of a day key", () => {
    expect(monthOf("2026-08-26")).toBe("2026-08");
  });
});

describe("shiftMonth", () => {
  it("crosses year boundaries in both directions", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-08", -12)).toBe("2025-08");
  });
});

describe("daysInMonth", () => {
  it("counts the days, leap years included", () => {
    expect(daysInMonth("2026-02")).toHaveLength(28);
    expect(daysInMonth("2024-02")).toHaveLength(29);
    expect(daysInMonth("2026-08")).toHaveLength(31);
    expect(daysInMonth("2026-11")).toHaveLength(30);
  });

  it("pads the day and keeps the keys sortable", () => {
    const days = daysInMonth("2026-08");
    expect(days[0]).toBe("2026-08-01");
    expect(days[8]).toBe("2026-08-09");
    expect(days.at(-1)).toBe("2026-08-31");
  });
});

describe("monthGrid", () => {
  it("always fills whole weeks", () => {
    for (const month of ["2026-02", "2026-08", "2024-02", "2027-02"])
      expect(monthGrid(month).length % 7).toBe(0);
  });

  it("needs no padding when a 28-day month starts on a Monday", () => {
    // February 2027 begins on a Monday, which is the one case with no blanks
    // at either end.
    const cells = monthGrid("2027-02");
    expect(cells).toHaveLength(28);
    expect(cells[0]).toBe("2027-02-01");
    expect(cells.at(-1)).toBe("2027-02-28");
  });

  it("takes six rows when a 31-day month starts on a Saturday", () => {
    // August 2026 begins on a Saturday: five blanks, then 31 days, is 36 —
    // so the grid spills into a sixth row. This is the case that reflows a
    // fixed-height calendar, which is why the trailing pad exists.
    const cells = monthGrid("2026-08");
    expect(cells).toHaveLength(42);
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(cells[5]).toBe("2026-08-01");
    expect(cells[35]).toBe("2026-08-31");
    expect(cells.slice(36)).toEqual(Array(6).fill(null));
  });

  it("puts a Sunday start at the end of the first row, not the beginning", () => {
    // February 2026 begins on a Sunday. Monday-first means six leading blanks;
    // getting the rotation wrong would show it as none.
    const cells = monthGrid("2026-02");
    expect(cells.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(cells[6]).toBe("2026-02-01");
  });

  it("holds every day of the month exactly once", () => {
    for (const month of ["2026-02", "2026-08", "2024-02", "2026-11"])
      expect(monthGrid(month).filter(Boolean)).toEqual(daysInMonth(month));
  });
});
