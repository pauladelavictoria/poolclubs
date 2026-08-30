const DISMISSED_KEY = "pc:installPromptDismissed";

/**
 * Whether the install prompt has been turned off for good.
 *
 * "For good" is the only persisted answer there is. Closing the modal is not
 * recorded anywhere: the prompt is meant to reappear on the next app open, so
 * somebody who shrugged it off in a hurry still gets the offer, and only an
 * explicit "don't show again" ends it. Being asked once per launch is the price
 * of the two features that need it — home-screen launch, and push on iOS, which
 * does not exist at all until the app is installed.
 *
 * Reads localStorage, so call it from an effect and never during render: the
 * server cannot see it, and a render that can would hydrate to different markup.
 */
export function isInstallPromptDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // A private window refuses to be read. Asking again is survivable.
    return false;
  }
}

/** Holds for every club joined afterwards too — nobody wants to re-decline this
 *  each time they switch clubs. */
export function dismissInstallPromptForever() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Forgetting the answer is survivable; throwing out of the click is not.
  }
}

/**
 * Is there an install to offer at all?
 *
 * Chrome/Edge on Android and desktop hand over a real prompt via
 * `beforeinstallprompt`; iOS never fires it and only has Add to Home Screen
 * behind the Share sheet, so there the modal is instructions. Anywhere else
 * (desktop Safari, Firefox) there is nothing to offer and nothing to show.
 *
 * Shared with PushConsentModal, which has to know whether the install modal is
 * about to appear so the two never stack.
 */
export function canOfferInstall(prompt: {
  installed: boolean;
  canPromptNative: boolean;
  isIOS: boolean;
}): boolean {
  return !prompt.installed && (prompt.canPromptNative || prompt.isIOS);
}
