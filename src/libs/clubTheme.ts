import { useLayoutEffect } from "react";
import { useTheme } from "@/libs/theme";
import type { BallColor, Club } from "@/types";

/**
 * One club, one accent. Whatever solid ball its admin picked on the club
 * settings page (see pages/ClubPage) overrides the app's --color-strike
 * tokens at the root, so every existing bg-strike / text-strike / border-strike
 * class repaints with no per-component change — strike stays the only accent,
 * it just stops being hardcoded to yellow.
 *
 * Five of the eight hues were tuned for index.css first — the four section
 * marks the app used to carry, plus the error red — and outlived them: the
 * marks are gone and the club's colour is now the only hue in the room, but
 * these were already held to its contrast bar. Maroon and black have no such
 * token to borrow, so they are new; black
 * in particular has no real hue of its own, so it is rendered as a cool
 * graphite instead of vanishing into the near-black canvas or the near-white
 * one.
 *
 * Every `base` clears 4.5:1 (AA body text) against the felt it sits on in its
 * mode — dark mode's felt is #171c22, light mode's is #ffffff — the same bar
 * the yellow default was already held to.
 */
type Shades = {
  base: string;
  light: string;
  deep: string;
  tint: string;
};

export const CLUB_THEME_PALETTE: Record<
  BallColor,
  { dark: Shades; light: Shades }
> = {
  yellow: {
    // The 9-ball, and the app's own default — this entry exists so a club
    // that picks it explicitly matches one that never chose at all.
    dark: {
      base: "#f4c53c",
      light: "#f5cc53",
      deep: "#d2a934",
      tint: "rgba(244, 197, 60, 0.14)",
    },
    light: {
      base: "#966c00",
      light: "#7b5900",
      deep: "#694c00",
      tint: "rgba(150, 108, 0, 0.12)",
    },
  },
  blue: {
    dark: {
      base: "#6f95f5",
      light: "#80a2f6",
      deep: "#5f80d3",
      tint: "rgba(111, 149, 245, 0.14)",
    },
    light: {
      base: "#2f52c8",
      light: "#2743a4",
      deep: "#21398c",
      tint: "rgba(47, 82, 200, 0.12)",
    },
  },
  red: {
    dark: {
      base: "#ea5763",
      light: "#ed6b76",
      deep: "#c94b55",
      tint: "rgba(234, 87, 99, 0.14)",
    },
    light: {
      base: "#c1121f",
      light: "#9e0f19",
      deep: "#870d16",
      tint: "rgba(193, 18, 31, 0.12)",
    },
  },
  purple: {
    dark: {
      base: "#a97bd8",
      light: "#b38bdd",
      deep: "#916aba",
      tint: "rgba(169, 123, 216, 0.14)",
    },
    light: {
      base: "#6b30a8",
      light: "#58278a",
      deep: "#4b2276",
      tint: "rgba(107, 48, 168, 0.12)",
    },
  },
  orange: {
    dark: {
      base: "#f2843c",
      light: "#f49353",
      deep: "#d07234",
      tint: "rgba(242, 132, 60, 0.14)",
    },
    light: {
      base: "#b4530a",
      light: "#944408",
      deep: "#7e3a07",
      tint: "rgba(180, 83, 10, 0.12)",
    },
  },
  green: {
    dark: {
      base: "#3fbf7f",
      light: "#56c78e",
      deep: "#36a46d",
      tint: "rgba(63, 191, 127, 0.14)",
    },
    light: {
      base: "#12794a",
      light: "#0f633d",
      deep: "#0d5534",
      tint: "rgba(18, 121, 74, 0.12)",
    },
  },
  maroon: {
    dark: {
      base: "#d97a68",
      light: "#de8a7a",
      deep: "#bb6959",
      tint: "rgba(217, 122, 104, 0.14)",
    },
    light: {
      base: "#973a28",
      light: "#7c3021",
      deep: "#6a291c",
      tint: "rgba(151, 58, 40, 0.12)",
    },
  },
  black: {
    // No hue to carry, so this is a cool graphite rather than true black —
    // literal black would disappear into the dark canvas and read as plain
    // ink in the light one.
    dark: {
      base: "#7e8fae",
      light: "#8d9cb8",
      deep: "#6c7b96",
      tint: "rgba(126, 143, 174, 0.14)",
    },
    light: {
      base: "#212a3d",
      light: "#1b2232",
      deep: "#171d2b",
      tint: "rgba(33, 42, 61, 0.12)",
    },
  },
};

const VARS = [
  "--color-strike",
  "--color-strike-light",
  "--color-strike-deep",
  "--color-strike-tint",
] as const;

/**
 * Applies the active club's colour to the document root. Called once, high up
 * (see pages/Layout.tsx), so it repaints ahead of anything below it — a
 * layout effect rather than an effect, so switching clubs or toggling light/
 * dark doesn't flash the previous accent for a frame.
 */
export function useClubTheme(club: Club | null | undefined) {
  const mode = useTheme();
  const color = club?.theme_color;

  useLayoutEffect(() => {
    const root = document.documentElement.style;

    // No club, or the default ball: the stylesheet's own yellow already is
    // this, so clearing the override is enough.
    if (!color || color === "yellow") {
      VARS.forEach((v) => root.removeProperty(v));
      return;
    }

    const shades = CLUB_THEME_PALETTE[color][mode];
    root.setProperty("--color-strike", shades.base);
    root.setProperty("--color-strike-light", shades.light);
    root.setProperty("--color-strike-deep", shades.deep);
    root.setProperty("--color-strike-tint", shades.tint);
  }, [color, mode]);
}
