import { useEffect, useRef, useState } from "react";

/**
 * A text box whose value belongs in the URL, without a navigation per keystroke.
 *
 * Every public directory keys its loader on `?q`, which is what makes a search
 * result a link — but writing to the URL on each character would fire a fetch per
 * letter and fill the history with them. So the input is local and the URL
 * catches up once the typing stops.
 *
 * The debounce lives in the change handler rather than in an effect on `value`.
 * An effect would need `commit` in its dependencies, and `commit` closes over the
 * route's navigate, so it is a new function every render — the timer would reset
 * forever and never fire. Holding it in a ref instead means writing that ref
 * during render, which is its own bug. From the handler, `commit` is simply the
 * one from the render that handled the keystroke.
 */
export function useDebouncedQuery(
  /** The value as the URL currently has it. */
  urlValue: string,
  commit: (value: string) => void,
  delay = 300,
) {
  const [value, setValue] = useState(urlValue);
  const [syncedUrl, setSyncedUrl] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL can change from somewhere else — the back button, or a "see all"
  // link that arrives carrying a query. Adjusted here during render rather than
  // in an effect, so the box never paints a frame showing the old query.
  if (urlValue !== syncedUrl) {
    setSyncedUrl(urlValue);
    setValue(urlValue);
  }

  useEffect(() => {
    // A URL change from elsewhere wins over whatever was half-typed: without
    // this, a pending timer would commit the abandoned text a moment after the
    // new page arrived. Clearing an id that has already fired is a no-op, so
    // this is harmless on the pass where our own commit is what moved the URL.
    clearTimeout(timer.current);
  }, [urlValue]);

  // Nothing should navigate after the page has gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), delay);
  };

  return [value, change] as const;
}
