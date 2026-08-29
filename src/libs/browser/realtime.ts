import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { keys, type ClubScopedKeys } from "@/libs/queryKeys";
import { removeRow, upsertRow } from "@/libs/algorithms/realtimeRows";
import type { Comment, LiveMatch, Reaction } from "@/types";

/**
 * These rows go straight into the cache instead of invalidating.
 *
 * One reaction from one member used to cost every other member a refetch of the
 * club's entire comment or reaction history. The row is already in the payload;
 * the round trip was buying nothing.
 *
 * Comments, reactions and live matches. Games and players feed the Elo ranking,
 * which is derived from the whole list, so there a refetch is the honest
 * answer; a score bump is the opposite case — the payload carries the whole new
 * row, and thirteen refetches of the club feed per race is what invalidating
 * would cost every open tab.
 *
 * `matchesOptimistic` is omitted for a table whose ids come from the client:
 * there the pending row and the row the socket brings back already share an id.
 */
function applyRow<T extends { id: string | number; club_id: number }>(
  queryClient: QueryClient,
  table: ClubScopedKeys,
  matchesOptimistic?: (candidate: T, incoming: T) => boolean,
) {
  return (payload: RealtimePostgresChangesPayload<T>) => {
    if (payload.eventType === "DELETE") {
      // Postgres sends only the primary key on delete unless the table is set
      // to REPLICA IDENTITY FULL, and ours are not — so there is no club_id to
      // key on. Drop the id from every club's list; it only lives in one.
      const { id } = payload.old;
      if (id === undefined) return;
      queryClient.setQueriesData<T[]>({ queryKey: table.all }, (rows) =>
        // Array.isArray, not a truthiness check: `all` is a prefix, so a
        // single-row cache entry filed under the same root would arrive here
        // and be handed a list edit.
        Array.isArray(rows) && rows.some((r) => r.id === id)
          ? removeRow(rows, id)
          : rows,
      );
      return;
    }

    const row = payload.new;
    // Returning the same reference leaves the cache untouched, which is what
    // should happen when this club's list was never fetched: a cache holding
    // one row would look complete.
    queryClient.setQueryData<T[]>(table.in(row.club_id), (rows) =>
      rows ? upsertRow(rows, row, matchesOptimistic) : rows,
    );
  };
}

/** Same target, same author — the fields that survive an optimistic insert. */
const sameTargetAndAuthor = (
  a: {
    author_player_id: number;
    game_id: string | null;
    drill_log_id: number | null;
  },
  b: {
    author_player_id: number;
    game_id: string | null;
    drill_log_id: number | null;
  },
) =>
  a.author_player_id === b.author_player_id &&
  a.game_id === b.game_id &&
  a.drill_log_id === b.drill_log_id;

/**
 * A live match lands in two caches: the club's list, and the scoreboard's own
 * single-row query.
 *
 * The second one is why `liveMatch` has a root of its own — applyRow's list
 * edits would otherwise be handed a single row. A delete is a match that has
 * just been filed as a game, so the scoreboard is told the row is gone rather
 * than being left to refetch a 404.
 */
function applyLiveMatch(queryClient: QueryClient) {
  const toList = applyRow<LiveMatch>(queryClient, keys.liveMatches);

  return (payload: RealtimePostgresChangesPayload<LiveMatch>) => {
    toList(payload);

    if (payload.eventType === "DELETE") {
      const { id } = payload.old;
      if (id !== undefined)
        queryClient.setQueryData(keys.liveMatch.one(id), null);
      return;
    }

    queryClient.setQueryData(keys.liveMatch.one(payload.new.id), payload.new);
  };
}

/** Drop everything cached for a table and let the screens refetch. */
const invalidate =
  (queryClient: QueryClient, queryKey: readonly string[]) => () =>
    queryClient.invalidateQueries({ queryKey });

/** Three tables, one screen: the index and the tournament page both go stale
 *  whenever any of them changes. */
const invalidateTournaments = (queryClient: QueryClient) => () => {
  queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
  queryClient.invalidateQueries({ queryKey: keys.tournament.all });
};

/**
 * One realtime channel for the club being looked at, opened once outside React.
 *
 * This used to be a useEffect inside usePlayers/useGames, which meant one
 * channel per hook *instance* (a single page mounts several) and a subscribe +
 * removeChannel on every mount/unmount. StrictMode's double-mount then removed
 * the channel while its socket was still handshaking, which is what produced
 * "WebSocket is closed before the connection is established".
 *
 * Every listener is attached before subscribe(), which is the supported way to
 * watch several tables on one channel.
 *
 * Called from an effect in the club layout rather than at module scope: under
 * SSR a module-scope call would try to open a websocket on the server, and the
 * club id is not known any higher up. The guard is on the club and not a plain
 * boolean, so StrictMode's double-mount is still a no-op while switching club
 * — which is a navigation, not a reload — swaps the channel.
 */
let channel: RealtimeChannel | null = null;
let channelClubId: number | null = null;

export function startRealtime(queryClient: QueryClient, clubId: number) {
  if (channel && channelClubId === clubId) return;

  // Switching club. Not awaited: the new channel has a name of its own, so
  // there is nothing for the old one's teardown to race with.
  if (channel) void supabase.removeChannel(channel);

  channelClubId = clubId;

  /**
   * Only this club's rows.
   *
   * Every tab used to receive every change in every club the database holds and
   * throw away the ones RLS let through but the screen had no use for. On a
   * tablet on a rail during a club night that is a socket message and a cache
   * write per rack scored anywhere in the system.
   */
  const onTable = (table: string) =>
    ({
      event: "*",
      schema: "public",
      table,
      filter: `club_id=eq.${clubId}`,
    }) as const;

  /**
   * The four tables with no club_id, which therefore cannot be filtered:
   * `people` is one identity across every club, `drill_logs` hangs off a player
   * and a drill, and the two tournament children hang off a tournament. They
   * stay unfiltered rather than being dropped — a rename with no avatar update
   * is exactly the kind of quiet staleness this channel exists to prevent.
   *
   * ponytail: none of them is a busy table. Add a club_id column and move them
   * up to onTable if one ever becomes one.
   */
  const onSharedTable = (table: string) =>
    ({ event: "*", schema: "public", table }) as const;

  const tournaments = invalidateTournaments(queryClient);

  channel = supabase
    .channel(`db-changes:${clubId}`)
    .on(
      "postgres_changes",
      onTable("players"),
      invalidate(queryClient, keys.players.all),
    )
    // Same cache as players, because that is where a person's name and face are
    // read from: the roster query embeds people and flattens it. Without this a
    // rename or a new avatar would not reach the other members until a reload.
    .on(
      "postgres_changes",
      onSharedTable("people"),
      invalidate(queryClient, keys.players.all),
    )
    .on(
      "postgres_changes",
      onTable("games"),
      invalidate(queryClient, keys.games.all),
    )
    // Drill logs share the home feed with games, so they refresh with them.
    .on(
      "postgres_changes",
      onSharedTable("drill_logs"),
      invalidate(queryClient, keys.drillLogs.all),
    )
    // A new drill goes on the home feed and the notification bell for
    // everyone, so it needs to show up without a manual refresh too.
    //
    // Unfiltered even though drills has a club_id, because that column is
    // nullable — a seeded drill belongs to the global library and to no club,
    // and `club_id=eq.N` would never match one.
    //
    // Note this listener does not currently fire at all: `drills` is not in the
    // supabase_realtime publication (grep ADD TABLE in sql/). Left in place
    // because it is correct the day it is added, not because it does anything
    // today.
    .on(
      "postgres_changes",
      onSharedTable("drills"),
      invalidate(queryClient, keys.drills.all),
    )
    // Social tables: a conversation that needs a manual refresh is not one.
    // These two carry the row into the cache rather than invalidating — see
    // applyRow above.
    .on(
      "postgres_changes",
      onTable("comments"),
      applyRow<Comment>(
        queryClient,
        keys.comments,
        (a, b) => sameTargetAndAuthor(a, b) && a.body === b.body,
      ),
    )
    .on(
      "postgres_changes",
      onTable("reactions"),
      applyRow<Reaction>(
        queryClient,
        keys.reactions,
        (a, b) => sameTargetAndAuthor(a, b) && a.emoji === b.emoji,
      ),
    )
    .on(
      "postgres_changes",
      onTable("challenges"),
      invalidate(queryClient, keys.challenges.all),
    )
    // A scoreboard two people are both looking at. The row arrives whole, so it
    // is patched in rather than refetched — see applyRow above. Finishing
    // deletes the row, and a delete payload carries only the id, so the removal
    // scans every club's list the way the social tables do.
    .on(
      "postgres_changes",
      onTable("live_matches"),
      applyLiveMatch(queryClient),
    )
    // The venue's tables change about once a year.
    .on(
      "postgres_changes",
      onTable("club_tables"),
      invalidate(queryClient, keys.clubTables.all),
    )
    // A tournament page is derived from its whole fixture list — one result
    // moves the bracket and the tables — so these refetch rather than patch.
    // Both roots: the index shows status, the page shows everything.
    .on("postgres_changes", onTable("tournaments"), tournaments)
    .on("postgres_changes", onSharedTable("tournament_players"), tournaments)
    .on("postgres_changes", onSharedTable("tournament_matches"), tournaments)
    // Subscribing used to be fire-and-forget, which made the one failure that
    // matters invisible: a channel that never joins, or joins and errors, looks
    // exactly like a quiet club. Every screen then runs on whatever refetch it
    // happens to have — 30 seconds on the wall display — and nothing says so.
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") return;
      console.warn(`realtime: ${status}`, err ?? "");
    });
}
