import { describe, expect, it } from "vitest";
import { PUBLIC_CACHE_CONTROL, publicCacheControl } from "./publicCache";

/** A plain anonymous page view, which is the one case that gets cached. */
const anonymous = {
  method: "GET",
  pathname: "/clubs",
  cookie: "",
  status: 200,
  hasCacheControl: false,
  hasSetCookie: false,
};

const header = (over: Partial<typeof anonymous> = {}) =>
  publicCacheControl({ ...anonymous, ...over });

describe("publicCacheControl", () => {
  it("caches an anonymous public page", () => {
    expect(header()).toBe(PUBLIC_CACHE_CONTROL);
    expect(header({ pathname: "/" })).toBe(PUBLIC_CACHE_CONTROL);
    expect(header({ pathname: "/clubs/el-club" })).toBe(PUBLIC_CACHE_CONTROL);
    expect(header({ pathname: "/legal/privacy" })).toBe(PUBLIC_CACHE_CONTROL);
    // Theme and language are cookies too, and they are not a session — the
    // Vary the middleware sends is what keeps them apart in the cache.
    expect(header({ cookie: "theme=light; lang=en" })).toBe(
      PUBLIC_CACHE_CONTROL,
    );
  });

  it("never caches a page rendered for somebody with a session", () => {
    expect(header({ cookie: "sb-abcdef-auth-token=eyJ" })).toBeNull();
    expect(header({ cookie: "theme=dark; sb-abcdef-auth-token.0=eyJ" })).toBe(
      null,
    );
    expect(header({ hasSetCookie: true })).toBeNull();
  });

  it("leaves the app, the API and anything unrecognised alone", () => {
    expect(header({ pathname: "/app/my-club" })).toBeNull();
    expect(header({ pathname: "/auth/callback" })).toBeNull();
    expect(header({ pathname: "/api/clubs/x/logo" })).toBeNull();
    // A prefix match, not a string prefix: /clubsomething is not /clubs.
    expect(header({ pathname: "/clubsomething" })).toBeNull();
  });

  it("leaves a response that already decided, or that is not a 200", () => {
    expect(header({ hasCacheControl: true })).toBeNull();
    expect(header({ status: 404 })).toBeNull();
    expect(header({ status: 302 })).toBeNull();
    expect(header({ method: "POST" })).toBeNull();
  });
});
