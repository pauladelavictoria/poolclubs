import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { ABANDON_AFTER_MS } from "@/libs/algorithms/night";
import type { ClubTable, LiveMatch } from "@/types";

/**
 * The club's night.
 *
 * Rows arrive over the realtime channel and go straight into these caches — see
 * applyLiveRow in libs/browser/realtime.ts. A score bump carries the whole row, so
 * refetching it would buy nothing and would cost every other open tab a request
 * per rack.
 */

/** Freshness comes from the socket, not from a poll — but a socket that dropped
 *  while the phone was in a pocket leaves the cache confidently wrong, and the
 *  scoreboard is the one screen where being wrong is obvious. So this one
 *  refetches on focus and on reconnect, unlike everything else in the app. */
const LIVE_CACHE = {
  staleTime: 0,
  gcTime: 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

/**
 * Every match still being played.
 *
 * Abandoned rows — two people started a match and went home — are filtered out
 * here rather than deleted by a scheduled job. They keep holding their table,
 * which is what puts the next person to want that table in front of the button
 * that clears them. The three hours are ABANDON_AFTER_MS, which is also what
 * the RLS policy allowing that delete is written to.
 */
export const liveMatchesQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.liveMatches.in(clubId),
    queryFn: async (): Promise<LiveMatch[]> => {
      const supabase = getSupabase();
      const since = new Date(Date.now() - ABANDON_AFTER_MS).toISOString();

      const { data } = await supabase
        .from("live_matches")
        .select("*")
        // Every list in the app is one club's, and RLS allows more than one.
        .eq("club_id", clubId)
        .gt("updated_at", since)
        .order("started_at", { ascending: true })
        .throwOnError();

      return (data ?? []) as LiveMatch[];
    },
    ...LIVE_CACHE,
  });

/**
 * One match, by id.
 *
 * Its own key rather than a lookup in the list: the scoreboard is opened from a
 * link that may be the first thing this tab loads, and it must not depend on
 * the club's list having been fetched. Returns null once the match is finished,
 * which is what the page renders its "this one is over" state from.
 */
export const liveMatchQuery = (id: string) =>
  queryOptions({
    queryKey: keys.liveMatch.one(id),
    queryFn: async (): Promise<LiveMatch | null> => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("live_matches")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .throwOnError();

      return (data as LiveMatch | null) ?? null;
    },
    ...LIVE_CACHE,
  });

/** The venue's tables. Changes about once a year, so it keeps the app's normal
 *  cache settings and its realtime listener invalidates rather than patches. */
export const clubTablesQuery = (clubId: number) =>
  queryOptions({
    queryKey: keys.clubTables.in(clubId),
    queryFn: async (): Promise<ClubTable[]> => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("club_tables")
        .select("*")
        .eq("club_id", clubId)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .throwOnError();

      return (data ?? []) as ClubTable[];
    },
  });
