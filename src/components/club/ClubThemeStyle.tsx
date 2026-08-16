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

/** The same shades, bound to the identity token rather than to the accent.
 *  Only the base: .wash derives its own tints with color-mix, so a pre-made one
 *  would be a second source of truth for the same colour. */
const clubDecl = (shades: Shades) => `--color-club:${shades.base}`;

/**
 * Every ball colour as a scope, emitted once by the public layout.
 *
 * ClubThemeStyle paints one club onto the whole document by moving the *accent*,
 * which is right under /app: in a club's own tool the club is the product, so its
 * colour is what "act" looks like. The public side works the other way round. A
 * directory is thirty clubs at once and a stranger has to be able to find the
 * button, so out here a club's colour moves `--color-club` only and never touches
 * `--color-strike`. Cards and backgrounds wear the club; buttons, links and the
 * current tab stay the app's yellow on every public page.
 *
 * Scoped to whatever carries data-ball: no per-card <style>, no inline custom
 * properties, no JS, and both modes in the HTML so there is no hydration flash.
 *
 * `:root [data-ball]` rather than a bare attribute selector, so these keep their
 * 0-2-0 edge over any bare `:root{}` rule an inline <style> emits later in the
 * document.
 */
export function BallScopeStyle() {
  const dark = CLUB_BALL_COLORS.map(
    (color) =>
      `:root [data-ball="${color}"]{${clubDecl(CLUB_THEME_PALETTE[color].dark)}}`,
  ).join("");
  const light = CLUB_BALL_COLORS.map(
    (color) =>
      `:root[data-theme="light"] [data-ball="${color}"]{${clubDecl(CLUB_THEME_PALETTE[color].light)}}`,
  ).join("");

  return <style>{dark + light}</style>;
}
