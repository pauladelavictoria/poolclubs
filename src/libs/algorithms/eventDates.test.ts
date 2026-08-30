import { describe, expect, it } from "vitest";
import { eventDates, isUpcoming } from "./eventDates";

describe("eventDates", () => {
  it("is null without a start", () => {
    expect(eventDates(null, "2026-09-16", "en-GB")).toBeNull();
  });

  it("prints one day when there is no end", () => {
    expect(eventDates("2026-09-14", null, "en-GB")).toBe("14 September 2026");
  });

  it("prints one day when the end is the same day", () => {
    expect(eventDates("2026-09-14", "2026-09-14", "en-GB")).toBe(
      "14 September 2026",
    );
  });

  it("collapses a range inside one month", () => {
    // The exact separator is Intl's, not ours — what matters is that both days
    // are there and the month and year are said once.
    const range = eventDates("2026-09-14", "2026-09-16", "en-GB")!;
    expect(range).toMatch(/14/);
    expect(range).toMatch(/16 September 2026/);
    expect(range.match(/September/g)).toHaveLength(1);
  });

  it("keeps both months in a range that crosses one", () => {
    const range = eventDates("2026-09-28", "2026-10-04", "en-GB")!;
    expect(range).toMatch(/September/);
    expect(range).toMatch(/October/);
  });

  /** The reason parseDay exists: `new Date("2026-09-14")` is UTC midnight, so
   *  the plain constructor renders the 13th anywhere west of Greenwich. */
  it("does not shift the day", () => {
    expect(eventDates("2026-01-01", null, "en-GB")).toBe("1 January 2026");
  });
});

describe("isUpcoming", () => {
  const now = new Date(2026, 8, 15, 12, 0);

  it("is false for no date", () => {
    expect(isUpcoming(null, now)).toBe(false);
  });

  it("is false on the day itself", () => {
    expect(isUpcoming("2026-09-15", now)).toBe(false);
  });

  it("is true before it", () => {
    expect(isUpcoming("2026-09-16", now)).toBe(true);
  });
});
