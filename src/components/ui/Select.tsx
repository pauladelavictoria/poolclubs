import * as React from "react";

/**
 * Native <select> on purpose: it gives the iOS/Android wheel and full keyboard
 * support for free. The root's `color-scheme` makes the browser draw its own arrow
 * and option list dark, so nothing needs hand-rolling.
 */
// Width lives here rather than in the base classes: `w-full` and a call-site
// `w-auto` are the same utility, so which one wins isn't the order they're
// concatenated in. One declaration per size, no conflict to lose.
const SIZES = {
  /** Filter bars and toolbars: sized to its label, so a row of them fits a row. */
  sm: "h-8 w-auto max-w-full px-2 text-caption",
  /** Forms, where the control is the point and fills its field. */
  md: "h-10 w-full px-3 text-body",
} as const;

export const Select = React.forwardRef<
  HTMLSelectElement,
  // Native `size` on a <select> is "visible rows"; ours is height, so it
  // replaces rather than intersects (a string & number intersection is never).
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    size?: keyof typeof SIZES;
  }
>(({ className, size = "md", ...props }, ref) => (
  <select
    ref={ref}
    className={[
      "block rounded-control border border-hairline bg-pocket",
      SIZES[size],
      "text-ink",
      "transition-colors duration-150 hover:border-hairline-strong",
      "disabled:cursor-not-allowed disabled:text-ink-ghost",
      className || "",
    ].join(" ")}
    {...props}
  />
));
Select.displayName = "Select";
