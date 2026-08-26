/**
 * Self-check for the club's day boundary. No test runner in this project:
 *   node src/libs/day.check.ts
 */
import assert from "node:assert/strict";
import {
  CLUB_TZ,
  DAY_START_HOUR,
  dayKeyOf,
  dayRange,
  shiftKey,
  zoneOf,
} from "./day.ts";

assert.equal(DAY_START_HOUR, 6);
assert.equal(shiftKey("2026-08-26", -1), "2026-08-25");
assert.equal(shiftKey("2026-03-01", -1), "2026-02-28");
assert.equal(shiftKey("2026-12-31", 1), "2027-01-01");

// --- which night a result belongs to ----------------------------------------

// Summer: UTC+2, so 23:00Z is one in the morning of the *next* calendar day —
// and that rack belongs to the night before it, which is the whole point.
assert.equal(dayKeyOf(Date.parse("2026-08-26T23:00:00Z")), "2026-08-26"); // 01:00 local 27th
assert.equal(dayKeyOf(Date.parse("2026-08-25T23:00:00Z")), "2026-08-25"); // 01:00 local 26th

// The case this exists for, stated the other way round: 01:00 local on the 26th
// is 23:00Z on the 25th, and it must count as the 25th — the night it was
// played — rather than falling out of both days the way it used to.
assert.equal(dayKeyOf(Date.parse("2026-08-26T01:00:00+02:00")), "2026-08-25");

// Six in the morning is the turn of the day, either side of it.
assert.equal(dayKeyOf(Date.parse("2026-08-26T05:59:00+02:00")), "2026-08-25");
assert.equal(dayKeyOf(Date.parse("2026-08-26T06:00:00+02:00")), "2026-08-26");

// Winter: UTC+1, and the same rule holds without the offset being written down
// anywhere.
assert.equal(dayKeyOf(Date.parse("2026-01-16T00:30:00+01:00")), "2026-01-15");
assert.equal(dayKeyOf(Date.parse("2026-01-16T07:30:00+01:00")), "2026-01-16");

// --- the range the database is asked for ------------------------------------

const summer = dayRange("2026-08-26");
assert.equal(summer.from, "2026-08-26T04:00:00.000Z"); // 06:00 CEST
assert.equal(summer.to, "2026-08-27T04:00:00.000Z");

const winter = dayRange("2026-01-15");
assert.equal(winter.from, "2026-01-15T05:00:00.000Z"); // 06:00 CET
assert.equal(winter.to, "2026-01-16T05:00:00.000Z");

// The clocks go back at 03:00 local on 25 October 2026, so that night is 25
// hours long — and the range has to cover all of it or the last game of it is
// filed into nothing.
const dstBack = dayRange("2026-10-24");
assert.equal(dstBack.from, "2026-10-24T04:00:00.000Z");
assert.equal(dstBack.to, "2026-10-25T05:00:00.000Z");
assert.equal(
  (Date.parse(dstBack.to) - Date.parse(dstBack.from)) / 3_600_000,
  25,
);

// And forward in March: that night is 23 hours.
const dstForward = dayRange("2026-03-28");
assert.equal(
  (Date.parse(dstForward.to) - Date.parse(dstForward.from)) / 3_600_000,
  23,
);

// Every instant belongs to exactly one day: the end of one range is the start
// of the next, and the ranges are half-open.
assert.equal(dayRange("2026-08-26").to, dayRange("2026-08-27").from);

// A key and its range agree, which is the whole contract between them.
for (const iso of [
  "2026-08-26T04:00:00.000Z",
  "2026-08-26T21:30:00.000Z",
  "2026-08-27T03:59:59.000Z",
]) {
  const key = dayKeyOf(Date.parse(iso));
  const { from, to } = dayRange(key);
  assert.ok(iso >= from && iso < to, `${iso} is not inside ${key}`);
}

assert.equal(CLUB_TZ, "Europe/Madrid");

// --- the club's own zone -----------------------------------------------------

assert.equal(zoneOf({ timezone: "America/Bogota" }), "America/Bogota");

// Everything unusable falls back rather than throwing from inside a range: a
// club created before the column existed, a cleared field, and a zone this
// runtime has never heard of are the same case to a night boundary.
assert.equal(zoneOf(null), CLUB_TZ);
assert.equal(zoneOf(undefined), CLUB_TZ);
assert.equal(zoneOf({ timezone: null }), CLUB_TZ);
assert.equal(zoneOf({ timezone: "   " }), CLUB_TZ);
assert.equal(zoneOf({ timezone: "Mars/Olympus_Mons" }), CLUB_TZ);

// A second zone really is a second night: the same instant belongs to different
// days in the Canaries and on the mainland at half past six in the morning.
const earlyMorning = Date.parse("2026-08-27T05:30:00Z"); // 07:30 Madrid, 06:30 Canary
assert.equal(dayKeyOf(earlyMorning, "Europe/Madrid"), "2026-08-27");
assert.equal(dayKeyOf(earlyMorning, "Atlantic/Canary"), "2026-08-27");
const beforeSix = Date.parse("2026-08-27T04:30:00Z"); // 06:30 Madrid, 05:30 Canary
assert.equal(dayKeyOf(beforeSix, "Europe/Madrid"), "2026-08-27");
assert.equal(dayKeyOf(beforeSix, "Atlantic/Canary"), "2026-08-26");

// And a second zone is a second range, which is why it is part of the query key.
assert.notEqual(
  dayRange("2026-08-26", "Atlantic/Canary").from,
  dayRange("2026-08-26", "Europe/Madrid").from,
);

console.log("day: ok");
