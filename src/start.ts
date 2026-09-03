import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";
import { publicCacheControl } from "@/libs/algorithms/publicCache";

/**
 * Server functions are same-origin RPC endpoints, and sign-in, sign-up and
 * sign-out are all server functions now — so they need the origin check a form
 * post would otherwise get for free. Without this Start logs a warning at
 * startup and the endpoints accept cross-site requests.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * A minute of CDN caching for the pages a stranger can see.
 *
 * Every route is server-rendered by one Netlify function, so /clubs costs a
 * render and two or three Supabase round trips per hit — the same ones, for
 * every visitor and every crawler. Whether a given response may be shared is
 * libs/algorithms/publicCache.ts's decision, and it is checked there.
 *
 * Vary is not optional here and it is why this is a header and not a Netlify
 * config: the same URL renders in two themes, in two languages, and picks the
 * language off Accept-Language when no cookie says otherwise. A cache that
 * ignored those would hand a Spanish visitor an English page. Appended rather
 * than set, so whatever Start already varies on survives.
 */
const publicCacheMiddleware = createMiddleware({ type: "request" }).server(
  async ({ request, pathname, next }) => {
    const result = await next();
    const { response } = result;

    const cacheControl = publicCacheControl({
      method: request.method,
      pathname,
      cookie: request.headers.get("cookie") ?? "",
      status: response.status,
      hasCacheControl: response.headers.has("cache-control"),
      hasSetCookie: response.headers.has("set-cookie"),
    });

    if (cacheControl) {
      response.headers.set("cache-control", cacheControl);
      response.headers.append("vary", "Cookie, Accept-Language");
    }

    return result;
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, publicCacheMiddleware],
}));
