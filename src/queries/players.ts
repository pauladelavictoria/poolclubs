import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Player } from "@/types";

/**
 * The query, on its own, so a route loader and a component hook can share one
 * definition and one cache key.
 *
 * This is the pattern for everything under src/queries: the Supabase call moved
 * out of the hook unchanged, the hook became a two-line `useQuery(...)` wrapper,
 * and the route that renders it can now prime the same key in its loader. Two
 * copies of a query mean two keys, and two keys mean the loader warms a cache the
 * component never reads.
 *
 * Cache invalidation on inserts/updates lives in libs/realtime.ts — one channel
 * for the app, rather than one per hook instance.
 */

/** The roster: approved members only. Pending requests are useClubMembers. */
export const playersQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.players.in(clubId),
    // `.throwOnError()` hands the failure to react-query, which logs it once in
    // libs/queryClient.ts. Same everywhere; see that file.
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", clubId)
        .eq("status", "active")
        .order("name")
        .throwOnError();

      return data as Player[];
    },
  });

/** Everyone in the club, pending requests included. */
export const clubMembersQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.clubMembers.in(clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", clubId)
        .order("name")
        .throwOnError();

      return data as Player[];
    },
  });
