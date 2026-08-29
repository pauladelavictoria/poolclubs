import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export function useFullscreen<T extends HTMLElement>(
  external?: React.RefObject<T | null>,
) {
  const own = useRef<T>(null);
  const ref = external ?? own;
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () =>
      setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [ref]);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen();
  }, [ref]);

  return { ref, isFullscreen, toggle };
}
