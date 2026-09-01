/**
 * What the app is currently showing.
 *
 * Drills and training plans are built and still work — they are hidden while
 * the club-facing side of them is decided. Off means: no nav rows, no feed
 * rows, no public listings, and the routes themselves answer 404, so a stale
 * link or a search-engine result cannot walk into a half-shown feature.
 */
// ponytail: one const, not an env var or a flag service. Flip it here and
// redeploy; move it to import.meta.env if it ever has to differ per deploy.
export const DRILLS_ENABLED = true;

/**
 * Whether a path belongs to a feature that is currently hidden.
 *
 * The router asks this once, in the root route's `beforeLoad`, instead of every
 * drill and training route carrying its own guard. Segment-matched, so a club
 * called "drills-r-us" is not caught by it.
 */
export const isHiddenPath = (pathname: string) =>
  !DRILLS_ENABLED && /(^|\/)(drills|training)(\/|$)/.test(pathname);
