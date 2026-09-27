import { useEffect, useRef, useState } from "react";

/**
 * Drives a native <dialog> from a boolean.
 *
 * `showModal()` is what buys the backdrop, Esc-to-close, the focus trap and
 * inertness of the page behind — all of which a div-with-a-fixed-overlay has to
 * hand-roll and usually gets wrong. The `.open` guards make it idempotent, since
 * calling showModal() on an open dialog throws.
 */
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return ref;
}

/** Null, undefined and false are "closed"; anything else — 0 included, a
 *  photo index — is something being shown. */
const isOpen = (v: unknown) => v !== null && v !== undefined && v !== false;

/** dialog.sheet's slide-out in src/index.css, plus a frame. */
const SHEET_OUT_MS = 260;

/**
 * What a dialog is showing, kept for the length of its close animation.
 *
 * A dialog whose content is gated on its own open state — `{starting && …}` —
 * loses that content the instant it closes, while the sheet is still sliding
 * away, so what leaves the screen is an empty panel. Gate on this instead: it
 * follows `value` straight away on open and lags it on close, so the last
 * thing shown slides out with the sheet and is only then unmounted (which is
 * still what resets a form for next time).
 */
export function useLingering<T>(value: T): T {
  const [last, setLast] = useState(value);
  // Caught up during render, the way React suggests for state derived from a
  // prop — no effect, no extra paint with the stale value.
  if (isOpen(value) && value !== last) setLast(value);
  useEffect(() => {
    if (isOpen(value)) return;
    const timer = setTimeout(() => setLast(value), SHEET_OUT_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return isOpen(value) ? value : last;
}
