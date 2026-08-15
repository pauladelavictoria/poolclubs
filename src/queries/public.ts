import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type {
  Club,
  Discipline,
  Drill,
  DrillDifficulty,
  DrillSkillType,
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
  "id, name, slug, logo_url, theme_color, member_count, created_at";
const PLAYER_COLS = "id, name, club_id, category, avatar_url, is_public";
const DRILL_COLS =
  "id, name, description, difficulty, skill_type, setup_instructions, scoring_method, max_score, ball_positions, shot_paths, club_id, created_at";

export type PublicClub = Pick<
  Club,
  "id" | "name" | "slug" | "logo_url" | "theme_color" | "member_count"
> & { created_at: string | null };

export type PublicPlayer = Pick<
  Player,
  "id" | "name" | "club_id" | "category" | "avatar_url" | "is_public"
>;

/** A player as the cross-club directory lists them: with the club they play for,
 *  since out here a name on its own doesn't say who someone is. */
export type PublicPlayerWithClub = PublicPlayer & { club: PublicClub | null };

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

/** 1-based page to the inclusive range PostgREST wants. */
const rangeOf = (page: number, size = PUBLIC_PAGE_SIZE) => {
  const from = (Math.max(1, page) - 1) * size;
  return [from, from + size - 1] as const;
};

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

export type PublicClubSort = "members" | "name" | "new";

export type PublicClubsFilters = {
  q?: string;
  sort?: PublicClubSort;
  page?: number;
};

/**
 * The directory. One flat sorted page — no "active this week" section, because
 * that needs a per-club last-played date and there is no column for it; a
 * subquery per card is a worse trade than leaving it out.
 */
export const publicClubsQuery = (filters: PublicClubsFilters = {}) => {
  const { q, sort = "members", page = 1 } = filters;

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

      if (q?.trim()) query = query.ilike("name", contains(q));

      if (sort === "name") query = query.order("name");
      else if (sort === "new")
        query = query.order("created_at", { ascending: false });
      else
        query = query
          .order("member_count", { ascending: false })
          .order("name");

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      return { clubs: data as PublicClub[], totalCount: count ?? 0 };
    },
  });
};

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
        .select(PLAYER_COLS)
        .eq("club_id", clubId)
        .eq("status", "active")
        .order("name")
        .throwOnError();

      return data as PublicPlayer[];
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

export const publicPlayersQuery = (filters: PublicPlayersFilters = {}) => {
  const { q, clubId, category, sort = "name", page = 1 } = filters;

  return queryOptions({
    queryKey: keys.public.players(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("players")
        .select(`${PLAYER_COLS}, club:clubs!inner(${CLUB_COLS})`, {
          count: "exact",
        })
        .eq("status", "active")
        // The directory is a list of people, so this is exactly where opting out
        // applies. It is an app-level filter, not a policy: the row stays
        // readable so results and brackets can still name them.
        .eq("is_public", true)
        // !inner above plus this: without both, a player whose club is hidden
        // comes back with club: null rather than being dropped.
        //
        // "club." is the embed's alias, not the table name. PostgREST resolves an
        // embedded filter against the alias when one is given, so
        // "clubs.is_public" here is not a stricter filter — it is an unknown
        // column, and the hidden club comes through.
        .eq("club.is_public", true);

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (clubId) query = query.eq("club_id", clubId);
      if (category) query = query.eq("category", category);

      query =
        sort === "category"
          ? query.order("category").order("name")
          : query.order("name");

      const [from, to] = rangeOf(page);
      const { data, count } = await query.range(from, to).throwOnError();

      return {
        players: data as unknown as PublicPlayerWithClub[],
        totalCount: count ?? 0,
      };
    },
  });
};

/**
 * One player, with their club. Null when the club is hidden or the membership is
 * still pending — both are a 404 out here.
 *
 * `is_public` is not a condition: it governs whether somebody is *listed*, and a
 * name in a result links here. 404-ing an unlisted player would leave every one
 * of those links broken. The profile is reachable, just never advertised — the
 * sitemap leaves it out.
 */
export const publicPlayerQuery = (playerId: number) =>
  queryOptions({
    queryKey: keys.public.player(playerId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("players")
        .select(`${PLAYER_COLS}, club:clubs!inner(${CLUB_COLS})`)
        .eq("id", playerId)
        .eq("status", "active")
        .eq("club.is_public", true)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as PublicPlayerWithClub | null) ?? null;
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
  players: PublicPlayerWithClub[];
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

      const [clubs, players, tournaments, drills] = await Promise.all([
        supabase
          .from("clubs")
          .select(CLUB_COLS)
          .eq("is_public", true)
          .ilike("name", term)
          .order("member_count", { ascending: false })
          .limit(SEARCH_LIMIT)
          .throwOnError(),
        supabase
          .from("players")
          .select(`${PLAYER_COLS}, club:clubs!inner(${CLUB_COLS})`)
          .eq("status", "active")
          .eq("is_public", true)
          .eq("club.is_public", true)
          .ilike("name", term)
          .order("name")
          .limit(SEARCH_LIMIT)
          .throwOnError(),
        supabase
          .from("tournaments")
          .select(`*, club:clubs!inner(${CLUB_COLS}), tournament_players(count)`)
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
        players: players.data as unknown as PublicPlayerWithClub[],
        tournaments: tournaments.data as unknown as PublicTournamentListItem[],
        drills: drills.data as unknown as Drill[],
      };
    },
    // A search is not worth refetching on every mount — the visitor is typing,
    // and each keystroke is already its own key.
    staleTime: 60_000,
  });
