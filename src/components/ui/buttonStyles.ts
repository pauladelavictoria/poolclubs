export type ButtonVariant = "primary" | "secondary" | "ghost" | "accent";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-strike text-pocket hover:bg-strike-light active:bg-strike-deep disabled:bg-rail disabled:text-ink-ghost",
  secondary:
    "bg-felt-raised text-ink border border-hairline hover:border-hairline-strong hover:bg-rail disabled:text-ink-ghost",
  ghost:
    "text-ink-soft hover:text-ink hover:bg-felt-raised disabled:text-ink-ghost",
  accent: "text-strike hover:text-strike-light disabled:text-ink-ghost",
};

/**
 * Two sets of numbers, because a label read at arm's length on the club's
 * tablet is not the same label read a foot from a laptop. The touch column is
 * one step up the type scale and a little wider — the 44px floor in index.css
 * gives the button the height, and this is what fills it.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption gap-1.5 pointer-coarse:px-4 pointer-coarse:text-body",
  md: "h-10 px-4 text-body gap-2 pointer-coarse:px-5 pointer-coarse:text-h4",
};

/**
 * The outlined pill the preference pickers wear — theme and language, sharing a
 * row at the foot of the drawer. Not a `buttonClasses` variant: these are sets
 * where exactly one member is on, and both sets have to wear it identically to
 * read as one row.
 *
 * Chosen is a fill, not the accent. The accent means "where you are" — it is on
 * the current nav row and the current tab — and the selected language wearing a
 * tinted accent outline made it the loudest thing in a drawer whose whole job is
 * telling you where you are. A language is not a place you can be.
 */
export const pickerClasses = (active: boolean) =>
  [
    "tap inline-flex h-8 items-center justify-center rounded-control border",
    "text-caption font-medium uppercase transition-colors duration-150",
    "pointer-coarse:text-body",
    active
      ? "border-hairline-strong bg-felt-raised text-ink"
      : "border-hairline text-ink-faint hover:border-hairline-strong hover:text-ink",
  ].join(" ");

/**
 * Shared so a `<Link>` can be styled as a button without wrapping one in the
 * other. One definition, same tokens either way.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return [
    // .tap is the 44px touch floor in index.css — carried here rather than left
    // to the `button` selector because these classes dress links too.
    "tap inline-flex items-center justify-center rounded-control font-medium",
    "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]",
    // Tactile confirmation the UI heard the click
    "active:scale-[0.97] disabled:pointer-events-none",
    SIZES[size],
    VARIANTS[variant],
    className,
  ].join(" ");
}
