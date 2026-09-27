import {
  type AlignGuide,
  type SpacingGuide,
} from "@/libs/algorithms/tableFloorPlan";

/** Alignment guides' own colour — deliberately not var(--color-strike):
 *  that's already the selection outline and the rotate handle, and a guide
 *  has to read as a different kind of thing (a hint about a sibling table)
 *  from "this is what's selected". Design tools converge on some shade of
 *  magenta for exactly this reason — it doesn't occur naturally in the felt
 *  or the ink tokens either theme uses, so it never blends in. */
const ALIGN_GUIDE_COLOR = "#ff2fa0";

/** Spacing guides' own colour — a different hue from alignment (cyan
 *  against magenta), so "this lines up with something" and "this gap now
 *  matches another gap" read as the two distinct claims they are, at a
 *  glance, without having to read which shape the guide draws. */
const SPACING_GUIDE_COLOR = "#00c2ff";

/** Half-length of the little perpendicular tick at each end of a spacing
 *  guide, in grid units — a plain line reads as "these two things are
 *  connected"; the ticks are what makes it read as "these two distances are
 *  the same length", the way a ruler's end marks do. */
const SPACING_TICK_UNITS = 0.6;

/** The alignment and equal-spacing hints from the current drag — see
 *  tableFloorPlan.ts's alignSnap/spacingSnap for what each one means.
 *  Rendered last (as TableFloorPlanSvg's children), so a guide is always on
 *  top of the tables it's pointing at. */
export function FloorPlanGuideLines({
  align,
  spacing,
}: {
  align: AlignGuide[];
  spacing: SpacingGuide[];
}) {
  return (
    <g style={{ pointerEvents: "none" }}>
      {align.map((g, i) => (
        <line
          key={`align-${i}`}
          x1={g.axis === "x" ? g.at : g.from}
          y1={g.axis === "x" ? g.from : g.at}
          x2={g.axis === "x" ? g.at : g.to}
          y2={g.axis === "x" ? g.to : g.at}
          stroke={ALIGN_GUIDE_COLOR}
          strokeWidth={0.1}
          strokeDasharray="0.6 0.5"
        />
      ))}
      {spacing.map((g, i) => (
        <g key={`spacing-${i}`}>
          {[g.gapA, g.gapB].map(([from, to], j) => (
            <g key={j}>
              <line
                x1={g.axis === "x" ? from : g.cross}
                y1={g.axis === "x" ? g.cross : from}
                x2={g.axis === "x" ? to : g.cross}
                y2={g.axis === "x" ? g.cross : to}
                stroke={SPACING_GUIDE_COLOR}
                strokeWidth={0.1}
              />
              {[from, to].map((at, k) => (
                <line
                  key={k}
                  x1={g.axis === "x" ? at : g.cross - SPACING_TICK_UNITS}
                  y1={g.axis === "x" ? g.cross - SPACING_TICK_UNITS : at}
                  x2={g.axis === "x" ? at : g.cross + SPACING_TICK_UNITS}
                  y2={g.axis === "x" ? g.cross + SPACING_TICK_UNITS : at}
                  stroke={SPACING_GUIDE_COLOR}
                  strokeWidth={0.1}
                />
              ))}
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}
