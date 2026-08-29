import { describe, expect, it } from "vitest";
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
} from "./drillGeometry";

describe("BALLS / isStriped", () => {
  it("racks the cue + 15, numbered 1-15, stripes from 9 up", () => {
    expect(BALLS.length).toBe(16);
    expect(BALLS.map((b) => b.label)).toEqual([
      undefined,
      ...Array.from({ length: 15 }, (_, i) => String(i + 1)),
    ]);
    expect(isStriped("8")).toBe(false);
    expect(isStriped("9")).toBe(true);
    expect(isStriped("15")).toBe(true);
    expect(isStriped("raya")).toBe(true);
    expect(isStriped(undefined)).toBe(false);
    expect(isStriped("objetivo")).toBe(false);
  });
});

describe("snap", () => {
  it("snaps to the nearest half unit", () => {
    expect(snap(12.3)).toBe(12.5);
    expect(snap(12.1)).toBe(12);
  });
});

describe("clampBall", () => {
  it("keeps balls fully on the felt", () => {
    expect(clampBall({ x: -5, y: 80 })).toEqual({
      x: BALL_RADIUS,
      y: 50 - BALL_RADIUS,
    });
    expect(clampBall({ x: 50, y: 25 })).toEqual({ x: 50, y: 25 });
  });
});

describe("isOnFelt", () => {
  it("counts a drop only if it lands on the playing surface", () => {
    expect(isOnFelt({ x: 50, y: 25 })).toBe(true);
    expect(isOnFelt({ x: 0, y: 0 })).toBe(true);
    expect(isOnFelt({ x: -0.5, y: 25 })).toBe(false);
    expect(isOnFelt({ x: 50, y: 51 })).toBe(false);
  });
});

describe("pointToUnits", () => {
  // Pointer -> units, with the svg drawn at half the artwork's pixel size. The
  // axes have different scales, so a felt-centre click must land at (50, 25).
  const scale = 0.5;
  const fakeSvg = (w: number, h: number) =>
    ({
      getBoundingClientRect: () => ({ left: 10, top: 20, width: w * scale }),
      viewBox: { baseVal: { width: w, height: h } },
    }) as unknown as SVGSVGElement;

  it("maps a felt-centre click to (50, 25)", () => {
    const centre = pointToUnits(
      fakeSvg(TABLE_W, TABLE_H),
      10 + (FELT.x + UNIT_X * 50) * scale,
      20 + (FELT.y + UNIT_Y * 25) * scale,
    );
    expect(Math.abs(centre.x - 50)).toBeLessThan(1e-9);
    expect(Math.abs(centre.y - 25)).toBeLessThan(1e-9);
  });

  it("gives the same answer turned a quarter turn: drill x now runs up the screen from the bottom, drill y runs left to right", () => {
    const turned = pointToUnits(
      fakeSvg(TABLE_H, TABLE_W),
      10 + (FELT.y + UNIT_Y * 25) * scale,
      20 + (TABLE_W - FELT.x - UNIT_X * 50) * scale,
    );
    expect(Math.abs(turned.x - 50)).toBeLessThan(1e-9);
    expect(Math.abs(turned.y - 25)).toBeLessThan(1e-9);
  });

  it("pins the orientation at a corner: drill (0, 0) is the bottom-left of the turned table, not the top-left", () => {
    const headCorner = pointToUnits(
      fakeSvg(TABLE_H, TABLE_W),
      10 + FELT.y * scale,
      20 + (TABLE_W - FELT.x) * scale,
    );
    expect(Math.abs(headCorner.x)).toBeLessThan(1e-9);
    expect(Math.abs(headCorner.y)).toBeLessThan(1e-9);
  });
});

describe("hitTest", () => {
  const balls = [
    { x: 20, y: 20, color: "white" },
    { x: 20.5, y: 20, color: "yellow", label: "1" },
  ];
  const paths = [{ x1: 60, y1: 10, x2: 60, y2: 40 }];

  it("picks the topmost ball, then paths, then nothing", () => {
    expect(hitTest(balls, paths, { x: 20, y: 20 })).toEqual({
      kind: "ball",
      index: 1,
    });
    expect(hitTest(balls, paths, { x: 60.5, y: 25 })).toEqual({
      kind: "path",
      index: 0,
    });
  });

  it("misses past the end of the segment, not just off its infinite line", () => {
    expect(hitTest(balls, paths, { x: 60, y: 45 })).toBeNull();
    expect(hitTest(balls, paths, { x: 90, y: 45 })).toBeNull();
  });
});
