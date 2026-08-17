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

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption gap-1.5",
  md: "h-10 px-4 text-body gap-2",
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
    "inline-flex h-8 items-center justify-center rounded-control border",
    "text-caption font-medium uppercase transition-colors duration-150",
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
    "inline-flex items-center justify-center rounded-control font-medium",
    "transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)]",
    // Tactile confirmation the UI heard the click
    "active:scale-[0.97] disabled:pointer-events-none",
    SIZES[size],
    VARIANTS[variant],
    className,
  ].join(" ");
}
