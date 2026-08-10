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

/** The two series a player's history draws. Semantic, so they don't flip. */
export const SERIES = {
  /** pot green: frames taken */
  games: "#3fbf7f",
  /** chalk blue: the supporting series */
  racks: "#5b9dd9",
};

export function useChartTheme() {
  const palette = useTheme() === "light" ? LIGHT : DARK;

  return {
    axis: palette.axis,
    grid: palette.grid,
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
