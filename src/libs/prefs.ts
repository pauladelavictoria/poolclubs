import { createIsomorphicFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  getRequestUrl,
} from "@tanstack/react-start/server";
import { decodeSetup, encodeSetup, type DaySetup } from "@/libs/algorithms/today";

/**
 * The two choices the server has to know before it renders anything: which way
 * round the page is, and which language it is in.
 *
 * Both used to live in localStorage, which the server cannot read — the theme
 * was applied by a blocking inline script in index.html and the language was
 * detected during the first render. Under SSR that is a guaranteed hydration
 * mismatch: the server would render one thing and the client another.
 *
 * Cookies instead. They arrive with the request, so `<html data-theme>` and
 * `<html lang>` are correct in the very first byte of HTML — no flash, no
 * mismatch, and no inline script.
 *
 * createIsomorphicFn keeps the server-only import out of the client bundle: the
 * build swaps in whichever branch belongs to the environment.
 */
export const THEME_COOKIE = "theme";
export const LANG_COOKIE = "lang";

/**
 * Which table this device is bolted to, if it is one.
 *
 * A cookie for the same reason the other two are: the server has to know which
 * shell to send before it renders anything, and a tablet on the rail must not
 * flash the whole app's chrome on every load before JavaScript takes it away.
 *
 * It is a guardrail, not a boundary. Anyone who can open the browser can clear
 * it. What actually decides whether a device may score somebody else's match is
 * `players.is_device`, checked by can_score_live_match in the database — see
 * sql/schema.sql.
 */
export const KIOSK_COOKIE = "kiosk";

/**
 * What the club is playing today — format, game and race, as one string. Read on
 * the server so /today's bar is right in the first byte; see libs/algorithms/today.ts for
 * the shape and why it is not per club.
 */
const TODAY_COOKIE = "today";

/** The day's setup, as the page reads and writes it. Here rather than in
 *  libs/algorithms/today.ts because that module is checked under bare node and this one
 *  imports the server's request helpers. */
export const readTodaySetup = (): DaySetup =>
  decodeSetup(readPref(TODAY_COOKIE));

export const writeTodaySetup = (setup: DaySetup) =>
  writePref(TODAY_COOKIE, encodeSetup(setup));

/** A year: this is a preference, not a session. */
const MAX_AGE = 60 * 60 * 24 * 365;

export const readPref = createIsomorphicFn()
  .server((name: string): string | null => getCookie(name) ?? null)
  .client((name: string): string | null => {
    const found = document.cookie
      .split("; ")
      .find((pair) => pair.startsWith(`${name}=`));
    return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
  });

/**
 * Written from the browser, so a plain document.cookie rather than a server
 * round trip. Not httpOnly on purpose — these are read by client code too, and
 * neither one is a credential.
 */
export function writePref(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
}

/** Forget one. Same path, so it clears the cookie writePref set. */
export function clearPref(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
}

/**
 * The site's own origin, for the one place that builds an absolute URL: a club's
 * invite link. On the server it comes off the request, so a deploy preview and
 * production each hand out links to themselves.
 */
export const readOrigin = createIsomorphicFn()
  .server((): string => getRequestUrl().origin)
  .client((): string => window.location.origin);

/**
 * The languages this visitor prefers, best first.
 *
 * Node has had a `navigator` global since v18, so reading `navigator.languages`
 * without thinking gets you the *server's* locale — which is how this rendered
 * `<html lang="en">` from a machine in en-US while serving Spanish text. The
 * request's own Accept-Language header is the visitor's preference, and it is
 * the only thing on the server that is.
 */
export const readPreferredLangs = createIsomorphicFn()
  .server((): string[] =>
    (getRequestHeader("accept-language") ?? "")
      .split(",")
      // "es-ES;q=0.9" — the quality value only orders the list, and the header
      // is already in preference order.
      .map((part) => part.split(";")[0].trim())
      .filter(Boolean),
  )
  .client((): string[] => [...(navigator.languages ?? [navigator.language])]);
