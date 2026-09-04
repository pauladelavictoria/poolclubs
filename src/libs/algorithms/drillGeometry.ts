import type { BallPosition, ShotPath } from "@/types";

// Table artwork, drawn at its own pixel size
export const TABLE_W = 1734;
export const TABLE_H = 922;

// The felt inside the artwork. Drill coordinates are 0-100 x 0-50 over this
// rect. The two axes do not share a scale, so they never share a divisor.
export const FELT = { x: 82, y: 87, w: 1569, h: 746 };
export const UNIT_X = FELT.w / 100;
export const UNIT_Y = FELT.h / 50;

export const BALL_RADIUS = 1.5;

/** An arrow dropped from the toolbar starts this long, then you drag its ends. */
export const ARROW_SPAWN_LENGTH = 16;

export const BALL_COLORS: Record<string, string> = {
  white: "#FFFFFF",
  yellow: "#FDD835",
  blue: "#2F86E0",
  red: "#D32F2F",
  purple: "#7B1FA2",
  orange: "#EF6C00",
  // Brighter than a real 6-ball: the felt is green, and a dark green ball on
  // it disappears at diagram size no matter how good the shadow is.
  green: "#3A9D46",
  maroon: "#8C2B2B",
  black: "#212121",
};

/** 9-15 are the stripes; "raya" is the legacy label for an unnumbered one. */
export function isStriped(label?: string) {
  if (label === "raya") return true;
  const n = Number(label);
  return Number.isInteger(n) && n >= 9 && n <= 15;
}

const SUIT_COLORS = [
  "yellow",
  "blue",
  "red",
  "purple",
  "orange",
  "green",
  "maroon",
] as const;

/** The rack, in picker order: cue, 1-8, then the stripes 9-15. */
export const BALLS: { color: string; label?: string }[] = [
  { color: "white" },
  ...SUIT_COLORS.map((color, i) => ({ color, label: String(i + 1) })),
  { color: "black", label: "8" },
  ...SUIT_COLORS.map((color, i) => ({ color, label: String(i + 9) })),
];

/** Labels used across the seeded drills. A ball carries one of these OR a number. */
export const LABEL_TAGS = [
  "blanca",
  "a mano",
  "a mano en cocina",
  "objetivo",
  "obs.",
  "obstaculo",
  "salida y llegada",
  "raya",
];

/** Half a drill unit is fine enough to place a ball, coarse enough to line them up. */
export const snap = (v: number) => Math.round(v * 2) / 2;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Is this point over the playing surface at all? */
export const isOnFelt = (p: { x: number; y: number }) =>
  p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 50;

/** Keeps a ball fully on the felt. */
export const clampBall = (p: { x: number; y: number }) => ({
  x: clamp(p.x, BALL_RADIUS, 100 - BALL_RADIUS),
  y: clamp(p.y, BALL_RADIUS, 50 - BALL_RADIUS),
});

/** Radius of the circle you get by dropping the circle tool on the felt, and
 *  half the width/height of the rectangle. Big enough to be a target area
 *  rather than a decoration, small enough to fit twice across the table. */
export const CIRCLE_SPAWN_RADIUS = 8;
export const RECT_SPAWN_HALF = { w: 10, h: 6 };

/** A circle's radius, from the two points it is stored as. */
export const radiusOf = (s: ShotPath) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1);

/** A rectangle's top-left corner and size, from the two corners it is stored
 *  as — which may be given in any order, since dragging one past the other is
 *  the obvious way to resize it. */
export const rectOf = (s: ShotPath) => ({
  x: Math.min(s.x1, s.x2),
  y: Math.min(s.y1, s.y2),
  w: Math.abs(s.x2 - s.x1),
  h: Math.abs(s.y2 - s.y1),
});

/**
 * A shape dropped from the toolbar, centred on where it was dropped and kept
 * on the felt.
 *
 * Pure, so the sizes and the clamping are testable without a pointer: the
 * editor's only job is to say what was dropped and where.
 */
export function spawnShape(
  source: "arrow" | "circle" | "rect",
  at: { x: number; y: number },
): ShotPath {
  if (source === "arrow") {
    const half = ARROW_SPAWN_LENGTH / 2;
    const cx = clamp(snap(at.x), half, 100 - half);
    const cy = snap(at.y);
    return { x1: cx - half, y1: cy, x2: cx + half, y2: cy, type: "solid" };
  }

  if (source === "circle") {
    const r = CIRCLE_SPAWN_RADIUS;
    const cx = clamp(snap(at.x), r, 100 - r);
    const cy = clamp(snap(at.y), r, 50 - r);
    // The rim point is stored to the right of the centre; which way round it
    // sits does not matter, only how far away it is.
    return {
      x1: cx,
      y1: cy,
      x2: cx + r,
      y2: cy,
      type: "solid",
      shape: "circle",
    };
  }

  const { w, h } = RECT_SPAWN_HALF;
  const cx = clamp(snap(at.x), w, 100 - w);
  const cy = clamp(snap(at.y), h, 50 - h);
  return {
    x1: cx - w,
    y1: cy - h,
    x2: cx + w,
    y2: cy + h,
    type: "solid",
    shape: "rect",
  };
}

/**
 * Pointer position -> drill units. The svg keeps its aspect ratio, so one
 * factor converts client px to artwork px; the felt offset and the two unit
 * sizes do the rest.
 *
 * The viewBox says which way up the table is drawn, so a caller never has to
 * tell us twice: taller than wide means the artwork is turned a quarter turn
 * anticlockwise, and the two axes swap on the way back out.
 */
export function pointToUnits(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
) {
  const rect = svg.getBoundingClientRect();
  const box = svg.viewBox.baseVal;
  const portrait = box.height > box.width;
  const scale = rect.width / (portrait ? TABLE_H : TABLE_W);
  const vx = (clientX - rect.left) / scale;
  const vy = (clientY - rect.top) / scale;

  return portrait
    ? {
        x: (TABLE_W - vy - FELT.x) / UNIT_X,
        y: (vx - FELT.y) / UNIT_Y,
      }
    : {
        x: (vx - FELT.x) / UNIT_X,
        y: (vy - FELT.y) / UNIT_Y,
      };
}

/** Distance from p to the segment ab, in drill units. */
function distanceToSegment(
  p: { x: number; y: number },
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? clamp(((p.x - ax) * dx + (p.y - ay) * dy) / lengthSq, 0, 1)
    : 0;
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy));
}

export type Selection = { kind: "ball" | "path"; index: number };

/** How close a click has to land on a line to count as hitting it. */
const PATH_HIT_RADIUS = 1;

/**
 * How far p is from the outline of an entry in `shot_paths` — the segment for
 * an arrow, the rim for a circle, the four edges for a rectangle.
 *
 * Signed only in the sense that it is zero on the outline and grows both ways:
 * this is the "are you grabbing the edge" question, which is what tells a
 * resize from a move.
 */
export function distanceToOutline(s: ShotPath, p: { x: number; y: number }) {
  if (s.shape === "circle")
    return Math.abs(Math.hypot(p.x - s.x1, p.y - s.y1) - radiusOf(s));

  if (s.shape === "rect") {
    const { x, y, w, h } = rectOf(s);
    return Math.min(
      distanceToSegment(p, x, y, x + w, y),
      distanceToSegment(p, x + w, y, x + w, y + h),
      distanceToSegment(p, x + w, y + h, x, y + h),
      distanceToSegment(p, x, y + h, x, y),
    );
  }

  return distanceToSegment(p, s.x1, s.y1, s.x2, s.y2);
}

/** Is p inside a closed shape? False for an arrow, which has no inside. */
const isInsideShape = (s: ShotPath, p: { x: number; y: number }) => {
  if (s.shape === "circle")
    return Math.hypot(p.x - s.x1, p.y - s.y1) <= radiusOf(s);

  if (s.shape === "rect") {
    const { x, y, w, h } = rectOf(s);
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }

  return false;
};

/** Which of the four stored numbers a rectangle grab writes: both for a
 *  corner, one for a side. */
export type RectGrab = { ax?: "x1" | "x2"; ay?: "y1" | "y2" };

/**
 * What grabbing a rectangle at p resizes, or null for a grab that is not on
 * its outline at all (which is a move, not a resize).
 *
 * All four corners are handles, though only two of them are stored: the other
 * two are one coordinate from each, which is why this answers in field names
 * rather than in points. A side answers with one field only — dragging the top
 * edge must not drag the left edge with it, which is exactly the bug that
 * writing both coordinates for every grab produced.
 */
export function rectGrabAt(
  s: ShotPath,
  p: { x: number; y: number },
  grab: number,
): RectGrab | null {
  // Which stored field holds each side. The corners can be given in any
  // order, so this is not simply x1/y1 = the low ones.
  const left = s.x1 <= s.x2 ? "x1" : "x2";
  const right = left === "x1" ? "x2" : "x1";
  const top = s.y1 <= s.y2 ? "y1" : "y2";
  const bottom = top === "y1" ? "y2" : "y1";

  const nearX =
    Math.abs(p.x - s[left]) <= Math.abs(p.x - s[right]) ? left : right;
  const nearY =
    Math.abs(p.y - s[top]) <= Math.abs(p.y - s[bottom]) ? top : bottom;
  const dx = Math.abs(p.x - s[nearX]);
  const dy = Math.abs(p.y - s[nearY]);

  // A corner: near a vertical side and a horizontal one at the same time.
  if (dx <= grab && dy <= grab) return { ax: nearX, ay: nearY };

  const { x, y, w, h } = rectOf(s);
  // A side, but only along the stretch the side actually covers — off the end
  // of the top edge is felt, not the top edge.
  const withinX = p.x >= x - grab && p.x <= x + w + grab;
  const withinY = p.y >= y - grab && p.y <= y + h + grab;
  if (dx <= grab && withinY) return { ax: nearX };
  if (dy <= grab && withinX) return { ay: nearY };

  return null;
}

/** The four dots drawn on a selected shape, and the felt-unit points they sit
 *  on: a rectangle's corners, or a circle's four cardinal points. Both are
 *  grabbable anywhere along the outline — the dots say so rather than being
 *  the only place it works. */
export function handlePoints(s: ShotPath) {
  if (s.shape === "circle") {
    const r = radiusOf(s);
    return [
      { x: s.x1 + r, y: s.y1 },
      { x: s.x1 - r, y: s.y1 },
      { x: s.x1, y: s.y1 + r },
      { x: s.x1, y: s.y1 - r },
    ];
  }

  if (s.shape === "rect") {
    const { x, y, w, h } = rectOf(s);
    return [
      { x, y },
      { x: x + w, y },
      { x, y: y + h },
      { x: x + w, y: y + h },
    ];
  }

  return [
    { x: s.x1, y: s.y1 },
    { x: s.x2, y: s.y2 },
  ];
}

/** Topmost ball wins, then paths. Plain maths — no DOM hit testing. */
export function hitTest(
  balls: BallPosition[],
  paths: ShotPath[],
  p: { x: number; y: number },
): Selection | null {
  for (let i = balls.length - 1; i >= 0; i--) {
    if (Math.hypot(p.x - balls[i].x, p.y - balls[i].y) <= BALL_RADIUS)
      return { kind: "ball", index: i };
  }
  for (let i = paths.length - 1; i >= 0; i--) {
    // Inside counts as well as on the outline: the inside is what you grab to
    // move a circle or a rectangle, now that the whole outline resizes it.
    // Balls are tested first, so one sitting inside a target circle still
    // wins, and dropping a *new* ball inside one never consults this at all —
    // that call passes no paths.
    if (
      distanceToOutline(paths[i], p) <= PATH_HIT_RADIUS ||
      isInsideShape(paths[i], p)
    )
      return { kind: "path", index: i };
  }
  return null;
}
