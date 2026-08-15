import { CLUB_THEME_PALETTE, type Shades } from "@/libs/clubTheme";
import { CLUB_BALL_COLORS, type BallColor } from "@/types";

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
  color,
}: {
  /** The ball itself rather than the club row: the public club page reads a
   *  redacted subset of the columns, so it has no full Club to hand over. */
  color: BallColor | null | undefined;
}) {
  // No colour, or the default ball: the stylesheet's own yellow already is this.
  const shades = color && color !== "yellow" ? CLUB_THEME_PALETTE[color] : null;
  if (!shades) return null;

  return (
    <style>
      {`:root{${decl(shades.dark)}}` +
        `:root[data-theme="light"]{${decl(shades.light)}}`}
    </style>
  );
}

/**
 * Every ball colour as a scope, emitted once by the public layout.
 *
 * ClubThemeStyle paints one club onto the whole document, right for a club's own
 * page. A directory is thirty clubs at once, so the same four tokens are scoped
 * to whatever carries data-ball instead. No per-card <style>, no inline custom
 * properties, no JS, both modes in the HTML so there is no hydration flash.
 *
 * `:root [data-ball]` rather than a bare attribute selector: on /clubs/$slug,
 * ClubThemeStyle's own `:root` rule is later in the document and would win a
 * specificity tie, painting every nested card with the host club's colour.
 */
export function BallScopeStyle() {
  const dark = CLUB_BALL_COLORS.map(
    (color) => `:root [data-ball="${color}"]{${decl(CLUB_THEME_PALETTE[color].dark)}}`,
  ).join("");
  const light = CLUB_BALL_COLORS.map(
    (color) =>
      `:root[data-theme="light"] [data-ball="${color}"]{${decl(CLUB_THEME_PALETTE[color].light)}}`,
  ).join("");

  return <style>{dark + light}</style>;
}
