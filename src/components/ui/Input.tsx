import * as React from "react";

/**
 * Inputs are inset: filled darker than the surface around them, so "type here"
 * reads without a heavy border. The root's `color-scheme` makes the native date
 * picker and spinners render dark too.
 */
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={[
      "block h-10 w-full rounded-control border border-hairline bg-pocket px-3",
      "text-body text-ink placeholder:text-ink-faint",
      "transition-colors duration-150 hover:border-hairline-strong",
      "disabled:cursor-not-allowed disabled:text-ink-ghost",
      className || "",
    ].join(" ")}
    {...props}
  />
));
Input.displayName = "Input";
