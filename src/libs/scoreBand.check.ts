/**
 * Self-check for the score bands. No test runner in this project:
 *   node src/libs/scoreBand.check.ts
 */
import assert from "node:assert/strict";
import { bandGradientStops, scoreBand, scorePct } from "./scoreBand.ts";

// Every boundary lands in the band that owns it
assert.equal(scoreBand(100).key, "high");
assert.equal(scoreBand(90).key, "high");
assert.equal(scoreBand(89).key, "midhigh");
assert.equal(scoreBand(75).key, "midhigh");
assert.equal(scoreBand(74).key, "mid");
assert.equal(scoreBand(60).key, "mid");
assert.equal(scoreBand(59).key, "midlow");
assert.equal(scoreBand(40).key, "midlow");
assert.equal(scoreBand(39).key, "low");
assert.equal(scoreBand(0).key, "low");

// scorePct never divides by zero and never leaves 0–100
assert.equal(scorePct(3, 10), 30);
assert.equal(scorePct(1, 3), 33);
assert.equal(scorePct(5, 0), 0);
assert.equal(scorePct(-1, 10), 0);
assert.equal(scorePct(20, 10), 100);

// A range inside one band is a single colour
assert.deepEqual(bandGradientStops(92, 98), [
  { offset: 0, color: "#3fbf7f" },
  { offset: 1, color: "#3fbf7f" },
]);

// A flat line (hi === lo) can't divide by its range
assert.deepEqual(bandGradientStops(50, 50), [{ offset: 0, color: "#e8833a" }]);

// Crossing one boundary doubles the stop so the switch is hard, not blended
assert.deepEqual(bandGradientStops(80, 100), [
  { offset: 0, color: "#3fbf7f" },
  { offset: 0.5, color: "#3fbf7f" }, // 90 sits halfway down 100→80
  { offset: 0.5, color: "#9ccc4a" },
  { offset: 1, color: "#9ccc4a" },
]);

// Full range walks every band, top to bottom, and ends at the last one
const full = bandGradientStops(0, 100);
assert.equal(full[0].color, "#3fbf7f");
assert.equal(full[full.length - 1].color, "#e23744");
assert.equal(full[full.length - 1].offset, 1);
assert.equal(full.length, 2 + 2 * 4); // ends + one doubled stop per boundary
// Offsets never leave 0–1 and never go backwards
assert.ok(full.every((s, i) => s.offset >= 0 && s.offset <= 1 && (i === 0 || s.offset >= full[i - 1].offset)));

console.log("scoreBand: ok");
