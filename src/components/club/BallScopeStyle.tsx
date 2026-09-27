import { CLUB_THEME_PALETTE, type Shades } from "@/libs/theme/clubTheme";
import { CLUB_BALL_COLORS } from "@/types";

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
