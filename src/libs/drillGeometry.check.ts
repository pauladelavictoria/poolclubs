/**
 * Self-check for the drill editor maths. No test runner in this project, so:
 *   node src/libs/drillGeometry.check.ts
 */
import assert from "node:assert/strict";
import {
  BALLS,
  BALL_RADIUS,
  FELT,
  TABLE_H,
  TABLE_W,
  UNIT_X,
  UNIT_Y,
  clampBall,
  hitTest,
  isOnFelt,
  isStriped,
  pointToUnits,
  snap,
} from "./drillGeometry.ts";

// The rack: cue + 15, numbered 1-15, stripes from 9 up
assert.equal(BALLS.length, 16);
assert.deepEqual(
  BALLS.map((b) => b.label),
  [
    undefined,
    ...Array.from({ length: 15 }, (_, i) => String(i + 1)),
  ]
);
assert.equal(isStriped("8"), false);
assert.equal(isStriped("9"), true);
assert.equal(isStriped("15"), true);
assert.equal(isStriped("raya"), true);
assert.equal(isStriped(undefined), false);
assert.equal(isStriped("objetivo"), false);

assert.equal(snap(12.3), 12.5);
assert.equal(snap(12.1), 12);

// Balls stay fully on the felt
assert.deepEqual(clampBall({ x: -5, y: 80 }), {
  x: BALL_RADIUS,
  y: 50 - BALL_RADIUS,
});
assert.deepEqual(clampBall({ x: 50, y: 25 }), { x: 50, y: 25 });

// A drop only counts if it lands on the playing surface
assert.equal(isOnFelt({ x: 50, y: 25 }), true);
assert.equal(isOnFelt({ x: 0, y: 0 }), true);
assert.equal(isOnFelt({ x: -0.5, y: 25 }), false);
assert.equal(isOnFelt({ x: 50, y: 51 }), false);

// Pointer -> units, with the svg drawn at half the artwork's pixel size. The
// axes have different scales, so a felt-centre click must land at (50, 25).
const scale = 0.5;
const fakeSvg = (w: number, h: number) =>
  ({
    getBoundingClientRect: () => ({ left: 10, top: 20, width: w * scale }),
    viewBox: { baseVal: { width: w, height: h } },
  }) as unknown as SVGSVGElement;

const centre = pointToUnits(
  fakeSvg(TABLE_W, TABLE_H),
  10 + (FELT.x + UNIT_X * 50) * scale,
  20 + (FELT.y + UNIT_Y * 25) * scale
);
assert.ok(Math.abs(centre.x - 50) < 1e-9, `x was ${centre.x}`);
assert.ok(Math.abs(centre.y - 25) < 1e-9, `y was ${centre.y}`);

// Turned a quarter turn: drill x now runs up the screen from the bottom, drill
// y runs left to right. Same click, same answer.
const turned = pointToUnits(
  fakeSvg(TABLE_H, TABLE_W),
  10 + (FELT.y + UNIT_Y * 25) * scale,
  20 + (TABLE_W - FELT.x - UNIT_X * 50) * scale
);
assert.ok(Math.abs(turned.x - 50) < 1e-9, `x was ${turned.x}`);
assert.ok(Math.abs(turned.y - 25) < 1e-9, `y was ${turned.y}`);

// A corner pins the orientation: drill (0, 0) is the bottom-left of the turned
// table, not the top-left.
const headCorner = pointToUnits(
  fakeSvg(TABLE_H, TABLE_W),
  10 + FELT.y * scale,
  20 + (TABLE_W - FELT.x) * scale
);
assert.ok(Math.abs(headCorner.x) < 1e-9, `x was ${headCorner.x}`);
assert.ok(Math.abs(headCorner.y) < 1e-9, `y was ${headCorner.y}`);

// Hit testing: topmost ball wins, then paths, then nothing
const balls = [
  { x: 20, y: 20, color: "white" },
  { x: 20.5, y: 20, color: "yellow", label: "1" },
];
const paths = [{ x1: 60, y1: 10, x2: 60, y2: 40 }];

assert.deepEqual(hitTest(balls, paths, { x: 20, y: 20 }), {
  kind: "ball",
  index: 1,
});
assert.deepEqual(hitTest(balls, paths, { x: 60.5, y: 25 }), {
  kind: "path",
  index: 0,
});
// Past the end of the segment, not just off its infinite line
assert.equal(hitTest(balls, paths, { x: 60, y: 45 }), null);
assert.equal(hitTest(balls, paths, { x: 90, y: 45 }), null);

console.log("drillGeometry: ok");
