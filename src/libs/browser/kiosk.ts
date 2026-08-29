import { KIOSK_COOKIE, clearPref, readPref, writePref } from "@/libs/prefs";

/**
 * The tablet bolted to one table.
 *
 * Read straight off the cookie rather than held in React state: it is decided
 * once, by somebody standing at the table, and then never changes for the life
 * of the device. Both the server and the browser read the same value, which is
 * the whole reason it is a cookie — see libs/prefs.ts.
 *
 * Pinning reloads. A pin changes which shell the server sends, and one full
 * reload on a once-ever action is a great deal simpler than teaching the layout
 * to re-derive itself.
 *
 * None of this is a security boundary. It keeps a stray swipe from wandering
 * into somebody's profile; it does not stop anyone who wants to. What the
 * device is allowed to *write* is decided by RLS.
 */
export function readKioskTable(): number | null {
  const raw = readPref(KIOSK_COOKIE);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function pinKiosk(tableId: number) {
  writePref(KIOSK_COOKIE, String(tableId));
  window.location.reload();
}

/**
 * Pin and go, for a tablet that has just been paired.
 *
 * A full navigation rather than a router push: the cookie decides which shell
 * the server sends, and the whole point is that the tablet never renders the
 * app's chrome at all.
 */
export function pinKioskAndOpen(tableId: number, href: string) {
  writePref(KIOSK_COOKIE, String(tableId));
  window.location.assign(href);
}

export function unpinKiosk() {
  clearPref(KIOSK_COOKIE);
  window.location.reload();
}

/**
 * Where a pinned device is allowed to be.
 *
 * An allowlist, not the denylist the plan sketched: a list of forbidden pages
 * is wrong the moment somebody adds a page, and the pages a tablet on a rail
 * has any business showing are a short, closed set. Everything else lands back
 * on its own table.
 */
export function isKioskAllowed(pathname: string, clubSlug: string): boolean {
  const base = `/app/${clubSlug}`;
  return (
    pathname.startsWith(`${base}/tables`) ||
    pathname === `${base}/night` ||
    pathname.startsWith(`${base}/live/`) ||
    pathname === `${base}/tv`
  );
}
