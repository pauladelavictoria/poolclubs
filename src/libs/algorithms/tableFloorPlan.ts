import type { TableSize, TableType } from "@/types";

/**
 * Real playing-surface footprints per (type, size), in millimetres.
 * Standard cue-sport proportions — close enough to draw a 12ft snooker table
 * visibly bigger than a 7ft bar table, not a manufacturer spec sheet.
 */
export const TABLE_FOOTPRINT_MM: Record<
  TableType,
  Partial<Record<TableSize, { lengthMm: number; widthMm: number }>>
> = {
  american_pool: {
    "7ft": { lengthMm: 1980, widthMm: 990 },
    "8ft": { lengthMm: 2240, widthMm: 1120 },
    "9ft": { lengthMm: 2540, widthMm: 1270 },
  },
  english_pool: {
    "6ft": { lengthMm: 1730, widthMm: 860 },
    "7ft": { lengthMm: 1980, widthMm: 990 },
  },
  snooker: {
    "10ft": { lengthMm: 2840, widthMm: 1420 },
    "12ft": { lengthMm: 3570, widthMm: 1780 },
  },
  carom: { "10ft": { lengthMm: 2840, widthMm: 1420 } },
  chinese_pool: { "9ft": { lengthMm: 2540, widthMm: 1270 } },
};

/** A generic bar-table footprint for a table placed on the floor plan before
 *  its type/size is set — it still has to draw *something*. */
export const DEFAULT_FOOTPRINT_MM = { lengthMm: 2240, widthMm: 1120 };

export const footprintOf = (type: TableType | null, size: TableSize | null) =>
  (type && size && TABLE_FOOTPRINT_MM[type][size]) || DEFAULT_FOOTPRINT_MM;

/** 1 grid unit = 10cm — a 9ft table is ~25 units long, a real room comes out
 *  60-150 units across, so the pointer math below sits at the same order of
 *  magnitude as drillGeometry's felt units. */
export const MM_PER_UNIT = 100;
export const mmToUnits = (mm: number) => mm / MM_PER_UNIT;

/** Snapped to a coarse angle: a floor plan is a sketch of the room, not a
 *  CAD drawing, and a coarse snap makes "square to the wall" and "45 degrees
 *  in the corner" both easy to land on with a finger. */
export const ROTATION_SNAP_DEG = 15;
export const snapRotation = (deg: number) =>
  (((Math.round(deg / ROTATION_SNAP_DEG) * ROTATION_SNAP_DEG) % 360) + 360) %
  360;

/** Half a grid unit (5cm) is fine enough to line tables up against a wall,
 *  coarse enough that a drag doesn't have to be pixel-perfect. */
export const GRID_SNAP_UNITS = 0.5;
export const snapPosition = (v: number) =>
  Math.round(v / GRID_SNAP_UNITS) * GRID_SNAP_UNITS;

/** A table as the floor-plan editor sees it: real state (id, type, size)
 *  plus where it currently sits mid-drag. `rotationDeg` 0 means the long
 *  edge runs horizontally. */
export type TablePlacement = {
  id: number;
  x: number;
  y: number;
  rotationDeg: number;
  type: TableType | null;
  size: TableSize | null;
};

/**
 * The table's four corners at its current position/rotation, in grid units —
 * what both the SVG polygon and hit-testing use, so a rotated table's
 * clickable area is never its untouched bounding box.
 */
export function tableCorners(t: TablePlacement) {
  const { lengthMm, widthMm } = footprintOf(t.type, t.size);
  const hw = mmToUnits(lengthMm) / 2;
  const hh = mmToUnits(widthMm) / 2;
  const rad = (t.rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const corner = (dx: number, dy: number) => ({
    x: t.x + dx * cos - dy * sin,
    y: t.y + dx * sin + dy * cos,
  });
  return [corner(-hw, -hh), corner(hw, -hh), corner(hw, hh), corner(-hw, hh)];
}

/** Is p inside table t? Rotates p backwards into the table's own frame, so
 *  what is left is an ordinary axis-aligned box test. */
export function pointInTable(t: TablePlacement, p: { x: number; y: number }) {
  const rad = (-t.rotationDeg * Math.PI) / 180;
  const dx = p.x - t.x;
  const dy = p.y - t.y;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  const { lengthMm, widthMm } = footprintOf(t.type, t.size);
  return (
    Math.abs(lx) <= mmToUnits(lengthMm) / 2 &&
    Math.abs(ly) <= mmToUnits(widthMm) / 2
  );
}

/** Topmost table under p — last drawn wins, same rule drillGeometry's
 *  hitTest uses for overlapping balls/paths. */
export function hitTestTables(
  tables: TablePlacement[],
  p: { x: number; y: number },
) {
  for (let i = tables.length - 1; i >= 0; i--)
    if (pointInTable(tables[i], p)) return tables[i].id;
  return null;
}

// --- Rotation gesture -----------------------------------------------------
//
// No rotate gesture exists anywhere else in the app to copy. The design: a
// small handle sits a fixed distance beyond the table's own foot rail, along
// its current facing. Dragging it anywhere around the table — not only near
// the handle itself, the same forgiving grab drillGeometry's resize handles
// use — sets the angle to wherever the pointer now sits relative to the
// table's centre, snapped to ROTATION_SNAP_DEG.

/** How far beyond the table's long edge the rotate handle sits, in grid
 *  units (40cm) — clear of the table itself at any size, close enough to
 *  read as "this table's handle" rather than a stray dot on the floor. */
export const ROTATE_HANDLE_OFFSET_UNITS = 4;

export function rotateHandlePoint(t: TablePlacement) {
  const { lengthMm } = footprintOf(t.type, t.size);
  const reach = mmToUnits(lengthMm) / 2 + ROTATE_HANDLE_OFFSET_UNITS;
  const rad = (t.rotationDeg * Math.PI) / 180;
  return {
    x: t.x + reach * Math.cos(rad),
    y: t.y + reach * Math.sin(rad),
  };
}

/** The angle from centre to p, snapped — what dragging the rotate handle (or
 *  anywhere around the table, while rotating) writes back as rotationDeg. */
export function angleFromCentre(
  centre: { x: number; y: number },
  p: { x: number; y: number },
) {
  return snapRotation(
    (Math.atan2(p.y - centre.y, p.x - centre.x) * 180) / Math.PI,
  );
}

// --- Framing the canvas ----------------------------------------------------
//
// There is no stored room size: the floor plan is only ever as big as what's
// actually been placed on it.

const DEFAULT_VIEW = { minX: 0, minY: 0, w: 50, h: 50 };

/** The viewBox that frames every placed table with a margin, or a fixed
 *  default box for an empty layout (so the grid still has something to
 *  render before the first table is dropped on it). 10 units (1m) of
 *  breathing room by default — enough that a table dropped near the edge of
 *  the room doesn't immediately butt up against the card's own border. */
export function fitViewBox(tables: TablePlacement[], margin = 10) {
  if (tables.length === 0) return DEFAULT_VIEW;
  const corners = tables.flatMap(tableCorners);
  const minX = Math.min(...corners.map((c) => c.x)) - margin;
  const minY = Math.min(...corners.map((c) => c.y)) - margin;
  const maxX = Math.max(...corners.map((c) => c.x)) + margin;
  const maxY = Math.max(...corners.map((c) => c.y)) + margin;
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

/**
 * The actual px-per-unit scale the browser renders this viewBox at.
 *
 * The svg keeps its default `preserveAspectRatio` (xMidYMid meet) rather
 * than stretching to fill its box, because the room must render at its real
 * proportions — a stretched 9ft table would lie about its own shape. That
 * means whichever axis is more constrained — width or height — is the one
 * that actually sets the scale; the other axis ends up letterboxed, with the
 * content centred and padding on either side. Every screen<->grid
 * conversion has to use this same scale, or it drifts from what's on screen
 * the moment the container's aspect ratio stops matching the room's — which
 * is most of the time, since the room reshapes itself as tables move but the
 * card around it does not.
 */
export function svgScale(
  rect: { width: number; height: number },
  view: { w: number; h: number },
) {
  if (!rect.width || !rect.height || !view.w || !view.h) return 0;
  return Math.min(rect.width / view.w, rect.height / view.h);
}

/** Pointer client px -> grid units, given the svg's current framing.
 *  Inverts the browser's own xMidYMid-meet transform (see svgScale) rather
 *  than assuming the pointer maps independently across the element's full
 *  width and height — that assumption is only true when the container
 *  happens to share the room's aspect ratio, which just centring one table
 *  is enough to break. */
export function pointToGridUnits(
  svg: SVGSVGElement,
  view: { minX: number; minY: number; w: number; h: number },
  clientX: number,
  clientY: number,
) {
  const rect = svg.getBoundingClientRect();
  const scale = svgScale(rect, view);
  if (!scale) return { x: view.minX, y: view.minY };
  const offsetX = rect.left + (rect.width - view.w * scale) / 2;
  const offsetY = rect.top + (rect.height - view.h * scale) / 2;
  return {
    x: view.minX + (clientX - offsetX) / scale,
    y: view.minY + (clientY - offsetY) / scale,
  };
}

// --- Smart guides -----------------------------------------------------------
//
// The same "snap to a sibling" interaction most design tools offer: dragging
// a table close to lining up with another one pulls it the rest of the way
// and draws a line showing what it lined up with. Two kinds:
//   - alignSnap: the dragged table's centre or an edge meets another
//     table's centre or edge, on either axis independently.
//   - spacingSnap: the dragged table sits an equal gap from its nearest
//     neighbour on each side (of one axis), the way a caption centres
//     itself between two photos.
// Both work off each table's axis-aligned bounding box (aabbOf) rather than
// its raw footprint, because "left edge" stops being one well-defined line
// the moment a table is turned — the box is what stays meaningful at any
// rotation.

/** A table's bounding box in grid units. */
export function aabbOf(t: TablePlacement) {
  const corners = tableCorners(t);
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minY: Math.min(...corners.map((c) => c.y)),
    maxY: Math.max(...corners.map((c) => c.y)),
  };
}

export type AlignGuide = {
  axis: "x" | "y";
  /** Where the guide line sits, along the axis it snapped. */
  at: number;
  /** The guide is drawn as a segment from `from` to `to` along the other
   *  axis, spanning the dragged table and the sibling it lined up with. */
  from: number;
  to: number;
};

export type SpacingGuide = {
  axis: "x" | "y";
  /** The two now-equal gaps this guide marks, each as [start, end] along
   *  the axis — one between the dragged table and its neighbour on one
   *  side, one on the other. */
  gapA: [number, number];
  gapB: [number, number];
  /** Where to draw the gaps, along the other axis. */
  cross: number;
};

/** Half the fixed screen-px tolerance every snap in this module uses,
 *  doubled from ROTATE_GRAB_PX's touch target down to something that reads
 *  as "aligned" without a table getting stuck on every near-miss — the
 *  caller converts this the same way rotateGrabUnits converts its own
 *  budget, via svgScale, so it feels the same at any zoom. */
export const SNAP_GRAB_PX = 8;

const NO_ALIGN = (x: number, y: number) => ({
  x,
  y,
  guides: [] as AlignGuide[],
});

/**
 * Snaps (x, y) onto the centre or an edge of any table in `others`, per
 * axis. Picks the closest match under `tolerance` (grid units) on each
 * axis independently, so a table can align in x to one sibling and in y to
 * a different one, same as it would in a design tool.
 */
export function alignSnap(
  dragged: TablePlacement,
  x: number,
  y: number,
  others: TablePlacement[],
  tolerance: number,
) {
  if (others.length === 0 || tolerance <= 0) return NO_ALIGN(x, y);

  const raw = aabbOf({ ...dragged, x, y });
  // Each candidate line on the dragged table, paired with how far the
  // table's own centre sits from it — snapping the line onto a target means
  // shifting the centre by that same offset.
  const xCandidates: [number, number][] = [
    [x, 0],
    [raw.minX, x - raw.minX],
    [raw.maxX, x - raw.maxX],
  ];
  const yCandidates: [number, number][] = [
    [y, 0],
    [raw.minY, y - raw.minY],
    [raw.maxY, y - raw.maxY],
  ];

  let bestX: {
    diff: number;
    value: number;
    at: number;
    other: TablePlacement;
  } | null = null;
  let bestY: {
    diff: number;
    value: number;
    at: number;
    other: TablePlacement;
  } | null = null;

  for (const other of others) {
    const oAabb = aabbOf(other);
    for (const target of [other.x, oAabb.minX, oAabb.maxX]) {
      for (const [cand, offset] of xCandidates) {
        const diff = Math.abs(cand - target);
        if (diff <= tolerance && (!bestX || diff < bestX.diff))
          bestX = { diff, value: target + offset, at: target, other };
      }
    }
    for (const target of [other.y, oAabb.minY, oAabb.maxY]) {
      for (const [cand, offset] of yCandidates) {
        const diff = Math.abs(cand - target);
        if (diff <= tolerance && (!bestY || diff < bestY.diff))
          bestY = { diff, value: target + offset, at: target, other };
      }
    }
  }

  const snappedX = bestX ? bestX.value : x;
  const snappedY = bestY ? bestY.value : y;
  const guides: AlignGuide[] = [];

  if (bestX) {
    const dAabb = aabbOf({ ...dragged, x: snappedX, y: snappedY });
    const oAabb = aabbOf(bestX.other);
    guides.push({
      axis: "x",
      at: bestX.at,
      from: Math.min(dAabb.minY, oAabb.minY),
      to: Math.max(dAabb.maxY, oAabb.maxY),
    });
  }
  if (bestY) {
    const dAabb = aabbOf({ ...dragged, x: snappedX, y: snappedY });
    const oAabb = aabbOf(bestY.other);
    guides.push({
      axis: "y",
      at: bestY.at,
      from: Math.min(dAabb.minX, oAabb.minX),
      to: Math.max(dAabb.maxX, oAabb.maxX),
    });
  }

  return { x: snappedX, y: snappedY, guides };
}

/** Where a spacing guide's cross-bar sits: the midpoint of wherever all the
 *  given boxes overlap along the axis perpendicular to the gap itself —
 *  same idea as a dimension line in a CAD drawing, centred on the parts it
 *  measures rather than on any one of them. */
function crossCenter(
  boxes: { minX: number; maxX: number; minY: number; maxY: number }[],
  axis: "x" | "y",
) {
  const lo = axis === "x" ? "minX" : "minY";
  const hi = axis === "x" ? "maxX" : "maxY";
  return (
    (Math.max(...boxes.map((b) => b[lo])) +
      Math.min(...boxes.map((b) => b[hi]))) /
    2
  );
}

/**
 * Snaps the dragged table into an equal-gap rhythm with its neighbours,
 * the moment it's already close to that point — same trigger a design
 * tool's spacing guide uses: it only appears right as the gaps approach
 * equal, not the whole time something is roughly between two others. Two
 * shapes, tried in this order on each axis:
 *
 *   - Between a pair: a neighbour on both sides — centre so their gaps
 *     match.
 *   - At the edge of a row or column: only one neighbour, but that
 *     neighbour itself has a further one on the same side — match the gap
 *     it already keeps, so extending a row continues its rhythm rather
 *     than only ever letting you centre inside it.
 *
 * Only ever looks at the immediate neighbour(s) and, for the edge case, the
 * one gap just past them — not a whole row's average spacing. A good enough
 * answer for the common case (evening out or extending three or four
 * tables), and simple enough to reason about.
 */
export function spacingSnap(
  dragged: TablePlacement,
  x: number,
  y: number,
  others: TablePlacement[],
  tolerance: number,
) {
  const guides: SpacingGuide[] = [];
  let snappedX = x;
  let snappedY = y;

  if (others.length >= 2 && tolerance > 0) {
    const raw = aabbOf({ ...dragged, x, y });

    // X axis: neighbours whose own vertical extent overlaps the dragged
    // table's — "roughly the same row".
    const rowMates = others.filter((o) => {
      const a = aabbOf(o);
      return a.maxY > raw.minY && a.minY < raw.maxY;
    });
    const left = rowMates
      .filter((o) => aabbOf(o).maxX <= raw.minX)
      .sort((a, b) => aabbOf(b).maxX - aabbOf(a).maxX)[0];
    const right = rowMates
      .filter((o) => aabbOf(o).minX >= raw.maxX)
      .sort((a, b) => aabbOf(a).minX - aabbOf(b).minX)[0];
    const width = raw.maxX - raw.minX;

    if (left && right) {
      const leftEdge = aabbOf(left).maxX;
      const rightEdge = aabbOf(right).minX;
      const idealMinX = (leftEdge + rightEdge - width) / 2;
      if (Math.abs(raw.minX - idealMinX) <= tolerance) {
        snappedX = x + (idealMinX - raw.minX);
        const gap = idealMinX - leftEdge;
        guides.push({
          axis: "x",
          gapA: [leftEdge, idealMinX],
          gapB: [idealMinX + width, idealMinX + width + gap],
          cross: crossCenter([raw, aabbOf(left), aabbOf(right)], "y"),
        });
      }
    } else if (left) {
      // Right end of a row: match the gap `left` already keeps from its own
      // left neighbour.
      const leftAabb = aabbOf(left);
      const leftOfLeft = others
        .filter((o) => o.id !== left.id)
        .filter((o) => {
          const a = aabbOf(o);
          return a.maxY > leftAabb.minY && a.minY < leftAabb.maxY;
        })
        .filter((o) => aabbOf(o).maxX <= leftAabb.minX)
        .sort((a, b) => aabbOf(b).maxX - aabbOf(a).maxX)[0];
      if (leftOfLeft) {
        const gap = leftAabb.minX - aabbOf(leftOfLeft).maxX;
        const idealMinX = leftAabb.maxX + gap;
        if (Math.abs(raw.minX - idealMinX) <= tolerance) {
          snappedX = x + (idealMinX - raw.minX);
          guides.push({
            axis: "x",
            gapA: [aabbOf(leftOfLeft).maxX, leftAabb.minX],
            gapB: [leftAabb.maxX, idealMinX],
            cross: crossCenter([raw, leftAabb, aabbOf(leftOfLeft)], "y"),
          });
        }
      }
    } else if (right) {
      // Left end of a row: the mirror image, off right's own right neighbour.
      const rightAabb = aabbOf(right);
      const rightOfRight = others
        .filter((o) => o.id !== right.id)
        .filter((o) => {
          const a = aabbOf(o);
          return a.maxY > rightAabb.minY && a.minY < rightAabb.maxY;
        })
        .filter((o) => aabbOf(o).minX >= rightAabb.maxX)
        .sort((a, b) => aabbOf(a).minX - aabbOf(b).minX)[0];
      if (rightOfRight) {
        const gap = aabbOf(rightOfRight).minX - rightAabb.maxX;
        const idealMinX = rightAabb.minX - gap - width;
        if (Math.abs(raw.minX - idealMinX) <= tolerance) {
          snappedX = x + (idealMinX - raw.minX);
          guides.push({
            axis: "x",
            gapA: [idealMinX + width, rightAabb.minX],
            gapB: [rightAabb.maxX, aabbOf(rightOfRight).minX],
            cross: crossCenter([raw, rightAabb, aabbOf(rightOfRight)], "y"),
          });
        }
      }
    }

    // Y axis, the same three shapes turned 90 degrees.
    const colMates = others.filter((o) => {
      const a = aabbOf(o);
      return a.maxX > raw.minX && a.minX < raw.maxX;
    });
    const above = colMates
      .filter((o) => aabbOf(o).maxY <= raw.minY)
      .sort((a, b) => aabbOf(b).maxY - aabbOf(a).maxY)[0];
    const below = colMates
      .filter((o) => aabbOf(o).minY >= raw.maxY)
      .sort((a, b) => aabbOf(a).minY - aabbOf(b).minY)[0];
    const height = raw.maxY - raw.minY;

    if (above && below) {
      const aboveEdge = aabbOf(above).maxY;
      const belowEdge = aabbOf(below).minY;
      const idealMinY = (aboveEdge + belowEdge - height) / 2;
      if (Math.abs(raw.minY - idealMinY) <= tolerance) {
        snappedY = y + (idealMinY - raw.minY);
        const gap = idealMinY - aboveEdge;
        guides.push({
          axis: "y",
          gapA: [aboveEdge, idealMinY],
          gapB: [idealMinY + height, idealMinY + height + gap],
          cross: crossCenter([raw, aabbOf(above), aabbOf(below)], "x"),
        });
      }
    } else if (above) {
      const aboveAabb = aabbOf(above);
      const aboveOfAbove = others
        .filter((o) => o.id !== above.id)
        .filter((o) => {
          const a = aabbOf(o);
          return a.maxX > aboveAabb.minX && a.minX < aboveAabb.maxX;
        })
        .filter((o) => aabbOf(o).maxY <= aboveAabb.minY)
        .sort((a, b) => aabbOf(b).maxY - aabbOf(a).maxY)[0];
      if (aboveOfAbove) {
        const gap = aboveAabb.minY - aabbOf(aboveOfAbove).maxY;
        const idealMinY = aboveAabb.maxY + gap;
        if (Math.abs(raw.minY - idealMinY) <= tolerance) {
          snappedY = y + (idealMinY - raw.minY);
          guides.push({
            axis: "y",
            gapA: [aabbOf(aboveOfAbove).maxY, aboveAabb.minY],
            gapB: [aboveAabb.maxY, idealMinY],
            cross: crossCenter([raw, aboveAabb, aabbOf(aboveOfAbove)], "x"),
          });
        }
      }
    } else if (below) {
      const belowAabb = aabbOf(below);
      const belowOfBelow = others
        .filter((o) => o.id !== below.id)
        .filter((o) => {
          const a = aabbOf(o);
          return a.maxX > belowAabb.minX && a.minX < belowAabb.maxX;
        })
        .filter((o) => aabbOf(o).minY >= belowAabb.maxY)
        .sort((a, b) => aabbOf(a).minY - aabbOf(b).minY)[0];
      if (belowOfBelow) {
        const gap = aabbOf(belowOfBelow).minY - belowAabb.maxY;
        const idealMinY = belowAabb.minY - gap - height;
        if (Math.abs(raw.minY - idealMinY) <= tolerance) {
          snappedY = y + (idealMinY - raw.minY);
          guides.push({
            axis: "y",
            gapA: [idealMinY + height, belowAabb.minY],
            gapB: [belowAabb.maxY, aabbOf(belowOfBelow).minY],
            cross: crossCenter([raw, belowAabb, aabbOf(belowOfBelow)], "x"),
          });
        }
      }
    }
  }

  return { x: snappedX, y: snappedY, guides };
}

/**
 * The one call the drag handler makes: alignment first (it's the more
 * specific, more confident match), then spacing for whichever axis
 * alignment left untouched, then the base grid snap for whatever neither
 * caught. `toGrid` is snapPosition, passed in rather than imported twice.
 */
export function snapDrag(
  dragged: TablePlacement,
  rawX: number,
  rawY: number,
  others: TablePlacement[],
  tolerance: number,
) {
  const align = alignSnap(dragged, rawX, rawY, others, tolerance);
  const alignedX = align.guides.some((g) => g.axis === "x");
  const alignedY = align.guides.some((g) => g.axis === "y");

  const spacing = spacingSnap(
    dragged,
    alignedX ? align.x : rawX,
    alignedY ? align.y : rawY,
    others,
    tolerance,
  );
  const spacedX = !alignedX && spacing.guides.some((g) => g.axis === "x");
  const spacedY = !alignedY && spacing.guides.some((g) => g.axis === "y");

  return {
    x: alignedX ? align.x : spacedX ? spacing.x : snapPosition(rawX),
    y: alignedY ? align.y : spacedY ? spacing.y : snapPosition(rawY),
    alignGuides: align.guides,
    spacingGuides: spacing.guides.filter(
      (g) => (g.axis === "x" && spacedX) || (g.axis === "y" && spacedY),
    ),
  };
}
