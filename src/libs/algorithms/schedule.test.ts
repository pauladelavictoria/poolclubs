import { describe, expect, it } from "vitest";
import {
  allWeek,
  isAllDay,
  isAlwaysOpen,
  isEmpty,
  isOpenNow,
  parseSchedule,
  weekRows,
} from "./schedule";

const TZ = "Europe/Madrid";
/** 2026-08-28 is a Friday, 2026-08-29 a Saturday. */
const at = (iso: string) => Date.parse(iso);

describe("parseSchedule — tolerant, because the column has no CHECK", () => {
  it("keeps a well-formed schedule", () => {
    const raw = { mon: [["17:00", "23:30"]], sat: [["12:00", "15:00"]] };
    expect(parseSchedule(raw)).toEqual(raw);
  });

  it("returns {} for anything that is not an object of days", () => {
    for (const junk of [null, undefined, 42, "mon", [], [["17:00", "18:00"]]])
      expect(parseSchedule(junk)).toEqual({});
  });

  it("drops unknown keys and malformed ranges rather than throwing", () => {
    expect(
      parseSchedule({
        mon: [["17:00", "23:30"]],
        // Not a weekday.
        funday: [["10:00", "11:00"]],
        // Wrong arity, wrong types, and times that are not times.
        tue: [["17:00"], ["17:00", "23:30", "x"], [17, 23], ["25:00", "9:00"]],
        wed: "closed",
      }),
    ).toEqual({ mon: [["17:00", "23:30"]] });
  });

  it("treats a day whose ranges are all junk as absent, not empty", () => {
    const parsed = parseSchedule({ mon: [["nope", "nope"]] });
    expect(parsed.mon).toBeUndefined();
    expect(isEmpty(parsed)).toBe(true);
  });

  it("keeps a split day as two ranges", () => {
    const raw = {
      wed: [
        ["10:00", "14:00"],
        ["17:00", "22:00"],
      ],
    };
    expect(parseSchedule(raw).wed).toHaveLength(2);
  });
});

describe("isOpenNow", () => {
  const evening = parseSchedule({ fri: [["17:00", "23:30"]] });

  it("is half-open: open at the start, shut at the end", () => {
    expect(isOpenNow(evening, TZ, at("2026-08-28T17:00:00+02:00"))).toBe(true);
    expect(isOpenNow(evening, TZ, at("2026-08-28T23:29:00+02:00"))).toBe(true);
    expect(isOpenNow(evening, TZ, at("2026-08-28T23:30:00+02:00"))).toBe(false);
    expect(isOpenNow(evening, TZ, at("2026-08-28T16:59:00+02:00"))).toBe(false);
  });

  it("is shut on a day with no ranges", () => {
    expect(isOpenNow(evening, TZ, at("2026-08-27T20:00:00+02:00"))).toBe(false);
    expect(isOpenNow({}, TZ, at("2026-08-28T20:00:00+02:00"))).toBe(false);
  });

  it("keeps a range that crosses midnight open into the next morning", () => {
    // The common case: Friday 21:00 to 02:00. At one in the morning on
    // Saturday it is Friday's row that is still running.
    const late = parseSchedule({ fri: [["21:00", "02:00"]] });
    expect(isOpenNow(late, TZ, at("2026-08-28T22:00:00+02:00"))).toBe(true);
    expect(isOpenNow(late, TZ, at("2026-08-29T01:00:00+02:00"))).toBe(true);
    expect(isOpenNow(late, TZ, at("2026-08-29T02:00:00+02:00"))).toBe(false);
    // Saturday evening has no row of its own, so the wrap must not leak.
    expect(isOpenNow(late, TZ, at("2026-08-29T22:00:00+02:00"))).toBe(false);
  });

  it("reads the club's clock, not the visitor's", () => {
    // 23:00Z is one in the morning in Madrid — Saturday there, Friday in UTC.
    // A Saturday-only schedule must therefore be open at that instant.
    const sat = parseSchedule({ sat: [["01:00", "03:00"]] });
    expect(isOpenNow(sat, TZ, at("2026-08-28T23:00:00Z"))).toBe(true);
    // And the same instant in a zone where it is still Friday must not be.
    expect(isOpenNow(sat, "Europe/London", at("2026-08-28T23:00:00Z"))).toBe(
      false,
    );
  });

  it("treats an end equal to its start as open all day", () => {
    const always = parseSchedule({ fri: [["12:00", "12:00"]] });
    expect(isOpenNow(always, TZ, at("2026-08-28T13:00:00+02:00"))).toBe(true);
    expect(isOpenNow(always, TZ, at("2026-08-29T11:00:00+02:00"))).toBe(true);
  });
});

describe("open around the clock", () => {
  it("recognises a whole-day range", () => {
    expect(isAllDay([["00:00", "00:00"]])).toBe(true);
    expect(isAllDay([["12:00", "12:00"]])).toBe(true);
    expect(isAllDay([["09:00", "17:00"]])).toBe(false);
    expect(isAllDay([])).toBe(false);
    expect(isAllDay(undefined)).toBe(false);
    // Two ranges cannot be "all day" — there is a gap between them by
    // definition, or they would be one range.
    expect(
      isAllDay([
        ["00:00", "00:00"],
        ["09:00", "17:00"],
      ]),
    ).toBe(false);
  });

  it("round-trips a 24/7 week through the parser", () => {
    const week = allWeek();
    expect(isAlwaysOpen(week)).toBe(true);
    expect(isAlwaysOpen(parseSchedule(week))).toBe(true);
    expect(isEmpty(week)).toBe(false);
  });

  it("is never open on a week that is missing a day", () => {
    const week = allWeek();
    delete week.wed;
    expect(isAlwaysOpen(week)).toBe(false);
    expect(isAlwaysOpen({})).toBe(false);
  });

  it("is actually open at every hour it claims", () => {
    // The property that matters. A 24/7 club must read as open at 03:00 on a
    // Sunday as much as at midday on a Tuesday.
    const week = allWeek();
    for (const iso of [
      "2026-08-24T00:00:00+02:00", // Monday, midnight
      "2026-08-26T03:00:00+02:00",
      "2026-08-28T12:00:00+02:00",
      "2026-08-30T23:59:00+02:00", // Sunday, last minute
    ])
      expect(isOpenNow(week, "Europe/Madrid", Date.parse(iso))).toBe(true);
  });
});

describe("weekRows — the week as the fewest rows that still say all of it", () => {
  const shape = (s: Parameters<typeof weekRows>[0]) =>
    weekRows(s).map((r) => [r.days.join("+"), JSON.stringify(r.ranges)]);

  it("collapses a whole identical week into one row", () => {
    // The case that prompted this: 24/7 rendered as seven identical lines.
    expect(shape(allWeek())).toEqual([
      ["mon+tue+wed+thu+fri+sat+sun", '[["00:00","00:00"]]'],
    ]);
  });

  it("collapses an empty schedule into one closed row", () => {
    expect(shape({})).toEqual([["mon+tue+wed+thu+fri+sat+sun", "[]"]]);
  });

  it("splits weekdays from the weekend", () => {
    const week = parseSchedule({
      mon: [["17:00", "23:00"]],
      tue: [["17:00", "23:00"]],
      wed: [["17:00", "23:00"]],
      thu: [["17:00", "23:00"]],
      fri: [["17:00", "23:00"]],
      sat: [["12:00", "02:00"]],
    });
    expect(shape(week)).toEqual([
      ["mon+tue+wed+thu+fri", '[["17:00","23:00"]]'],
      ["sat", '[["12:00","02:00"]]'],
      ["sun", "[]"],
    ]);
  });

  it("does not wrap Sunday round to Monday", () => {
    // Closed at both ends of the week is two rows. "Sunday–Monday" would read
    // as a span running backwards through the week.
    const week = parseSchedule({
      tue: [["17:00", "23:00"]],
      wed: [["17:00", "23:00"]],
      thu: [["17:00", "23:00"]],
      fri: [["17:00", "23:00"]],
      sat: [["17:00", "23:00"]],
    });
    expect(shape(week)).toEqual([
      ["mon", "[]"],
      ["tue+wed+thu+fri+sat", '[["17:00","23:00"]]'],
      ["sun", "[]"],
    ]);
  });

  it("keeps days apart when the ranges differ at all", () => {
    const week = parseSchedule({
      mon: [["17:00", "23:00"]],
      tue: [["17:00", "23:30"]],
    });
    expect(weekRows(week)[0].days).toEqual(["mon"]);
    expect(weekRows(week)[1].days).toEqual(["tue"]);
  });

  it("does not merge a split day with a single-range day that overlaps it", () => {
    const week = parseSchedule({
      mon: [
        ["10:00", "14:00"],
        ["17:00", "22:00"],
      ],
      tue: [["10:00", "14:00"]],
    });
    expect(
      weekRows(week)
        .slice(0, 2)
        .map((r) => r.days),
    ).toEqual([["mon"], ["tue"]]);
  });

  it("always accounts for all seven days, exactly once, in order", () => {
    for (const week of [
      {},
      allWeek(),
      parseSchedule({ wed: [["1:00", "2:00"]] }),
    ]) {
      const days = weekRows(week).flatMap((r) => r.days);
      expect(days).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
    }
  });
});
