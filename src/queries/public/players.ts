import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { CLUB_COLS, PERSON_COLS, PLAYER_COLS, contains, rangeOf } from "./shared";
import type { PublicClub } from "./clubs";
import type { Person } from "@/types";

type PublicPerson = Pick<
  Person,
  "id" | "slug" | "name" | "avatar_url" | "is_public"
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

type PublicPlayerSort = "name" | "category";

export type PublicPlayersFilters = {
  q?: string;
  clubId?: number;
  category?: number;
  sort?: PublicPlayerSort;
  page?: number;
};

/** The embed every person query needs: their active memberships in public
 *  clubs, and nothing about the clubs that are hidden. */
export const MEMBERSHIPS = `memberships:players!inner(${PLAYER_COLS}, club:clubs!inner(${CLUB_COLS}))`;

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
