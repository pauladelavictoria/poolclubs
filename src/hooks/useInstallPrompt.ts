import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS has no display-mode media query support; this is its own flag.
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Chrome, Edge and Android stash an install prompt on `beforeinstallprompt`
 * and let a page fire it later, from its own button, instead of the browser's
 * mini-infobar. Safari never dispatches that event at all — on iOS, Add to
 * Home Screen only exists behind the Share sheet, with no programmatic
 * trigger, so all a page can do there is point at it.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  // Lazy initializer rather than an effect: this reads a synchronous browser
  // API at mount, it doesn't subscribe to anything. Guarded for SSR, where
  // there is no window to ask.
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : isStandalone(),
  );

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  return {
    installed,
    canPromptNative: deferred !== null,
    isIOS: isIOS(),
    promptInstall,
  };
}
