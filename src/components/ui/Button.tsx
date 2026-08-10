import * as React from "react";
import {
  buttonClasses,
  type ButtonSize,
  type ButtonVariant,
} from "./buttonStyles";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` is the one action on the screen. Everything else is quiet. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", onClick, ...props }, ref) => (
    <button
      ref={ref}
      onClick={(e) => {
        if (variant === "primary") navigator.vibrate?.(8);
        onClick?.(e);
      }}
      className={buttonClasses({ variant, size, className: className || "" })}
      {...props}
    />
  ),
);
Button.displayName = "Button";

const ICON_SIZES = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
} as const;

const ICON_TONES = {
  neutral: "text-ink-soft hover:text-ink",
  danger: "text-ink-faint hover:text-strike",
} as const;

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    size?: keyof typeof ICON_SIZES;
    tone?: keyof typeof ICON_TONES;
    shape?: "square" | "circle";
  }
>(
  (
    {
      className,
      label,
      size = "md",
      tone = "neutral",
      shape = "square",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      aria-label={label}
      className={[
        "inline-flex shrink-0 items-center justify-center",
        ICON_SIZES[size],
        shape === "circle" ? "rounded-full" : "rounded-control",
        ICON_TONES[tone],
        "hover:bg-felt-raised",
        "transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)]",
        "active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:text-ink-ghost",
        className || "",
      ].join(" ")}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
