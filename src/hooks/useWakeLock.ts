import { useEffect } from "react";

/**
 * Keep the screen awake while a live score is on it.
 *
 * A phone that dozes between racks is a scoreboard nobody uses twice, and a
 * wall display that dozes is a dead wall.
 *
 * The re-acquire is the part that matters: the browser releases the lock
 * silently whenever the tab is hidden, so a single request dies the first time
 * someone reads a message and comes back. Asking again on `visibilitychange` is
 * the whole fix.
 *
 * Everything here is in an effect and feature-detected — `navigator` does not
 * exist while the page is being rendered on the server, and the API is missing
 * on desktop Safari and every browser in a private window.
 */
type Sentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<Sentinel> };
};

export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const lock = (navigator as WakeLockNavigator).wakeLock;
    if (!lock) return;

    let sentinel: Sentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        const next = await lock.request("screen");
        // The effect was cleaned up while the request was in flight.
        if (released) void next.release().catch(() => {});
        else sentinel = next;
      } catch {
        // Denied, or the tab was hidden before it resolved. Nothing to do: the
        // screen dims, which is the behaviour without this hook at all.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible" && !released) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
