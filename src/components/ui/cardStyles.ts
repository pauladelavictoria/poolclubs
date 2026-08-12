/**
 * The card's classes, apart from the component, the same way buttonStyles sits
 * apart from Button — a card that is itself a link is a <Link>, not a <div>, so
 * the string has to be reachable without the element.
 *
 * `interactive` is that case: a drill tile, a player, a tournament. Four files
 * were each spelling the same hover pair out by hand.
 */
export const cardClasses = ({
  interactive = false,
  className = "",
}: { interactive?: boolean; className?: string } = {}) =>
  [
    "rounded-card border border-hairline bg-felt",
    interactive
      ? "transition-[background-color,border-color] duration-150 hover:border-hairline-strong hover:bg-felt-raised"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
