import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { DRILLS_ENABLED } from "@/libs/algorithms/features";
import { CLUB_COLS, DRILL_COLS, PERSON_COLS, contains, orContains } from "./shared";
import { type PublicClub } from "./clubs";
import { MEMBERSHIPS, type PublicPersonWithClubs } from "./players";
import { type PublicTournamentListItem } from "./tournaments";
import type { Drill } from "@/types";

/** How many of each kind /search shows before handing off to that section. */
const SEARCH_LIMIT = 5;

type PublicSearchResults = {
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
        // Hidden feature: the read still runs (one branch beats reshaping the
        // Promise.all), the results simply do not reach the page.
        drills: DRILLS_ENABLED ? (drills.data as unknown as Drill[]) : [],
      };
    },
    // A search is not worth refetching on every mount — the visitor is typing,
    // and each keystroke is already its own key.
    staleTime: 60_000,
  });
