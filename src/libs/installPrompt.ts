const JUST_JOINED_KEY = "pc:justJoinedClub";
const DISMISSED_KEY = "pc:installPromptDismissed";

/**
 * Set right after joining or creating a club, so the install banner gets one
 * shot at the page that follows rather than nagging on every future visit.
 */
export function markJustJoinedClub() {
  sessionStorage.setItem(JUST_JOINED_KEY, "1");
}

/** Read-and-clear: the flag is only ever good for the one render after it's set. */
export function consumeJustJoinedClub(): boolean {
  const flagged = sessionStorage.getItem(JUST_JOINED_KEY) === "1";
  if (flagged) sessionStorage.removeItem(JUST_JOINED_KEY);
  return flagged;
}

export function isInstallPromptDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

/** Closing the banner once answers for every club joined afterwards too, not
 *  just this one — nobody wants to re-decline it each time they switch clubs. */
export function dismissInstallPromptForever() {
  localStorage.setItem(DISMISSED_KEY, "1");
}
