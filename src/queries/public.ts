import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { flattenPlayer } from "@/queries/players";
import type {
  Club,
  Discipline,
  Drill,
  DrillDifficulty,
  DrillSkillType,
  Person,
  Player,
  Tournament,
  TournamentMatch,
  TournamentStatus,
} from "@/types";

/**
 * Everything the public site reads.
 *
 * Two rules hold for every query in this file, and both come from
 * sql/public-pages.sql:
 *
 *   1. Columns are named, never `select("*")`. Anon's table-wide SELECT on
 *      clubs, players and drills is revoked in favour of column grants, so a
 *      `*` here would not return fewer columns — it would fail outright with a
 *      permission error. The three *_COLS constants below are the granted lists.
 *   2. What comes back is narrower than the app's own Club/Player/Drill, so the
 *      Public* types are Picks rather than the full rows. A page that wants
 *      join_code or user_id is a page that should not exist out here.
 *
 * getSupabase() rather than the browser client: these run in route loaders, so
 * on the server they must read through the request's cookies. A signed-in
 * visitor browsing the public side reads as themselves, which is fine —
 * the anon policies are additive, and a member sees at least what a stranger
 * would.
 */

const CLUB_COLS =
  "id, name, slug, logo_url, theme_color, member_count, created_at, address, city, country, lat, lon";
const PERSON_COLS = "id, slug, name, avatar_url, is_public";
const PLAYER_COLS = "id, club_id, category";
const DRILL_COLS =
  "id, name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths, club_id, created_at";

export type PublicClub = Pick<
  Club,
  | "id"
  | "name"
  | "slug"
  | "logo_url"
  | "theme_color"
  | "member_count"
  // Where it is. Public because the point of a club's page is that somebody
  // can turn up to it.
  | "address"
  | "city"
  | "country"
  | "lat"
  | "lon"
> & { created_at: string | null };

export type PublicPerson = Pick<
  Person,
  "id" | "slug" | "name" | "avatar_url" | "is_public"
>;

/** One membership, flattened the same way src/queries/players.ts does it, so a
 *  roster row out here is the same shape as a roster row inside a club. */
export type PublicPlayer = Pick<
  Player,
  "id" | "club_id" | "category" | "name" | "slug" | "avatar_url" | "is_public"
>;

/**
 * A person as the directory lists them: one card, every club they play for.
 *
 * This is what the split of people out of players bought. The directory used to
 * query players, so somebody in three clubs was three cards with three profile
 * links; it queries people now, and the clubs are a list on one card.
 */
export type PublicPersonWithClubs = PublicPerson & {
  memberships: { id: number; category: number; club: PublicClub }[];
};

export type PublicTournament = Tournament & { club: PublicClub | null };

export type PublicTournamentListItem = PublicTournament & {
  tournament_players: { count: number }[];
};

export type PublicTournamentDetail = PublicTournament & {
  tournament_players: { player_id: number }[];
  tournament_matches: TournamentMatch[];
};

/** How many cards a directory page holds. One number, so the route's page
 *  validator and the pager agree. */
export const PUBLIC_PAGE_SIZE = 24;

/** How many of each kind /search shows before handing off to that section. */
export const SEARCH_LIMIT = 5;

/**
 * `%` and `_` are wildcards to LIKE, and a visitor typing either means the
 * character. Backslash first, or it would escape the escapes.
 */
const likeEscape = (q: string) =>
  q.replace(/\\/g, "\\\\").replace(/[%_]/g, (c) => `\\${c}`);

const contains = (q: string) => `%${likeEscape(q.trim())}%`;

/**
 * The same pattern, safe to drop inside an `.or()`.
 *
 * That filter is one comma-separated string, so a term containing a comma or a
 * parenthesis would end the condition early and be read as another one.
 * PostgREST accepts a double-quoted value; inside it only the quote and the
 * backslash need escaping.
 */
const orContains = (q: string) =>
  `"${contains(q).replace(/["\\]/g, (c) => `\\${c}`)}"`;

/** 1-based page to the inclusive range PostgREST wants. */
const rangeOf = (page: number, size = PUBLIC_PAGE_SIZE) => {
  const from = (Math.max(1, page) - 1) * size;
  return [from, from + size - 1] as const;
};

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export type PublicClubSort = "members" | "name" | "new";

/** What the map can see: [west, south, east, north], as MapLibre reports it. */
export type Bbox = [number, number, number, number];

export type PublicClubsFilters = {
  q?: string;
  sort?: PublicClubSort;
  page?: number;
  /** Only clubs inside this box. Set while the directory is tied to the map. */
  bbox?: Bbox;
};

/**
 * The directory. One flat sorted page — no "active this week" section, because
 * that needs a per-club last-played date and there is no column for it; a
 * subquery per card is a worse trade than leaving it out.
 */
export const publicClubsQuery = (filters: PublicClubsFilters = {}) => {
  const { q, sort = "members", page = 1, bbox } = filters;

  return queryOptions({
    queryKey: keys.public.clubs(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("clubs")
        .select(CLUB_COLS, { count: "exact" })
        // Redundant against the anon policy, and deliberately so: a signed-in
        // visitor reads under their own policies, which would otherwise show
        // them their own hidden club in a public directory.
        .eq("is_public", true);

      // Name or where it is: "Madrid" is as likely a search for a club as its
      // name is, and the address, the city and the country are all places that
      // word can live. A plain substring on each — near enough for a directory
      // this size, and it needs no geocoding of the term.
      if (q?.trim()) {
        const term = orContains(q);
        query = query.or(
          ["name", "address", "city", "country"]
            .map((col) => `${col}.ilike.${term}`)
            .join(","),
        );
      }

      // A club with no coordinates drops out on its own: every comparison
      // against NULL is false, which is the right answer to "is it in view".
      //
      // ponytail: a box that crosses the antimeridian arrives with west > east
      // and this returns nothing rather than the two halves. Nowhere near the
      // clubs this app has; the fix is an .or() of two ranges when it matters.
      if (bbox) {
        const [west, south, east, north] = bbox;
        query = query
          .gte("lat", south)
          .lte("lat", north)
          .gte("lon", west)
          .lte("lon", east);
      }

      if (sort === "name") query = query.order("name");
      else if (sort === "new")
        query = query.order("created_at", { ascending: false });
      else
        query = query.order("member_count", { ascending: false }).order("name");

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      return { clubs: data as PublicClub[], totalCount: count ?? 0 };
    },
  });
};

/** A club as a dot on the map: logo and name to recognise it by, slug to open,
 *  coordinates to be at. */
export type PublicClubPin = Pick<
  Club,
  "id" | "name" | "slug" | "address" | "city" | "logo_url"
> & {
  lat: number;
  lon: number;
};

/**
 * Every listed club that has coordinates, for the map on /clubs.
 *
 * Unfiltered and unpaginated on purpose: the map is how someone finds a club
 * near them, and a map that only holds page one of the current sort answers a
 * different question than the one being asked. It is also why this is its own
 * query rather than a column on the directory's — the two disagree about what
 * "the clubs" means.
 */
export const publicClubPinsQuery = () =>
  queryOptions({
    queryKey: keys.public.clubPins(),
    queryFn: async () => {
      const { data } = await getSupabase()
        .from("clubs")
        .select("id, name, slug, address, city, logo_url, lat, lon")
        .eq("is_public", true)
        .not("lat", "is", null)
        // A hard cap, not a page: past this the map is a solid mass of pins
        // anyway. Worth revisiting with clustering if the directory ever gets
        // near it — at which point this silently stops showing every club.
        .limit(500)
        .throwOnError();

      return (data ?? []) as PublicClubPin[];
    },
    // Clubs do not move. This is the same answer all session.
    staleTime: 10 * 60_000,
  });

/** One club by slug. Null rather than a throw when there is no such club, or it
 *  is hidden — the route turns that into a notFound(). */
export const publicClubQuery = (slug: string) =>
  queryOptions({
    queryKey: keys.public.club(slug),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("clubs")
        .select(CLUB_COLS)
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle()
        .throwOnError();

      return (data as PublicClub | null) ?? null;
    },
  });

/**
 * Every active member of a public club — including the ones who opted out of
 * being listed.
 *
 * Deliberately unfiltered, because this is what turns ids into names: the
 * results tape, the ranking, a league table and a bracket all resolve people
 * through it, and dropping someone here would leave holes in the club's own
 * record rather than in a list about them. The club page filters `is_public`
 * itself for the roster grid, which is the one place that is a list of people.
 */
export const publicClubRosterQuery = (clubId: number) =>
  queryOptions({
    queryKey: [...keys.public.all, "roster", clubId] as const,
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("players")
        .select(`${PLAYER_COLS}, person:people(${PERSON_COLS})`)
        .eq("club_id", clubId)
        .eq("status", "active")
        .throwOnError();

      // Sorted here rather than in the query, and alphabetically by the
      // person's name: PostgREST cannot order parent rows by an embedded
      // column. Same trade as the club roster inside the app — see
      // src/queries/players.ts.
      return (data ?? [])
        .map((row) => flattenPlayer(row) as unknown as PublicPlayer)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export type PublicPlayerSort = "name" | "category";

export type PublicPlayersFilters = {
  q?: string;
  clubId?: number;
  category?: number;
  sort?: PublicPlayerSort;
  page?: number;
};

/** The embed every person query needs: their active memberships in public
 *  clubs, and nothing about the clubs that are hidden. */
const MEMBERSHIPS = `memberships:players!inner(${PLAYER_COLS}, club:clubs!inner(${CLUB_COLS}))`;

/**
 * The directory, one card per person.
 *
 * `people` is the base table rather than `players`, which is the whole point of
 * the split: querying memberships gave one card per club, so somebody in three
 * clubs appeared three times. It also keeps the sort and the pager on the server
 * — grouping duplicate players in the browser could not, because `.range()`
 * would already have cut the page before the grouping ran.
 */
export const publicPlayersQuery = (filters: PublicPlayersFilters = {}) => {
  const { q, clubId, category, sort = "name", page = 1 } = filters;

  return queryOptions({
    queryKey: keys.public.players(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("people")
        .select(`${PERSON_COLS}, ${MEMBERSHIPS}`, { count: "exact" })
        // The directory is a list of people, so this is exactly where opting out
        // applies. It is an app-level filter, not a policy: the row stays
        // readable so results and brackets can still name them.
        .eq("is_public", true)
        // !inner on both embeds plus these: without them, somebody whose only
        // club is hidden comes back with an empty memberships array rather than
        // being dropped.
        //
        // "memberships." and "memberships.club." are the embeds' aliases, not
        // table names. PostgREST resolves an embedded filter against the alias
        // when one is given, so "players.status" here would not be a stricter
        // filter — it would be an unknown column, and the row would come
        // through.
        .eq("memberships.status", "active")
        .eq("memberships.club.is_public", true);

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (clubId) query = query.eq("memberships.club_id", clubId);
      // Division is per club, so this asks "in any of their clubs", which is
      // what a cross-club directory can honestly mean by it.
      if (category) query = query.eq("memberships.category", category);

      query = query.order("name");

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      const people = data as unknown as PublicPersonWithClubs[];

      // Sorting by division is the one thing that cannot move to the server:
      // there is no single division to sort on any more. Their strongest is the
      // fair answer, and it only reorders the page already fetched.
      if (sort === "category") {
        people.sort(
          (a, b) =>
            Math.min(...a.memberships.map((m) => m.category)) -
              Math.min(...b.memberships.map((m) => m.category)) ||
            a.name.localeCompare(b.name),
        );
      }

      return { people, totalCount: count ?? 0 };
    },
  });
};

/**
 * One person, with every public club they play for. Null when they have none —
 * hidden clubs and pending memberships are both a 404 out here, for the same
 * reason: neither is a public profile.
 *
 * `is_public` is not a condition: it governs whether somebody is *listed*, and a
 * name in a result links here. 404-ing an unlisted person would leave every one
 * of those links broken. The profile is reachable, just never advertised — the
 * sitemap leaves it out.
 */
export const publicPersonQuery = (slug: string) =>
  queryOptions({
    queryKey: keys.public.person(slug),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("people")
        .select(`${PERSON_COLS}, ${MEMBERSHIPS}`)
        .eq("slug", slug)
        .eq("memberships.status", "active")
        .eq("memberships.club.is_public", true)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as PublicPersonWithClubs | null) ?? null;
    },
  });

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

export type PublicTournamentsFilters = {
  q?: string;
  status?: TournamentStatus;
  format?: Tournament["format"];
  discipline?: Discipline;
  /** Set by a club's own profile, absent on the cross-club index. */
  clubId?: number;
  page?: number;
};

export const publicTournamentsQuery = (
  filters: PublicTournamentsFilters = {},
) => {
  const { q, status, format, discipline, clubId, page = 1 } = filters;

  return queryOptions({
    queryKey: keys.public.tournaments(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("tournaments")
        .select(
          `*, club:clubs!inner(${CLUB_COLS}), tournament_players(count)`,
          { count: "exact" },
        )
        .eq("club.is_public", true)
        .order("created_at", { ascending: false });

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (status) query = query.eq("status", status);
      if (format) query = query.eq("format", format);
      if (discipline) query = query.eq("discipline", discipline);
      if (clubId) query = query.eq("club_id", clubId);

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      return {
        tournaments: data as unknown as PublicTournamentListItem[],
        totalCount: count ?? 0,
      };
    },
  });
};

/** Mirrors tournamentQuery in queries/tournaments.ts — same one round trip for
 *  entrants and fixtures, plus the club, since out here the page has no club
 *  context to read it from. */
export const publicTournamentQuery = (id: number) =>
  queryOptions({
    queryKey: keys.public.tournament(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("tournaments")
        .select(
          `*, club:clubs!inner(${CLUB_COLS}), tournament_players(player_id), tournament_matches(*, game:games(player_1_id, player_1_score, player_2_score, created_at))`,
        )
        .eq("id", id)
        .eq("club.is_public", true)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as PublicTournamentDetail | null) ?? null;
    },
  });

// ---------------------------------------------------------------------------
// Drills
// ---------------------------------------------------------------------------

export type PublicDrillsFilters = {
  q?: string;
  difficulty?: DrillDifficulty;
  skill_type?: DrillSkillType;
};

/** The shared catalog only. A club's own drills are the club's own business,
 *  which is what the RLS policy says too. */
export const publicDrillsQuery = (filters: PublicDrillsFilters = {}) => {
  const { q, difficulty, skill_type } = filters;

  return queryOptions({
    queryKey: keys.public.drills(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("drills")
        .select(DRILL_COLS)
        .is("club_id", null)
        .order("difficulty")
        .order("name");

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (difficulty) query = query.eq("difficulty", difficulty);
      if (skill_type) query = query.eq("skill_type", skill_type);

      const { data } = await query.throwOnError();
      return data as unknown as Drill[];
    },
  });
};

export const publicDrillQuery = (id: number) =>
  queryOptions({
    queryKey: keys.public.drill(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("drills")
        .select(DRILL_COLS)
        .eq("id", id)
        .is("club_id", null)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as Drill | null) ?? null;
    },
  });

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------

export type PublicSearchResults = {
  clubs: PublicClub[];
  people: PublicPersonWithClubs[];
  tournaments: PublicTournamentListItem[];
  drills: Drill[];
};

/**
 * Four `ilike` reads at once rather than one RPC over a union: the four result
 * blocks want four different shapes, and a SQL function returning a common one
 * would have to flatten them and the page would have to unflatten them again.
 * They run in parallel, so it is one round trip's latency either way.
 */
export const publicSearchQuery = (q: string) =>
  queryOptions({
    queryKey: keys.public.search(q),
    queryFn: async (): Promise<PublicSearchResults> => {
      const supabase = getSupabase();
      const term = contains(q);

      const [clubs, people, tournaments, drills] = await Promise.all([
        supabase
          .from("clubs")
          .select(CLUB_COLS)
          .eq("is_public", true)
          // Name or location, the same rule the clubs directory searches by.
          .or(
            ["name", "address", "city", "country"]
              .map((col) => `${col}.ilike.${orContains(q)}`)
              .join(","),
          )
          .order("member_count", { ascending: false })
          .limit(SEARCH_LIMIT)
          .throwOnError(),
        // People, not memberships — otherwise searching a name that plays in
        // three clubs spends the whole result block on one person.
        supabase
          .from("people")
          .select(`${PERSON_COLS}, ${MEMBERSHIPS}`)
          .eq("is_public", true)
          .eq("memberships.status", "active")
          .eq("memberships.club.is_public", true)
          .ilike("name", term)
          .order("name")
          .limit(SEARCH_LIMIT)
          .throwOnError(),
        supabase
          .from("tournaments")
          .select(
            `*, club:clubs!inner(${CLUB_COLS}), tournament_players(count)`,
          )
          .eq("club.is_public", true)
          .ilike("name", term)
          .order("created_at", { ascending: false })
          .limit(SEARCH_LIMIT)
          .throwOnError(),
        supabase
          .from("drills")
          .select(DRILL_COLS)
          .is("club_id", null)
          .ilike("name", term)
          .order("name")
          .limit(SEARCH_LIMIT)
          .throwOnError(),
      ]);

      return {
        clubs: clubs.data as PublicClub[],
        people: people.data as unknown as PublicPersonWithClubs[],
        tournaments: tournaments.data as unknown as PublicTournamentListItem[],
        drills: drills.data as unknown as Drill[],
      };
    },
    // A search is not worth refetching on every mount — the visitor is typing,
    // and each keystroke is already its own key.
    staleTime: 60_000,
  });
