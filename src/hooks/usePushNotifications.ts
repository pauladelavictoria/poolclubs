import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { toKeyBytes } from "@/libs/algorithms/pushKey";
import { useT } from "@/i18n";

/**
 * Web push, from this device's point of view.
 *
 * A subscription belongs to a browser installation, not to an account and not to
 * a club — enabling it on your phone says nothing about your laptop, which is
 * why the copy around this says "this device" and why the row is keyed by
 * endpoint (see sql/schema.sql).
 *
 * Everything here is a browser API the server cannot see, so `supported` and
 * `permission` start as their "nothing yet" values and are filled in by an
 * effect. Reading Notification.permission during render would render one thing
 * on the server and another in the browser, and React throws the tree away.
 */

/** The key is public by design: it is handed to the push service as
 *  applicationServerKey. The private half is server-only, see push.functions.ts. */
const PUBLIC_KEY: string = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

const isSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  // iOS Safari in a browser *tab* has a service worker but no PushManager: web
  // push there only exists once the app is on the home screen.
  "PushManager" in window &&
  "Notification" in window &&
  PUBLIC_KEY !== "";

const getSubscription = async () => {
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await registration?.pushManager.getSubscription()) ?? null;
};

export function usePushNotifications() {
  const { player } = useAuth();
  const { lang } = useT();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Write the subscription down as ours. An upsert because the endpoint is the
   *  primary key: the same device coming back is one row, not a second one. */
  const save = useCallback(
    async (subscription: PushSubscription) => {
      const { endpoint, keys } = subscription.toJSON();
      if (!endpoint || !keys?.p256dh || !keys.auth) return;

      await supabase
        .from("push_subscriptions")
        .upsert(
          {
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            person_id: player.person_id,
            lang,
          },
          { onConflict: "endpoint" },
        )
        .throwOnError();
    },
    [player.person_id, lang],
  );

  useEffect(() => {
    if (!isSupported()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring browser-only answers to after hydration is the point, see the module comment
    setSupported(true);
    setPermission(Notification.permission);

    if (Notification.permission !== "granted") return;

    void (async () => {
      const subscription = await getSubscription();
      if (!subscription) return;
      setEnabled(true);
      // Re-saved on every app open, which is what repairs a rotated endpoint,
      // picks up a language change, and puts the row back after push_prune
      // decided it was dead. Cheap enough that no pushsubscriptionchange
      // handler is needed.
      await save(subscription).catch(() => {});
    })();
  }, [save]);

  const enable = useCallback(async () => {
    // First statement, with nothing awaited before it: Safari ties the
    // permission prompt to the user gesture that led here, and an await in
    // front of this is the single most common way this feature ships broken.
    const granted = await Notification.requestPermission();
    setPermission(granted);
    if (granted !== "granted") return;

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Required by Chrome: every push this key sends must show something.
          userVisibleOnly: true,
          applicationServerKey: toKeyBytes(PUBLIC_KEY),
        }));

      await save(subscription);
      setEnabled(true);
    } finally {
      setBusy(false);
    }
  }, [save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return { supported, permission, enabled, busy, enable, disable };
}
