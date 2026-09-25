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
  (
    {
      className,
      variant = "primary",
      size = "md",
      onClick,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      onClick={(e) => {
        if (variant === "primary") navigator.vibrate?.(8);
        onClick?.(e);
      }}
      className={buttonClasses({ variant, size, className: className || "" })}
      {...props}
    >
      {textInSpans(children)}
    </button>
  ),
);
Button.displayName = "Button";

/** Runs of bare text become one <span>, so buttonClasses can truncate them. */
function textInSpans(children: React.ReactNode) {
  const out: React.ReactNode[] = [];
  let text: React.ReactNode[] = [];
  const flush = () => {
    if (text.length) out.push(<span key={`text-${out.length}`}>{text}</span>);
    text = [];
  };
  // toArray keys the elements, which they need once they sit in an array.
  React.Children.toArray(children).forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      text.push(child);
    } else {
      flush();
      out.push(child);
    }
  });
  flush();
  return out;
}

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
