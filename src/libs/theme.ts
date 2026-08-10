import { useSyncExternalStore } from "react";

/**
 * Light or dark, and nothing in between.
 *
 * The value lives on <html data-theme>, which the boot script in index.html
 * has already set before React exists — that's what stops the page flashing
 * dark on its way to light. The element is the store; this file only lets
 * components read it and be told when it moves.
 *
 * Same rule as the language picker: a stored value is a choice and always wins.
 * Without one we follow the system, and keep following it, so a laptop that
 * turns dark in the evening takes the app with it.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "theme";

const EVENT = "themechange";

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

const read = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  // Only while nobody has chosen: an explicit pick outranks the OS.
  const follow = () => {
    if (!localStorage.getItem(THEME_KEY)) apply(systemTheme());
  };

  window.addEventListener(EVENT, onChange);
  media.addEventListener("change", follow);
  return () => {
    window.removeEventListener(EVENT, onChange);
    media.removeEventListener("change", follow);
  };
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  apply(theme);
}

/** Re-renders on every change, wherever it is read. */
export const useTheme = () => useSyncExternalStore(subscribe, read);
