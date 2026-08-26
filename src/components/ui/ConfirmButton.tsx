import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * "Are you sure" without leaving the page to ask.
 *
 * `window.confirm` is not usable on a tablet that is running fullscreen: the
 * browser drops out of fullscreen to show its own dialog, which is both the
 * wrong answer to the question and the end of the kiosk. It also blocks the
 * thread, which on a shared device is a scoreboard that stops updating while
 * nobody is looking at the prompt.
 *
 * So the button asks in place: one press arms it, the next does it, and it
 * disarms itself after a few seconds because an armed destructive button left
 * on a bar is worse than no confirmation at all.
 */
export default function ConfirmButton({
  onConfirm,
  confirmLabel,
  children,
  ...rest
}: Omit<ButtonProps, "onClick"> & {
  onConfirm: () => void;
  /** What it says once it is armed — the consequence, not "OK". */
  confirmLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) return;
    timer.current = setTimeout(() => setArmed(false), 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [armed]);

  return (
    <Button
      {...rest}
      // Armed, it is the destructive action itself, so it stops being quiet.
      variant={armed ? "primary" : rest.variant}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onConfirm();
      }}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
