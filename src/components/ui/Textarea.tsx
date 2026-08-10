import * as React from "react";

/**
 * Same inset treatment as Input, with room for a couple of lines. Lived as a
 * local class string in DrillForm, which meant the one multi-line field in the
 * app was the one field not built from the same part as the rest.
 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 2, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={[
      "block w-full rounded-control border border-hairline bg-pocket px-3 py-2",
      "text-body text-ink placeholder:text-ink-faint",
      "transition-colors duration-150 hover:border-hairline-strong",
      "disabled:cursor-not-allowed disabled:text-ink-ghost",
      className || "",
    ].join(" ")}
    {...props}
  />
));
Textarea.displayName = "Textarea";
