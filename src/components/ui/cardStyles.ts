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

/**
 * The one modal shell: a sheet off the bottom edge on a phone, a centred panel
 * once there is room for one.
 *
 * `max-h` and the scroll matter more than the width. A tablet on a rail is
 * landscape and short — an eight-row form in a 600px-tall window has to be
 * reachable, and a dialog that overflows the viewport puts its own submit
 * button off the screen.
 *
 * `wide` is for forms that lay their content out in columns rather than a
 * stack: the same height budget buys twice as much when the form is not one
 * long list.
 */
export const dialogClasses = ({
  wide = false,
  className = "",
}: { wide?: boolean; className?: string } = {}) =>
  [
    "sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto",
    "rounded-t-sheet border border-hairline bg-felt p-5 text-ink",
    "sm:m-auto sm:rounded-sheet",
    wide ? "sm:max-w-2xl" : "sm:max-w-md",
    className,
  ]
    .filter(Boolean)
    .join(" ");
