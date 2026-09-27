import { describe, expect, it } from "vitest";
import {
  drillOfWeek,
  pickWeeklyDrill,
  weekKey,
  weekStart,
} from "./drillOfWeek";

const drill = (id: number, max_score = 10, club_id: number | null = null) => ({
  id,
  max_score,
  club_id,
});
const pool = [drill(1), drill(2), drill(3), drill(4, 3), drill(5, 20, 7)];
const noOverride = { drill_override_id: null, drill_override_week: null };

describe("weekStart", () => {
  it("is the Monday of the week, Sunday included", () => {
    expect(weekKey(new Date(2026, 8, 28, 0, 1))).toBe("2026-09-28"); // Mon
    expect(weekKey(new Date(2026, 9, 4, 23, 59))).toBe("2026-09-28"); // Sun
    expect(weekKey(new Date(2026, 8, 27, 23, 59))).toBe("2026-09-21"); // Sun before
    expect(weekStart(new Date(2026, 9, 1, 15)).getHours()).toBe(0);
  });
});

describe("pickWeeklyDrill", () => {
  it("holds for the week and moves the next", () => {
    const mon = pickWeeklyDrill(pool, new Date(2026, 8, 28));
    expect(pickWeeklyDrill(pool, new Date(2026, 9, 4, 22))).toBe(mon);
    expect(pickWeeklyDrill(pool, new Date(2026, 9, 5))).not.toBe(mon);
  });

  it("never picks a low-cap or a club drill", () => {
    for (let w = 0; w < 30; w++) {
      const got = pickWeeklyDrill(pool, new Date(2026, 0, 5 + w * 7));
      expect([1, 2, 3]).toContain(got?.id);
    }
    expect(pickWeeklyDrill([drill(4, 3)], new Date())).toBeUndefined();
  });
});

describe("drillOfWeek", () => {
  const d = new Date(2026, 9, 1);

  it("uses the club's pick only in its own week", () => {
    const club = { drill_override_id: 5, drill_override_week: "2026-09-28" };
    expect(drillOfWeek(club, pool, d)?.id).toBe(5);
    expect(drillOfWeek(club, pool, new Date(2026, 9, 6))).toBe(
      pickWeeklyDrill(pool, new Date(2026, 9, 6)),
    );
  });

  it("falls back when there is no pick or it is gone", () => {
    expect(drillOfWeek(noOverride, pool, d)).toBe(pickWeeklyDrill(pool, d));
    const gone = { drill_override_id: 99, drill_override_week: "2026-09-28" };
    expect(drillOfWeek(gone, pool, d)).toBe(pickWeeklyDrill(pool, d));
  });
});
