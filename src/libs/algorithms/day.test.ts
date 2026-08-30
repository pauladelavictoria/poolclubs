import { describe, expect, it } from "vitest";
import {
  CLUB_TZ,
  DAY_START_HOUR,
  dayKeyOf,
  dayRange,
  shiftKey,
  zoneOf,
} from "./day";

describe("shiftKey", () => {
  it("shifts a day key across month and year boundaries", () => {
    expect(DAY_START_HOUR).toBe(6);
    expect(shiftKey("2026-08-26", -1)).toBe("2026-08-25");
    expect(shiftKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftKey("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("dayKeyOf — which night a result belongs to", () => {
  it("files a small-hours result under the night before, in summer (UTC+2)", () => {
    // Summer: UTC+2, so 23:00Z is one in the morning of the *next* calendar
    // day — and that rack belongs to the night before it, which is the whole
    // point.
    expect(dayKeyOf(Date.parse("2026-08-26T23:00:00Z"))).toBe("2026-08-26"); // 01:00 local 27th
    expect(dayKeyOf(Date.parse("2026-08-25T23:00:00Z"))).toBe("2026-08-25"); // 01:00 local 26th
  });

  it("is the case this exists for, stated the other way round: 01:00 local on the 26th is 23:00Z on the 25th, and it must count as the 25th — the night it was played", () => {
    expect(dayKeyOf(Date.parse("2026-08-26T01:00:00+02:00"))).toBe(
      "2026-08-25",
    );
  });

  it("turns the day at six in the morning, either side of it", () => {
    expect(dayKeyOf(Date.parse("2026-08-26T05:59:00+02:00"))).toBe(
      "2026-08-25",
    );
    expect(dayKeyOf(Date.parse("2026-08-26T06:00:00+02:00"))).toBe(
      "2026-08-26",
    );
  });

  it("holds the same rule in winter (UTC+1) without the offset being written down anywhere", () => {
    expect(dayKeyOf(Date.parse("2026-01-16T00:30:00+01:00"))).toBe(
      "2026-01-15",
    );
    expect(dayKeyOf(Date.parse("2026-01-16T07:30:00+01:00"))).toBe(
      "2026-01-16",
    );
  });
});

describe("dayRange — the range the database is asked for", () => {
  it("returns the 06:00-to-06:00 window in summer (CEST)", () => {
    const summer = dayRange("2026-08-26");
    expect(summer.from).toBe("2026-08-26T04:00:00.000Z"); // 06:00 CEST
    expect(summer.to).toBe("2026-08-27T04:00:00.000Z");
  });

  it("returns the 06:00-to-06:00 window in winter (CET)", () => {
    const winter = dayRange("2026-01-15");
    expect(winter.from).toBe("2026-01-15T05:00:00.000Z"); // 06:00 CET
    expect(winter.to).toBe("2026-01-16T05:00:00.000Z");
  });

  it("covers all 25 hours of the night the clocks go back", () => {
    // The clocks go back at 03:00 local on 25 October 2026, so that night is
    // 25 hours long — and the range has to cover all of it or the last game
    // of it is filed into nothing.
    const dstBack = dayRange("2026-10-24");
    expect(dstBack.from).toBe("2026-10-24T04:00:00.000Z");
    expect(dstBack.to).toBe("2026-10-25T05:00:00.000Z");
    expect(
      (Date.parse(dstBack.to) - Date.parse(dstBack.from)) / 3_600_000,
    ).toBe(25);
  });

  it("covers only 23 hours of the night the clocks go forward", () => {
    const dstForward = dayRange("2026-03-28");
    expect(
      (Date.parse(dstForward.to) - Date.parse(dstForward.from)) / 3_600_000,
    ).toBe(23);
  });

  it("chains ranges half-open: the end of one is the start of the next", () => {
    expect(dayRange("2026-08-26").to).toBe(dayRange("2026-08-27").from);
  });

  it("agrees with dayKeyOf: a key and its range always contain each other", () => {
    for (const iso of [
      "2026-08-26T04:00:00.000Z",
      "2026-08-26T21:30:00.000Z",
      "2026-08-27T03:59:59.000Z",
    ]) {
      const key = dayKeyOf(Date.parse(iso));
      const { from, to } = dayRange(key);
      expect(iso >= from && iso < to, `${iso} is not inside ${key}`).toBe(
        true,
      );
    }
  });
});

describe("zoneOf — the club's own zone", () => {
  it("defaults to Europe/Madrid", () => {
    expect(CLUB_TZ).toBe("Europe/Madrid");
  });

  it("uses the club's timezone when it has one", () => {
    expect(zoneOf({ timezone: "America/Bogota" })).toBe("America/Bogota");
  });

  it("falls back rather than throwing from inside a range, for a club created before the column existed, a cleared field, or a zone this runtime has never heard of", () => {
    expect(zoneOf(null)).toBe(CLUB_TZ);
    expect(zoneOf(undefined)).toBe(CLUB_TZ);
    expect(zoneOf({ timezone: null })).toBe(CLUB_TZ);
    expect(zoneOf({ timezone: "   " })).toBe(CLUB_TZ);
    expect(zoneOf({ timezone: "Mars/Olympus_Mons" })).toBe(CLUB_TZ);
  });

  it("gives a second zone a real second night: the same instant lands on different days in the Canaries and on the mainland at half past six in the morning", () => {
    const earlyMorning = Date.parse("2026-08-27T05:30:00Z"); // 07:30 Madrid, 06:30 Canary
    expect(dayKeyOf(earlyMorning, "Europe/Madrid")).toBe("2026-08-27");
    expect(dayKeyOf(earlyMorning, "Atlantic/Canary")).toBe("2026-08-27");
    const beforeSix = Date.parse("2026-08-27T04:30:00Z"); // 06:30 Madrid, 05:30 Canary
    expect(dayKeyOf(beforeSix, "Europe/Madrid")).toBe("2026-08-27");
    expect(dayKeyOf(beforeSix, "Atlantic/Canary")).toBe("2026-08-26");
  });

  it("gives a second zone a real second range, which is why it is part of the query key", () => {
    expect(dayRange("2026-08-26", "Atlantic/Canary").from).not.toBe(
      dayRange("2026-08-26", "Europe/Madrid").from,
    );
  });
});
