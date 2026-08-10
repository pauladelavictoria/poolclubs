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
  clientY: number
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
  by: number
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

/** Topmost ball wins, then paths. Plain maths — no DOM hit testing. */
export function hitTest(
  balls: BallPosition[],
  paths: ShotPath[],
  p: { x: number; y: number }
): Selection | null {
  for (let i = balls.length - 1; i >= 0; i--) {
    if (Math.hypot(p.x - balls[i].x, p.y - balls[i].y) <= BALL_RADIUS)
      return { kind: "ball", index: i };
  }
  for (let i = paths.length - 1; i >= 0; i--) {
    const path = paths[i];
    if (
      distanceToSegment(p, path.x1, path.y1, path.x2, path.y2) <=
      PATH_HIT_RADIUS
    )
      return { kind: "path", index: i };
  }
  return null;
}
