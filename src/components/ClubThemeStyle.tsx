import { CLUB_THEME_PALETTE, type Shades } from "@/libs/clubTheme";
import type { Club } from "@/types";

const decl = (shades: Shades) =>
  [
    `--color-strike:${shades.base}`,
    `--color-strike-light:${shades.light}`,
    `--color-strike-deep:${shades.deep}`,
    `--color-strike-tint:${shades.tint}`,
  ].join(";");

/**
 * The active club's accent, as a stylesheet rather than as an effect.
 *
 * It used to be a useEffect writing the four variables onto documentElement,
 * which cannot run on the server — so the first paint was always the default
 * yellow and every accented thing on the page changed colour once React
 * hydrated. Rendering the declarations means they arrive in the HTML.
 *
 * Both modes are emitted, because which one applies is decided by
 * `<html data-theme>` — set from a cookie on the server and corrected by the
 * boot script in routes/__root.tsx before paint. Reading the mode here instead
 * would put the flash back for anyone whose system theme disagrees with what
 * the server guessed. The bare `:root` rule matches index.css's own
 * specificity and wins on order; the light rule outranks it the same way the
 * stylesheet's does.
 */
export default function ClubThemeStyle({
  club,
}: {
  club: Club | null | undefined;
}) {
  const color = club?.theme_color;
  // No club, or the default ball: the stylesheet's own yellow already is this.
  const shades = color && color !== "yellow" ? CLUB_THEME_PALETTE[color] : null;
  if (!shades) return null;

  return (
    <style>
      {`:root{${decl(shades.dark)}}` +
        `:root[data-theme="light"]{${decl(shades.light)}}`}
    </style>
  );
}
