/**
 * Where to send someone once they finish signing in.
 *
 * Google sends the browser away and back, so the destination has to survive a
 * full page load. It rides in the /app/login URL, and from there into the
 * provider's redirect URL as /auth/callback?next=… — so it comes back with the
 * browser rather than being parked in sessionStorage and picked up again by
 * whichever component happened to notice the session had landed.
 */

/**
 * Only same-site paths. A value off the URL is attacker-controlled, so anything
 * that could leave the site — an absolute URL, a protocol-relative "//evil.com",
 * a backslash some browsers normalise to a slash — is refused.
 */
export function isSafePath(path: string | null | undefined): path is string {
  return (
    !!path &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith("/\\")
  );
}

/** The /login link that comes back to `path` afterwards. */
export const loginLink = (path: string) =>
  `/app/login?next=${encodeURIComponent(path)}`;
