/**
 * Whether a server-rendered page may sit in a shared CDN cache, and for how
 * long.
 *
 * Every public page is rendered per request by the Netlify function, and for a
 * visitor with no session /clubs is the same HTML for everybody — so a crawler
 * walking the directory costs a Supabase round trip per URL per visit. A minute
 * of CDN caching is the difference between that and one render a minute.
 *
 * The rules are all "when in doubt, do not cache", because the failure mode is
 * handing one visitor another's page:
 *
 *   - an allowlist of paths, not a denylist. A new private section added under
 *     a prefix nobody remembered to exclude must not become cacheable by
 *     default.
 *   - nothing with a Supabase auth cookie. That is the only reason the HTML
 *     could be personal, and it also means the anon pages we do cache can never
 *     contain somebody's name.
 *   - nothing that is setting a cookie, which is a session being written.
 *   - nothing that already said how it wants to be cached — sitemap.xml,
 *     robots.txt and the manifest each set their own.
 *   - 200 only. A 404, a redirect or a 500 held for a minute is a bug that
 *     outlives its cause.
 *
 * `Vary` is the other half and lives with the header below: the same URL renders
 * differently by theme cookie, language cookie and Accept-Language, so a cache
 * that ignores those would serve a Spanish visitor an English page.
 */

/** The public site, as routes/_public spells it. Kept as prefixes so
 *  /clubs/some-club and /legal/privacy are covered by their section. */
const PUBLIC_PREFIXES = [
  "/clubs",
  "/players",
  "/tournaments",
  "/drills",
  "/legal",
  "/about",
  "/contact",
  "/pricing",
  "/search",
];

/**
 * A minute at the CDN, five more serving the old copy while it re-renders.
 * `max-age=0` because the browser has its own idea of a page it just visited
 * and a member signing in must not be shown a cached signed-out shell from
 * their own disk.
 */
export const PUBLIC_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

/** Supabase keeps the session in cookies named sb-<project>-auth-token. */
const hasAuthCookie = (cookie: string) => /(^|;\s*)sb-[^=;]*=/.test(cookie);

const isPublicPath = (pathname: string) =>
  pathname === "/" ||
  PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export type CacheableRequest = {
  method: string;
  pathname: string;
  /** The request's Cookie header, "" when it sent none. */
  cookie: string;
  status: number;
  /** Whether the route already set its own Cache-Control. */
  hasCacheControl: boolean;
  /** Whether the response is writing a cookie. */
  hasSetCookie: boolean;
};

/** The Cache-Control to add, or null to leave the response alone. */
export const publicCacheControl = ({
  method,
  pathname,
  cookie,
  status,
  hasCacheControl,
  hasSetCookie,
}: CacheableRequest): string | null =>
  (method === "GET" || method === "HEAD") &&
  status === 200 &&
  !hasCacheControl &&
  !hasSetCookie &&
  !hasAuthCookie(cookie) &&
  isPublicPath(pathname)
    ? PUBLIC_CACHE_CONTROL
    : null;
