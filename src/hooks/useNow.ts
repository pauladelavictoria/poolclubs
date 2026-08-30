import { useEffect, useState } from "react";

export function useNow(intervalMs = 5 * 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const read = () => setNow(Date.now());
    read();

    const id = setInterval(read, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
