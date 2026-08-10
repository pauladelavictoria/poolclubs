import { useEffect, useRef } from "react";

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
