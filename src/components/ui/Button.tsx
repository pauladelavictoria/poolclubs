import * as React from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./buttonStyles";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the one action on the screen. Everything else is quiet. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, className: className || "" })}
      {...props}
    />
  )
);
Button.displayName = "Button";

/** Icon-only control. 40px so the hit area stays legal at any icon size. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }
>(({ className, label, ...props }, ref) => (
  <button
    ref={ref}
    aria-label={label}
    className={[
      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
      "text-ink-soft hover:bg-felt-raised hover:text-ink",
      "transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)]",
      "active:scale-[0.97]",
      className || "",
    ].join(" ")}
    {...props}
  />
));
IconButton.displayName = "IconButton";
