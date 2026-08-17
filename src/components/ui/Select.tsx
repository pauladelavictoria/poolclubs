import * as React from "react";
import { LuChevronDown } from "react-icons/lu";

/**
 * Still a native <select> — it gives the iOS/Android wheel and full keyboard
 * support for free, and nothing hand-rolled matches that on a phone.
 *
 * What is *not* left to the browser any more is the box around it. A select
 * left at `appearance: menulist` is the one control in the app the platform
 * draws instead of us: Safari on macOS ignores the fill, the border and the
 * radius outright and paints a system pop-up button, so a filter bar came out
 * as one grey Aqua control sitting next to inputs and buttons wearing our
 * tokens. Chrome honours the fill but reserves its own room on the right for
 * its own arrow, which the compact size had no padding for — the label ran
 * into it.
 *
 * So: `appearance-none`, our fill and hairline exactly as <Input> wears them,
 * and the chevron drawn as a sibling icon. It is `text-ink-faint` rather than
 * a background-image data URI because the app has two themes and a data URI
 * cannot read a custom property — an icon can just take a token class.
 *
 * The wrapper is what `className` lands on. Every call site passes layout
 * (`flex-1`, `max-w-[12rem]`, `min-w-0 flex-1`), which belongs to the box, and
 * the ref and every other prop still go to the <select> so `register()` and
 * `htmlFor` work unchanged.
 */
// Width lives here rather than in the base classes: `w-full` and a call-site
// `w-auto` are the same utility, so which one wins isn't the order they're
// concatenated in. One declaration per size, no conflict to lose.
const SIZES = {
  /** Filter bars and toolbars: sized to its label, so a row of them fits a row.
   *  Body size despite being the small variant — iOS zooms in on focusing any
   *  form control under 16px and does not zoom back out. Height stays at 32px,
   *  matching a `sm` button and a picker pill so a toolbar holds one line. */
  // `w-fit`, not `w-auto`: the <select> inside is `w-full`, and a percentage
  // child cannot size a shrink-to-fit parent without the two chasing each
  // other. `fit-content` resolves against the widest option and the select
  // then fills it — which is also what makes `max-w-*` at a call site cap the
  // control and ellipsis the long names, instead of the widest player on the
  // roster deciding how wide the filter bar's first slot is.
  sm: {
    root: "inline-flex w-fit max-w-full",
    field: "h-8 pl-2.5 pr-8 text-body",
    chevron: "right-2",
  },
  /** Forms, where the control is the point and fills its field. */
  md: {
    root: "flex w-full",
    field: "h-10 pl-3 pr-9 text-body",
    chevron: "right-3",
  },
} as const;

export const Select = React.forwardRef<
  HTMLSelectElement,
  // Native `size` on a <select> is "visible rows"; ours is height, so it
  // replaces rather than intersects (a string & number intersection is never).
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    size?: keyof typeof SIZES;
  }
>(({ className, size = "md", ...props }, ref) => {
  const s = SIZES[size];
  return (
    <span
      className={["relative items-center", s.root, className || ""].join(" ")}
    >
      <select
        ref={ref}
        className={[
          // `select-field` (index.css) rather than `appearance-none`: it is the
          // same decision, but it also carries the `base-select` upgrade that
          // styles the open list, and a utility in a layer cannot be overridden
          // by the `@supports` block that does that.
          "select-field peer w-full min-w-0 truncate rounded-control",
          "border border-hairline bg-pocket",
          s.field,
          "cursor-pointer text-ink",
          "transition-colors duration-150 hover:border-hairline-strong",
          "disabled:cursor-not-allowed disabled:text-ink-ghost",
        ].join(" ")}
        {...props}
      />
      <LuChevronDown
        aria-hidden
        className={[
          // Centred explicitly rather than left to the wrapper's `items-center`:
          // an abs-positioned flex child does take its static position from the
          // alignment, but only until something gives it a `top`, and a control
          // whose arrow drifts on one browser is the bug this file exists to fix.
          "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint",
          "peer-disabled:text-ink-ghost",
          s.chevron,
        ].join(" ")}
      />
    </span>
  );
});
Select.displayName = "Select";
