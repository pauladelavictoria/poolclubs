const DISMISSED_KEY = "pc:pushPromptDismissed";

/** The only persisted answer. "Not now" is deliberately not recorded — see
 *  installPrompt.ts, which the same shape follows for the install ask. */
export function isPushPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // A private window refuses to be read. Asking again is survivable.
    return false;
  }
}

export function dismissPushPromptForever() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Forgetting the answer is survivable; throwing out of the click is not.
  }
}
