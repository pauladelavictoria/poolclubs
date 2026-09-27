import { HeadContent, Scripts, getRouteApi } from "@tanstack/react-router";
import { I18nProvider } from "@/i18n";
import { Toasts } from "./Toasts";

// By id rather than importing the route: the route file renders this, so an
// import back would be a cycle.
const rootRoute = getRouteApi("__root__");

/** Set in the Netlify UI; public by design, like the Supabase anon key — the
 *  token only says which site a hit belongs to. */
export const CF_BEACON_TOKEN = import.meta.env.VITE_CF_BEACON_TOKEN;

/**
 * The server cannot see `prefers-color-scheme` — it is not in the request — so a
 * first-time visitor is served the dark default and this corrects the attribute
 * before the first paint. A returning visitor has the cookie and the server
 * already got it right, in which case this is a no-op.
 *
 * It runs blocking, in <head>, on purpose: after the first paint it would be a
 * flash instead of a fix. Nothing is written back — pinning the first guess in a
 * cookie would stop the app following the OS later, which is the same reason the
 * language picker only stores an explicit choice.
 */
export const THEME_BOOT = `(function(){try{
var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);
var t=m?decodeURIComponent(m[1]):
(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
}catch(e){}})();`;

export function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme, lang, kiosk } = rootRoute.useRouteContext();

  return (
    // suppressHydrationWarning covers data-theme and the inline color-scheme:
    // THEME_BOOT above may have corrected both between the server writing this
    // and React hydrating it, which is the intended behaviour rather than a
    // mismatch to fix.
    // color-scheme is inline rather than left to index.css: the stylesheet is a
    // separate request (and in dev Vite serves it as a script, so the <link>
    // never applies at all), and until it lands the UA paints its own canvas —
    // white, whatever data-theme says. The inline property is on the element in
    // the first byte, so the canvas is dark before there is any CSS to be late.
    <html
      lang={lang}
      data-theme={theme}
      data-kiosk={kiosk ? "" : undefined}
      style={{ colorScheme: theme }}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          {children}
          <Toasts />
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
