import { useTheme } from "./theme";

/**
 * Chart ink. Recharts takes colour values, never classes, so the tokens in
 * index.css can't reach it — these are the same values written out, and the two
 * files have to be changed together.
 *
 * That is also why this exists rather than one hardcoded set: the axes, grid and
 * tooltip were pale-on-dark constants in two chart files, so in light mode the
 * tooltip stayed a dark box and the grid lines disappeared.
 */
const DARK = {
  axis: "#8d95a1", // --color-ink-faint
  grid: "rgba(255,255,255,0.07)",
  surface: "#1f242c", // --color-felt-raised
  border: "rgba(255,255,255,0.13)",
  ink: "#f4f2ec", // --color-ink
};

const LIGHT = {
  axis: "#69727e",
  grid: "rgba(9,11,14,0.08)",
  surface: "#ffffff",
  border: "rgba(9,11,14,0.12)",
  ink: "#12161c",
};

/** Custom properties can't reach recharts, so they are read off the root. The
 *  accent is whatever the club set (see libs/clubTheme), which is why this is
 *  read at render rather than written down here.
 *
 *  On the server there is no document and no computed style, so the fallback is
 *  the answer — which is the app's own yellow, i.e. right for every club that
 *  hasn't overridden it. A club with its own colour gets one frame of yellow in
 *  its charts before hydration. */
const cssVar = (name: string, fallback: string) => {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
};

export function useChartTheme() {
  const mode = useTheme();
  const palette = mode === "light" ? LIGHT : DARK;

  return {
    axis: palette.axis,
    grid: palette.grid,
    /**
     * The two series a player's history draws. The club's colour carries the
     * headline; the supporting line stays neutral, because two tints of one
     * hue at 2px is no distinction at all.
     */
    series: {
      games: cssVar("--color-strike", mode === "light" ? "#966c00" : "#f4c53c"),
      racks: palette.axis,
    },
    /** Spread onto <Tooltip contentStyle> */
    tooltip: {
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: "10px",
      color: palette.ink,
      fontSize: 14,
    },
    /** Spread onto <Tooltip itemStyle> */
    tooltipItem: { color: palette.ink },
  };
}
