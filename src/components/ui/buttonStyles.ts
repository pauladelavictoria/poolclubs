export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-strike text-pocket hover:bg-strike-light active:bg-strike-deep disabled:bg-rail disabled:text-ink-ghost",
  secondary:
    "bg-felt-raised text-ink border border-hairline hover:border-hairline-strong hover:bg-rail disabled:text-ink-ghost",
  ghost:
    "text-ink-soft hover:text-ink hover:bg-felt-raised disabled:text-ink-ghost",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-caption gap-1.5",
  md: "h-10 px-4 text-body gap-2",
};

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
