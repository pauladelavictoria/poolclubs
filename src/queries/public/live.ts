import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { ABANDON_AFTER_MS } from "@/libs/algorithms/night";
import type { LiveMatch } from "@/types";

/**
 * The overlay's own reads of `live_matches` — see docs/youtube-streaming.md
 * Phase 1. Both queries are anon, public-clubs-only, and poll rather than use
 * the realtime channel: see the note on OVERLAY_LIVE below.
 *
 * `select("*")` is correct here, unlike the rest of queries/public/:
 * live_matches carries a table-wide `GRANT ALL TO anon` (sql/schema.sql:3396),
 * unlike clubs/players/people, which are column-granted. Player names are
 * resolved separately, from publicClubRosterQuery — both overlay pages
 * already need it (the match-keyed one for the bracket's numbering, the
 * table-keyed one because a table's occupant is only known once this query
 * answers), so there is no second name-lookup path to write here.
 */
const OVERLAY_LIVE = {
  staleTime: 0,
  // 5s, not the realtime channel: libs/browser/realtime.ts is club-scoped and
  // started from the authed ClubLayout, so wiring an anon channel here is real
  // work for a latency nobody watching a rack over a camera can perceive.
  // Revisit if it reads laggy on camera.
  refetchInterval: 5000,
} as const;

/** One fixture's live row, or null while it hasn't started, has finished, or
 *  was abandoned — see ABANDON_AFTER_MS below. */
export const publicLiveMatchByTournamentMatchQuery = (matchId: string) =>
  queryOptions({
    queryKey: keys.public.liveMatch(matchId),
    queryFn: async (): Promise<LiveMatch | null> => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("live_matches")
        .select("*")
        .eq("tournament_match_id", matchId)
        .maybeSingle()
        .throwOnError();

      return (data as LiveMatch | null) ?? null;
    },
    ...OVERLAY_LIVE,
  });

export type PublicLiveMatchOnTable = LiveMatch & {
  club: { slug: string; name: string };
};

/**
 * Whatever is live on one table right now, keyed by the club and table a
 * camera is bolted to rather than by fixture — tournament or casual game
 * alike, since both are live_matches rows. A table-keyed OBS scene then never
 * needs its URL touched again between matches or tournaments.
 *
 * The abandoned-row filter matches queries/live.ts's own: two players who
 * walked away three hours ago must not sit on the stream forever.
 */
export const publicLiveMatchByTableQuery = (clubSlug: string, tableId: number) =>
  queryOptions({
    queryKey: keys.public.liveMatchByTable(clubSlug, tableId),
    queryFn: async (): Promise<PublicLiveMatchOnTable | null> => {
      const supabase = getSupabase();
      const since = new Date(Date.now() - ABANDON_AFTER_MS).toISOString();

      const { data } = await supabase
        .from("live_matches")
        .select("*, club:clubs!inner(slug, name)")
        .eq("club.slug", clubSlug)
        .eq("club.is_public", true)
        .eq("table_id", tableId)
        .gt("updated_at", since)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as PublicLiveMatchOnTable | null) ?? null;
    },
    ...OVERLAY_LIVE,
  });
