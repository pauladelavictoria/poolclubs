import { useEffect } from "react";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { I18nProvider, detectLang } from "@/i18n";
import type { Lang } from "@/i18n";
import { THEME_COOKIE, readOrigin, readPref } from "@/libs/prefs";
import { startRealtime } from "@/libs/realtime";
import { sessionQuery } from "@/queries/session";
import RouteError from "@/components/layout/RouteError";
import { NotFound } from "@/components/layout/NotFound";
import indexCss from "../index.css?url";

/**
 * The document, and the two things every route below needs: who is looking at
 * the page, and which way round it is.
 *
 * `beforeLoad` runs before any component, on the server, so a signed-in visitor
 * gets a signed-in page in the first response — no skeleton while the browser
 * asks Supabase who it is talking to.
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  beforeLoad: async ({ context }) => {
    // ensureQueryData rather than calling the server function directly: root
    // beforeLoad runs on every navigation, and this way the session costs one
    // round trip per page load instead of one per link. Sign-in and sign-out
    // invalidate the key explicitly.
    const session = await context.queryClient.ensureQueryData(sessionQuery());

    return {
      session,
      // Read here rather than in the components that want them: on the server
      // these come off the request's cookies, which is the only way the first
      // render can agree with the client's.
      theme: readPref(THEME_COOKIE) === "light" ? "light" : "dark",
      lang: detectLang() as Lang,
      // Absolute URLs (the club's invite link) need a host, and `window` does
      // not exist while this is rendering on the server.
      origin: readOrigin(),
    };
  },

  head: ({ matches }) => {
    // The deepest match's own params carry the club slug when there is one —
    // read once here rather than per link, since both the manifest and the
    // touch icon below key off the same club.
    const clubSlug = (
      matches.at(-1)?.params as { clubSlug?: string } | undefined
    )?.clubSlug;

    return {
      meta: [
        { charSet: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { title: "PoolClubs" },
        {
          name: "description",
          content:
            "PoolClubs keeps your pool club on the record: Elo rankings, match results, challenges and training plans.",
        },
        {
          name: "theme-color",
          media: "(prefers-color-scheme: light)",
          content: "#f3f5f9",
        },
        {
          name: "theme-color",
          media: "(prefers-color-scheme: dark)",
          content: "#090b0e",
        },
        { property: "og:site_name", content: "PoolClubs" },
        { property: "og:title", content: "PoolClubs" },
        {
          property: "og:description",
          content:
            "Elo rankings, match results, challenges and training plans for pool clubs.",
        },
        { property: "og:type", content: "website" },
        // The fallback for anything with no card of its own. It used to be
        // /android-chrome-512x512.png — a square PWA icon, which every preview
        // renderer cropped into a thumbnail rather than drawing as a card. Every
        // public route overrides this from its own data; see libs/publicMeta.ts.
        { property: "og:image", content: "/og/default.png" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "stylesheet", href: indexCss },
        {
          rel: "apple-touch-icon",
          // No `sizes`: unlike the manifest's icons, there's only ever one of
          // these, so nothing picks between candidates by declared size — and
          // it turned out to matter here for a different reason. Chrome's
          // compact "Install app" prompt reads its icon from this tag, not
          // from the manifest, so a club's own logo has to be linked here too
          // or that dialog keeps showing PoolClubs' mark regardless of what
          // the manifest says.
          href: clubSlug
            ? `/api/clubs/${clubSlug}/logo`
            : "/apple-touch-icon.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "manifest",
          // One link, never two: __root can't know whether a descendant route
          // will also render a manifest link, and the router doesn't dedupe
          // links by `rel`, only by exact duplicate — a second tag here would
          // just sit unused behind whichever one the browser reads first.
          href: clubSlug
            ? `/app/${clubSlug}/manifest.webmanifest`
            : "/site.webmanifest",
        },
        { rel: "icon", href: "/favicon.ico" },
      ],
      scripts: [{ children: THEME_BOOT }],
    };
  },

  errorComponent: (props) => (
    <RootDocument>
      <RouteError {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => (
    <RootDocument>
      <NotFound />
    </RootDocument>
  ),
  component: () => (
    <RootDocument>
      <Outlet />
    </RootDocument>
  ),
});

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
const THEME_BOOT = `(function(){try{
var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);
var t=m?decodeURIComponent(m[1]):
(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");
document.documentElement.dataset.theme=t;
document.documentElement.style.colorScheme=t;
}catch(e){}})();`;

function RootDocument({ children }: { children: React.ReactNode }) {
  const { theme, lang } = Route.useRouteContext();

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
        <Realtime />
        <Scripts />
      </body>
    </html>
  );
}

/** Toasts arrive with react-toastify's own stylesheet, but everything it draws
 *  reads a custom property and index.css points those at our tokens — so the
 *  surface turns over with [data-theme] on its own and there is no `theme` prop
 *  here to keep in step with it. */
function Toasts() {
  return (
    <ToastContainer position="bottom-center" autoClose={2600} hideProgressBar />
  );
}

/**
 * One realtime channel for the whole app. In an effect rather than at module
 * scope, which is where it used to be: a module-scope call would try to open a
 * websocket while rendering on the server.
 */
function Realtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    startRealtime(queryClient);
  }, [queryClient]);
  return null;
}
