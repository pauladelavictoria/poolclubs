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

/**
 * The lobby every player lands in before they belong to a real club: an
 * ordinary club row, so the whole app works inside it with no special cases
 * (see sql/schema.sql, `is_global_club`).
 *
 * It is matched by slug rather than id everywhere. The id is a sequence value
 * that differs between the live project and any local one, and a constant the
 * SQL and the TypeScript both have to agree on is a constant that eventually
 * disagrees.
 */
export const GLOBAL_CLUB_SLUG = "global";

/** A real club, i.e. not the global lobby. The signpost, the club switcher and
 *  the public directory all mean this when they count clubs. */
export const isRealClub = (club?: { slug: string } | null) =>
  !!club && club.slug !== GLOBAL_CLUB_SLUG;
