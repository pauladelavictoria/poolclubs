import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOOTPRINT_MM,
  GRID_SNAP_UNITS,
  ROTATE_HANDLE_OFFSET_UNITS,
  aabbOf,
  alignSnap,
  angleFromCentre,
  fitViewBox,
  footprintOf,
  hitTestTables,
  mmToUnits,
  pointInTable,
  pointToGridUnits,
  rotateHandlePoint,
  snapDrag,
  snapPosition,
  snapRotation,
  spacingSnap,
  svgScale,
  tableCorners,
  type TablePlacement,
} from "./tableFloorPlan";

/** A table at (x, y) with the default footprint (no type/size set) —
 *  every smart-guide test works off this shape, since the geometry only
 *  cares about the bounding box, not which sport it is. */
const table = (
  id: number,
  x: number,
  y: number,
  rotationDeg = 0,
): TablePlacement => ({
  id,
  x,
  y,
  rotationDeg,
  type: null,
  size: null,
});

describe("footprintOf", () => {
  it("resolves a known (type, size) pair to its real dimensions", () => {
    expect(footprintOf("american_pool", "9ft")).toEqual({
      lengthMm: 2540,
      widthMm: 1270,
    });
    expect(footprintOf("snooker", "12ft")).toEqual({
      lengthMm: 3570,
      widthMm: 1780,
    });
  });

  it("falls back to a default footprint when type or size is unset", () => {
    expect(footprintOf(null, null)).toEqual(DEFAULT_FOOTPRINT_MM);
    expect(footprintOf("american_pool", null)).toEqual(DEFAULT_FOOTPRINT_MM);
  });
});

describe("snapRotation", () => {
  it("snaps to the nearest 15 degrees", () => {
    expect(snapRotation(7)).toBe(0);
    expect(snapRotation(8)).toBe(15);
    expect(snapRotation(100)).toBe(105);
  });

  it("wraps at 0/360 and handles negative input", () => {
    expect(snapRotation(358)).toBe(0);
    expect(snapRotation(-10)).toBe(345);
    expect(snapRotation(-15)).toBe(345);
  });
});

describe("snapPosition", () => {
  it("snaps to the nearest half unit", () => {
    expect(snapPosition(12.3)).toBe(12.5);
    expect(snapPosition(12.1)).toBe(12);
    expect(GRID_SNAP_UNITS).toBe(0.5);
  });
});

describe("tableCorners", () => {
  const base: TablePlacement = {
    id: 1,
    x: 10,
    y: 10,
    rotationDeg: 0,
    type: "american_pool",
    size: "9ft",
  };

  it("gives the plain axis-aligned box at rotation 0", () => {
    const hw = mmToUnits(2540) / 2;
    const hh = mmToUnits(1270) / 2;
    expect(tableCorners(base)).toEqual([
      { x: 10 - hw, y: 10 - hh },
      { x: 10 + hw, y: 10 - hh },
      { x: 10 + hw, y: 10 + hh },
      { x: 10 - hw, y: 10 + hh },
    ]);
  });

  it("swaps the long/short extents when turned a quarter turn", () => {
    const turned = tableCorners({ ...base, rotationDeg: 90 });
    const hw = mmToUnits(2540) / 2;
    const hh = mmToUnits(1270) / 2;
    // Turned 90 degrees, the table now reaches further in y than x.
    const xs = turned.map((c) => Math.abs(c.x - 10));
    const ys = turned.map((c) => Math.abs(c.y - 10));
    expect(Math.max(...xs)).toBeCloseTo(hh, 6);
    expect(Math.max(...ys)).toBeCloseTo(hw, 6);
  });
});

describe("pointInTable", () => {
  const base: TablePlacement = {
    id: 1,
    x: 0,
    y: 0,
    rotationDeg: 0,
    type: "american_pool",
    size: "9ft",
  };

  it("always contains its own centre", () => {
    expect(pointInTable(base, { x: 0, y: 0 })).toBe(true);
  });

  it("applies rotation to the hit test, not just the drawing", () => {
    // Just outside the un-rotated table along y (widthMm side is 12.7 units,
    // half is 6.35), but well inside the lengthMm side (25.4 units, half
    // 12.7) once the table is turned 90 degrees.
    const p = { x: 0, y: 10 };
    expect(pointInTable(base, p)).toBe(false);
    expect(pointInTable({ ...base, rotationDeg: 90 }, p)).toBe(true);
  });
});

describe("hitTestTables", () => {
  const a: TablePlacement = {
    id: 1,
    x: 0,
    y: 0,
    rotationDeg: 0,
    type: "american_pool",
    size: "9ft",
  };
  const b: TablePlacement = { ...a, id: 2 };

  it("picks the topmost (last) table when two overlap", () => {
    expect(hitTestTables([a, b], { x: 0, y: 0 })).toBe(2);
  });

  it("misses past every table", () => {
    expect(hitTestTables([a, b], { x: 1000, y: 1000 })).toBeNull();
  });
});

describe("rotateHandlePoint", () => {
  it("sits a fixed distance beyond the table's foot rail, at any rotation", () => {
    const base: TablePlacement = {
      id: 1,
      x: 5,
      y: -3,
      rotationDeg: 0,
      type: "american_pool",
      size: "9ft",
    };
    const expectedReach = mmToUnits(2540) / 2 + ROTATE_HANDLE_OFFSET_UNITS;

    for (const rotationDeg of [0, 45, 90, 200]) {
      const t = { ...base, rotationDeg };
      const p = rotateHandlePoint(t);
      const dist = Math.hypot(p.x - t.x, p.y - t.y);
      expect(dist).toBeCloseTo(expectedReach, 6);
    }
  });
});

describe("angleFromCentre", () => {
  it("resolves the four cardinal points around a centre", () => {
    const centre = { x: 0, y: 0 };
    expect(angleFromCentre(centre, { x: 10, y: 0 })).toBe(0);
    expect(angleFromCentre(centre, { x: 0, y: 10 })).toBe(90);
    expect(angleFromCentre(centre, { x: -10, y: 0 })).toBe(180);
    expect(angleFromCentre(centre, { x: 0, y: -10 })).toBe(270);
  });
});

describe("fitViewBox", () => {
  it("falls back to a fixed default box for an empty layout", () => {
    expect(fitViewBox([])).toEqual({ minX: 0, minY: 0, w: 50, h: 50 });
  });

  it("frames placed tables with a margin", () => {
    const tables: TablePlacement[] = [
      { id: 1, x: 0, y: 0, rotationDeg: 0, type: null, size: null },
      { id: 2, x: 20, y: 10, rotationDeg: 0, type: null, size: null },
    ];
    const view = fitViewBox(tables, 5);
    const hw = mmToUnits(DEFAULT_FOOTPRINT_MM.lengthMm) / 2;
    const hh = mmToUnits(DEFAULT_FOOTPRINT_MM.widthMm) / 2;
    expect(view.minX).toBeCloseTo(0 - hw - 5, 6);
    expect(view.minY).toBeCloseTo(0 - hh - 5, 6);
    expect(view.w).toBeCloseTo(20 + hw + hw + 10, 6);
    expect(view.h).toBeCloseTo(10 + hh + hh + 10, 6);
  });
});

describe("pointToGridUnits", () => {
  const view = { minX: -10, minY: -5, w: 40, h: 20 };
  // 10 px per grid unit on both axes: width 400 over view.w 40, height 200
  // over view.h 20.
  const fakeSvg = () =>
    ({
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 400,
        height: 200,
      }),
    }) as unknown as SVGSVGElement;

  it("maps a known client point to a known grid point", () => {
    const p = pointToGridUnits(fakeSvg(), view, 100 + 100, 50 + 50);
    expect(p.x).toBeCloseTo(view.minX + 10, 6);
    expect(p.y).toBeCloseTo(view.minY + 5, 6);
  });

  it("maps the rect's top-left corner to (minX, minY)", () => {
    const p = pointToGridUnits(fakeSvg(), view, 100, 50);
    expect(p.x).toBeCloseTo(view.minX, 6);
    expect(p.y).toBeCloseTo(view.minY, 6);
  });

  it("accounts for letterboxing when the container's aspect ratio doesn't match the room's", () => {
    // The card is a fixed, wide, short box (h-80 w-full in the real
    // component) that rarely shares the room's own aspect ratio — a room
    // that fits one table snugly is closer to square. With the default
    // xMidYMid-meet SVG scaling, a 40x20 room in an 800x200 box is bound by
    // height (10 px/unit, not width's 20), so it renders 400px wide,
    // centred with 200px of empty padding on each side. A formula that
    // assumed the full 800px width mapped to the room's 40 units — as an
    // earlier version of this function did — would place every click 2x too
    // far right, which is exactly small enough to still land inside a big
    // table but not inside a 44px rotate handle.
    const wideSvg = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 200,
      }),
    } as unknown as SVGSVGElement;
    const wideView = { minX: 0, minY: 0, w: 40, h: 20 };

    const centre = pointToGridUnits(wideSvg, wideView, 400, 100);
    expect(centre.x).toBeCloseTo(20, 6);
    expect(centre.y).toBeCloseTo(10, 6);

    // A click in the letterboxed padding resolves off to the side of the
    // room, rather than being silently clamped onto it.
    const inPadding = pointToGridUnits(wideSvg, wideView, 50, 100);
    expect(inPadding.x).toBeLessThan(0);
  });
});

describe("svgScale", () => {
  it("is the smaller of the two axis scales, since that's the one xMidYMid meet actually binds to", () => {
    expect(svgScale({ width: 800, height: 200 }, { w: 40, h: 20 })).toBe(10);
    expect(svgScale({ width: 200, height: 800 }, { w: 20, h: 40 })).toBe(10);
  });

  it("is 0 for a not-yet-laid-out element rather than dividing by zero", () => {
    expect(svgScale({ width: 0, height: 200 }, { w: 40, h: 20 })).toBe(0);
  });
});

// The default footprint (no type/size set) is 2240x1120mm, so half its
// length is 11.2 units and half its width is 5.6 — every case below is
// worked out against those two numbers.
const closeAabb = (
  actual: { minX: number; maxX: number; minY: number; maxY: number },
  expected: { minX: number; maxX: number; minY: number; maxY: number },
) => {
  expect(actual.minX).toBeCloseTo(expected.minX, 6);
  expect(actual.maxX).toBeCloseTo(expected.maxX, 6);
  expect(actual.minY).toBeCloseTo(expected.minY, 6);
  expect(actual.maxY).toBeCloseTo(expected.maxY, 6);
};

describe("aabbOf", () => {
  it("is the plain half-length/half-width box at rotation 0", () => {
    closeAabb(aabbOf(table(1, 10, 20)), {
      minX: -1.2,
      maxX: 21.2,
      minY: 14.4,
      maxY: 25.6,
    });
  });

  it("swaps the extents when turned a quarter turn", () => {
    closeAabb(aabbOf(table(1, 0, 0, 90)), {
      minX: -5.6,
      maxX: 5.6,
      minY: -11.2,
      maxY: 11.2,
    });
  });
});

describe("alignSnap", () => {
  const tolerance = 1;

  it("snaps onto another table's centre when close, leaving a far-off axis untouched", () => {
    const other = table(1, 0, 0);
    const result = alignSnap(table(2, 0.4, 20), 0.4, 20, [other], tolerance);
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBe(20);
    expect(result.guides).toEqual([{ axis: "x", at: 0, from: -5.6, to: 25.6 }]);
  });

  it("snaps an edge onto another table's edge, not just centres", () => {
    const other = table(1, 0, 0); // right edge at maxX = 11.2
    // Dragged so its own left edge (minX) is 0.3 short of touching it.
    const result = alignSnap(table(2, 22.7, 8), 22.7, 8, [other], tolerance);
    expect(result.x).toBeCloseTo(22.4, 6);
    expect(aabbOf(table(2, result.x, 8)).minX).toBeCloseTo(11.2, 6);
    expect(result.guides[0]).toMatchObject({ axis: "x", at: 11.2 });
  });

  it("snaps to a different sibling on each axis independently", () => {
    const forX = table(1, 0, 0);
    const forY = table(2, 50, 30);
    const result = alignSnap(
      table(3, 0.2, 30.3),
      0.2,
      30.3,
      [forX, forY],
      tolerance,
    );
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBeCloseTo(30, 6);
    expect(result.guides.map((g) => g.axis).sort()).toEqual(["x", "y"]);
  });

  it("does nothing when nothing is within tolerance", () => {
    const result = alignSnap(
      table(2, 100, 100),
      100,
      100,
      [table(1, 0, 0)],
      tolerance,
    );
    expect(result).toEqual({ x: 100, y: 100, guides: [] });
  });
});

describe("spacingSnap", () => {
  const tolerance = 1;
  // Symmetric about 0, far enough apart that a table centred between them
  // (full width 22.4) doesn't overlap either one.
  const left = table(1, -40, 0);
  const right = table(2, 40, 0);

  it("centres the dragged table when it's already close to equal gaps, and reports both", () => {
    const result = spacingSnap(
      table(3, 0.4, 0),
      0.4,
      0,
      [left, right],
      tolerance,
    );
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBe(0);
    expect(result.guides).toHaveLength(1);
    const [guide] = result.guides;
    expect(guide.axis).toBe("x");
    expect(guide.gapA[1] - guide.gapA[0]).toBeCloseTo(
      guide.gapB[1] - guide.gapB[0],
      6,
    );
    expect(guide.gapA).toEqual([-28.8, -11.2]);
    expect(guide.gapB).toEqual([11.2, 28.8]);
  });

  it("does nothing with only one neighbour — there's no second gap to equal", () => {
    const result = spacingSnap(table(3, 0.4, 0), 0.4, 0, [left], tolerance);
    expect(result).toEqual({ x: 0.4, y: 0, guides: [] });
  });

  it("does nothing while the gaps are still far from equal", () => {
    const result = spacingSnap(
      table(3, 20, 0),
      20,
      0,
      [left, right],
      tolerance,
    );
    expect(result).toEqual({ x: 20, y: 0, guides: [] });
  });

  it("works the same way turned 90 degrees, for neighbours above and below", () => {
    const above = table(1, 0, -40);
    const below = table(2, 0, 40);
    const result = spacingSnap(
      table(3, 0, 0.4),
      0,
      0.4,
      [above, below],
      tolerance,
    );
    expect(result.y).toBeCloseTo(0, 6);
    expect(result.guides[0]?.axis).toBe("y");
  });

  // Two tables already 17.6 units apart, establishing a rhythm — dragging a
  // third to extend the row should continue that same gap, not just centre
  // between a pair.
  const a = table(1, -80, 0);
  const b = table(2, -40, 0);

  it("continues an existing row's gap when extending past its right end", () => {
    const result = spacingSnap(table(3, 0.4, 0), 0.4, 0, [a, b], tolerance);
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.guides).toHaveLength(1);
    const [guide] = result.guides;
    expect(guide.axis).toBe("x");
    expect(guide.gapA[0]).toBeCloseTo(-68.8, 6);
    expect(guide.gapA[1]).toBeCloseTo(-51.2, 6);
    expect(guide.gapB[0]).toBeCloseTo(-28.8, 6);
    expect(guide.gapB[1]).toBeCloseTo(-11.2, 6);
    expect(guide.gapA[1] - guide.gapA[0]).toBeCloseTo(
      guide.gapB[1] - guide.gapB[0],
      6,
    );
  });

  it("continues an existing row's gap when extending past its left end", () => {
    // The mirror image of a/b, reflected through 0.
    const c = table(4, 80, 0);
    const d = table(5, 40, 0);
    const result = spacingSnap(table(3, -0.4, 0), -0.4, 0, [c, d], tolerance);
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.guides).toHaveLength(1);
    const [guide] = result.guides;
    expect(guide.axis).toBe("x");
    expect(guide.gapA[0]).toBeCloseTo(11.2, 6);
    expect(guide.gapA[1]).toBeCloseTo(28.8, 6);
    expect(guide.gapB[0]).toBeCloseTo(51.2, 6);
    expect(guide.gapB[1]).toBeCloseTo(68.8, 6);
  });

  it("does nothing at a row's end when there's no second table to set the rhythm", () => {
    // b is the only thing in this row; the other table is irrelevant, far
    // off in a different row entirely — nothing establishes what gap to
    // continue, so this stays the plain "only one neighbour" case.
    const irrelevant = table(6, -1000, 1000);
    const result = spacingSnap(
      table(3, 0.4, 0),
      0.4,
      0,
      [b, irrelevant],
      tolerance,
    );
    expect(result).toEqual({ x: 0.4, y: 0, guides: [] });
  });
});

describe("snapDrag", () => {
  it("falls back to the plain grid snap when nothing lines up", () => {
    const result = snapDrag(table(1, 0, 0), 12.3, 7.1, [], 1);
    expect(result.x).toBe(snapPosition(12.3));
    expect(result.y).toBe(snapPosition(7.1));
    expect(result.alignGuides).toEqual([]);
    expect(result.spacingGuides).toEqual([]);
  });

  it("prefers an alignment match over the grid snap, per axis", () => {
    const other = table(1, 0, 0);
    const result = snapDrag(table(2, 0.3, 8), 0.3, 8, [other], 1);
    expect(result.x).toBeCloseTo(0, 6);
    // y had no match on either axis rule, so it still falls back to the grid.
    expect(result.y).toBe(snapPosition(8));
    expect(result.alignGuides).toHaveLength(1);
    expect(result.spacingGuides).toEqual([]);
  });
});
