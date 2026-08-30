/**
 * The service worker. Push and nothing else.
 *
 * No fetch handler and no cache, on purpose: this app is server-rendered, and a
 * cache in front of SSR is a separate and much larger decision — as well as the
 * reliable source of "why am I looking at yesterday's page". Nothing here
 * intercepts a request.
 *
 * Plain JavaScript in public/, because that is served verbatim at /sw.js — which
 * gives it a scope of "/", covering both the site manifest's /app and a club
 * manifest's /app/<slug> — and needs no tooling: tsconfig.app.json only includes
 * src, and eslint only matches .ts/.tsx.
 *
 * The payload shape is PushPayload in src/libs/push.functions.ts.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Nothing useful to show. Falling through to the defaults below rather than
    // returning, because a push handler that shows nothing spends the browser's
    // silent-push budget and eventually has a generic "this site was updated in
    // the background" notice shown on its behalf.
  }

  const { title = "PoolClubs", body = "", url = "/app", tag } = payload;

  // Shown even when a window is open. The bell would cover that case, but see
  // the silent-push budget above: not showing is not a free choice.
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      icon: "/android-chrome-192x192.png",
      badge: "/favicon-96x96.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/app";

  // waitUntil is not optional: without it the worker can be killed before any
  // of this runs, and the tap does nothing at all.
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        // A tab opened before this worker activated is not controlled by it, but
        // it is still the app — and stacking a second copy of the app on top of
        // it is the worst of the available outcomes.
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) await client.navigate(url);
        return;
      }

      await self.clients.openWindow(url);
    })(),
  );
});
