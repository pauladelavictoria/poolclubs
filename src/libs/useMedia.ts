import { useCallback, useSyncExternalStore } from "react";

/**
 * Live answer to a CSS media query, re-rendering when it flips.
 *
 * The server has no `matchMedia` and no viewport to measure, so it answers
 * `false` to everything and the real answer arrives on hydration. That is what
 * getServerSnapshot is for: React expects the two to differ and re-renders
 * rather than reporting a mismatch.
 *
 * ponytail: `false` means the server renders the narrow layout and a wide screen
 * corrects it on the first client render — visible as a flicker. So only ask
 * when the answer changes something JS owns anyway. The app's chrome used to be
 * decided here and the whole nav column arrived a frame late on every desktop
 * load; it is `--breakpoint-pinned` in CSS now. What is left is the pool table's
 * orientation, which picks between two different SVGs and so cannot be CSS.
 */
export function useMedia(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * A table turned on its end is four times the size on a phone held upright,
 * which is why portrait is the default. The exception is a phone turned
 * sideways: there the screen is barely 400px tall and an upright table runs off
 * both ends of it, while a landscape one fills the width.
 *
 * The width half matters as much as the orientation. From `lg` up the drill
 * pages put the table in a 360px column beside the reading, so the window being
 * landscape says nothing about the space the table actually gets — that column
 * is narrow and upright whatever shape the window is.
 */
export const useTablePortrait = () =>
  !useMedia("(orientation: landscape) and (max-width: 1023px)");
