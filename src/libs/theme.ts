import { useSyncExternalStore } from "react";
import { THEME_COOKIE, readPref, writePref } from "./prefs";

/**
 * Light or dark, and nothing in between.
 *
 * The value lives on <html data-theme>, which the boot script in
 * routes/__root.tsx has already set before React exists — that's what stops the
 * page flashing dark on its way to light. The element is the store; this file
 * only lets components read it and be told when it moves.
 *
 * The choice is kept in a cookie rather than localStorage so the server can read
 * it too: `<html data-theme>` is then already right in the first byte of HTML,
 * and getServerSnapshot below can answer without touching the DOM.
 *
 * Same rule as the language picker: a stored value is a choice and always wins.
 * Without one we follow the system, and keep following it, so a laptop that
 * turns dark in the evening takes the app with it.
 */
export type Theme = "light" | "dark";

const EVENT = "themechange";

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const read = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

/**
 * What the server renders with. `prefers-color-scheme` is not in the request, so
 * a first-time visitor is served dark and the boot script corrects the attribute
 * before paint — which is why <html> carries suppressHydrationWarning. From the
 * second request on the cookie is there and this is exact.
 */
const readServer = (): Theme =>
  readPref(THEME_COOKIE) === "light" ? "light" : "dark";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  // Only while nobody has chosen: an explicit pick outranks the OS.
  const follow = () => {
    if (!readPref(THEME_COOKIE)) apply(systemTheme());
  };

  window.addEventListener(EVENT, onChange);
  media.addEventListener("change", follow);
  return () => {
    window.removeEventListener(EVENT, onChange);
    media.removeEventListener("change", follow);
  };
}

export function setTheme(theme: Theme) {
  writePref(THEME_COOKIE, theme);
  apply(theme);
}

/** Re-renders on every change, wherever it is read. */
export const useTheme = () => useSyncExternalStore(subscribe, read, readServer);
