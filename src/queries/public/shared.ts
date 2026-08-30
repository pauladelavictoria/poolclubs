/**
 * Constants and helpers every public query shares — column allowlists, paging
 * and the `ilike`-safe escaping. See clubs.ts, players.ts, tournaments.ts,
 * drills.ts and search.ts for the queries themselves.
 *
 * Two rules hold for every query in this module, and both come from
 * sql/schema.sql:
 *
 *   1. Columns are named, never `select("*")`. Anon's table-wide SELECT on
 *      clubs, players and drills is revoked in favour of column grants, so a
 *      `*` here would not return fewer columns — it would fail outright with a
 *      permission error. The *_COLS constants below are the granted lists.
 *   2. What comes back is narrower than the app's own Club/Player/Drill, so the
 *      Public* types are Picks rather than the full rows. A page that wants
 *      user_id is a page that should not exist out here.
 *
 * getSupabase() rather than the browser client: these run in route loaders, so
 * on the server they must read through the request's cookies. A signed-in
 * visitor browsing the public side reads as themselves, which is fine —
 * the anon policies are additive, and a member sees at least what a stranger
 * would.
 */

export const CLUB_COLS =
  "id, name, slug, logo_url, theme_color, member_count, created_at, address, city, country, lat, lon";

/**
 * One club's own page, which is the only place these three are read.
 *
 * Deliberately not folded into CLUB_COLS. That string is a card in a list — the
 * directory asks for 24 of them, the map pins for up to 500, and every public
 * tournament and player row embeds one. A paragraph of prose and a week of
 * opening hours on each would grow all seven of those queries to buy nothing:
 * no card shows any of it.
 *
 * These columns need `GRANT SELECT` for anon before this ships — see
 * sql/schema.sql, which explains why the order is not negotiable.
 */
export const CLUB_DETAIL_COLS = `${CLUB_COLS}, description, phone, tables_info, schedule, timezone, photo_order`;
export const PERSON_COLS = "id, slug, name, avatar_url, is_public";
export const PLAYER_COLS = "id, club_id, category";
export const DRILL_COLS =
  "id, name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths, club_id, created_at";

/** How many cards a directory page holds. One number, so the route's page
 *  validator and the pager agree. */
export const PUBLIC_PAGE_SIZE = 24;

/**
 * `%` and `_` are wildcards to LIKE, and a visitor typing either means the
 * character. Backslash first, or it would escape the escapes.
 */
const likeEscape = (q: string) =>
  q.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);

export const contains = (q: string) => `%${likeEscape(q.trim())}%`;

/**
 * The same pattern, safe to drop inside an `.or()`.
 *
 * That filter is one comma-separated string, so a term containing a comma or a
 * parenthesis would end the condition early and be read as another one.
 * PostgREST accepts a double-quoted value; inside it only the quote and the
 * backslash need escaping.
 */
export const orContains = (q: string) =>
  `"${contains(q).replace(/["\\]/g, (c) => `\\${c}`)}"`;

/** 1-based page to the inclusive range PostgREST wants. */
export const rangeOf = (page: number, size = PUBLIC_PAGE_SIZE) => {
  const from = (Math.max(1, page) - 1) * size;
  return [from, from + size - 1] as const;
};
