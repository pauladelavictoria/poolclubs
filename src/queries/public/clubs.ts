import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { flattenPlayer } from "@/queries/players";
import { CLUB_COLS, PERSON_COLS, PLAYER_COLS, orContains, rangeOf } from "./shared";
import type { Club, Player } from "@/types";

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

/** One membership, flattened the same way src/queries/players.ts does it, so a
 *  roster row out here is the same shape as a roster row inside a club. */
export type PublicPlayer = Pick<
  Player,
  "id" | "club_id" | "category" | "name" | "slug" | "avatar_url" | "is_public"
>;

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
type PublicClubPin = Pick<
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
