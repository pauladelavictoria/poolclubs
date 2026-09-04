import { describe, expect, it } from "vitest";
import {
  BALLS,
  BALL_RADIUS,
  CIRCLE_SPAWN_RADIUS,
  FELT,
  RECT_SPAWN_HALF,
  TABLE_H,
  TABLE_W,
  UNIT_X,
  UNIT_Y,
  clampBall,
  handlePoints,
  hitTest,
  isOnFelt,
  isStriped,
  pointToUnits,
  radiusOf,
  rectGrabAt,
  rectOf,
  snap,
  spawnShape,
} from "./drillGeometry";
import type { ShotPath } from "@/types";

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

describe("spawnShape", () => {
  it("centres an arrow on the drop and keeps both ends on the table", () => {
    expect(spawnShape("arrow", { x: 50, y: 25 })).toEqual({
      x1: 42,
      y1: 25,
      x2: 58,
      y2: 25,
      type: "solid",
    });
    // Dropped against the foot rail: slid back rather than hanging off it.
    expect(spawnShape("arrow", { x: 99, y: 25 }).x2).toBe(100);
  });

  it("stores a circle as centre plus a rim point, clamped so it fits", () => {
    const circle = spawnShape("circle", { x: 50, y: 25 });
    expect(circle.shape).toBe("circle");
    expect([circle.x1, circle.y1]).toEqual([50, 25]);
    expect(radiusOf(circle)).toBe(CIRCLE_SPAWN_RADIUS);

    // The felt is only 50 units deep, so a circle dropped on the rail moves in.
    const low = spawnShape("circle", { x: 50, y: 49 });
    expect(low.y1).toBe(50 - CIRCLE_SPAWN_RADIUS);
    expect(radiusOf(low)).toBe(CIRCLE_SPAWN_RADIUS);
  });

  it("stores a rectangle as opposite corners around the drop", () => {
    const rect = spawnShape("rect", { x: 50, y: 25 });
    expect(rect.shape).toBe("rect");
    expect(rectOf(rect)).toEqual({
      x: 50 - RECT_SPAWN_HALF.w,
      y: 25 - RECT_SPAWN_HALF.h,
      w: RECT_SPAWN_HALF.w * 2,
      h: RECT_SPAWN_HALF.h * 2,
    });
  });
});

describe("rectOf", () => {
  it("reads the corners in either order, so dragging one past the other works", () => {
    // What a resize leaves behind once you pull the bottom-right corner up and
    // to the left of the other one.
    expect(rectOf({ x1: 40, y1: 30, x2: 20, y2: 10 })).toEqual({
      x: 20,
      y: 10,
      w: 20,
      h: 20,
    });
  });
});

describe("hitTest on shapes", () => {
  const circle: ShotPath = {
    x1: 50,
    y1: 25,
    x2: 60,
    y2: 25,
    shape: "circle",
  };
  const rect: ShotPath = { x1: 20, y1: 10, x2: 40, y2: 30, shape: "rect" };

  it("hits a closed shape on its outline and anywhere inside it", () => {
    // The outline is the resize grab, the inside is the move grab, so both
    // have to select.
    expect(hitTest([], [circle], { x: 60, y: 25 })).toEqual({
      kind: "path",
      index: 0,
    });
    expect(hitTest([], [circle], { x: 50, y: 25 })).toEqual({
      kind: "path",
      index: 0,
    });
    expect(hitTest([], [rect], { x: 30, y: 20 })).toEqual({
      kind: "path",
      index: 0,
    });
  });

  it("misses outside a shape, so bare felt still deselects", () => {
    expect(hitTest([], [circle], { x: 50, y: 40 })).toBeNull();
    expect(hitTest([], [rect], { x: 50, y: 20 })).toBeNull();
  });

  it("lets a ball inside a shape win, since balls are tested first", () => {
    const ball = { x: 30, y: 20, color: "white" };
    expect(hitTest([ball], [rect], { x: 30, y: 20 })).toEqual({
      kind: "ball",
      index: 0,
    });
  });
});

describe("rectGrabAt", () => {
  // Corners stored the "wrong" way round on purpose: a resize that pulls one
  // corner past the other leaves them like this, and every grab has to keep
  // working afterwards.
  const rect: ShotPath = { x1: 40, y1: 30, x2: 20, y2: 10, shape: "rect" };
  const grab = 2;

  it("gives both coordinates for a corner, so it moves two sides at once", () => {
    expect(rectGrabAt(rect, { x: 20, y: 10 }, grab)).toEqual({
      ax: "x2",
      ay: "y2",
    });
    // The two corners that are not stored: one coordinate from each point.
    expect(rectGrabAt(rect, { x: 40, y: 10 }, grab)).toEqual({
      ax: "x1",
      ay: "y2",
    });
    expect(rectGrabAt(rect, { x: 20, y: 30 }, grab)).toEqual({
      ax: "x2",
      ay: "y1",
    });
  });

  it("gives one coordinate for a side, so dragging the top leaves the left alone", () => {
    // Middle of the top edge. Answering with both fields here is what dragged
    // the left edge to the pointer.
    expect(rectGrabAt(rect, { x: 30, y: 10 }, grab)).toEqual({ ay: "y2" });
    expect(rectGrabAt(rect, { x: 20, y: 20 }, grab)).toEqual({ ax: "x2" });
  });

  it("is null off the outline, which is a move rather than a resize", () => {
    expect(rectGrabAt(rect, { x: 30, y: 20 }, grab)).toBeNull();
    // Past the end of the top edge: felt, not the edge.
    expect(rectGrabAt(rect, { x: 60, y: 10 }, grab)).toBeNull();
  });
});

describe("handlePoints", () => {
  it("marks a circle's four cardinal points and a rectangle's four corners", () => {
    const circle: ShotPath = {
      x1: 50,
      y1: 25,
      x2: 58,
      y2: 25,
      shape: "circle",
    };
    expect(handlePoints(circle)).toEqual([
      { x: 58, y: 25 },
      { x: 42, y: 25 },
      { x: 50, y: 33 },
      { x: 50, y: 17 },
    ]);

    const rect: ShotPath = { x1: 40, y1: 30, x2: 20, y2: 10, shape: "rect" };
    expect(handlePoints(rect)).toEqual([
      { x: 20, y: 10 },
      { x: 40, y: 10 },
      { x: 20, y: 30 },
      { x: 40, y: 30 },
    ]);
  });

  it("marks an arrow's two ends", () => {
    expect(handlePoints({ x1: 10, y1: 10, x2: 30, y2: 10 })).toEqual([
      { x: 10, y: 10 },
      { x: 30, y: 10 },
    ]);
  });
});
