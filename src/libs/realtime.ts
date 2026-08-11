import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/supabaseClient";
import { queryClient } from "./queryClient";
import { keys, type ClubScopedKeys } from "./queryKeys";
import { removeRow, upsertRow } from "./realtimeRows";
import type { Comment, Reaction } from "@/types";

/**
 * Social rows go straight into the cache instead of invalidating.
 *
 * One reaction from one member used to cost every other member a refetch of the
 * club's entire comment or reaction history. The row is already in the payload;
 * the round trip was buying nothing.
 *
 * Only for these two tables. Games and players feed the Elo ranking, which is
 * derived from the whole list, so there a refetch is the honest answer.
 */
function applySocialRow<T extends { id: number; club_id: number }>(
  table: ClubScopedKeys,
  matchesOptimistic: (candidate: T, incoming: T) => boolean,
) {
  return (payload: RealtimePostgresChangesPayload<T>) => {
    if (payload.eventType === "DELETE") {
      // Postgres sends only the primary key on delete unless the table is set
      // to REPLICA IDENTITY FULL, and ours are not — so there is no club_id to
      // key on. Drop the id from every club's list; it only lives in one.
      const { id } = payload.old;
      if (id === undefined) return;
      queryClient.setQueriesData<T[]>({ queryKey: table.all }, (rows) =>
        rows && rows.some((r) => r.id === id) ? removeRow(rows, id) : rows,
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
  a: { author_player_id: number; game_id: string | null; drill_log_id: number | null },
  b: { author_player_id: number; game_id: string | null; drill_log_id: number | null },
) =>
  a.author_player_id === b.author_player_id &&
  a.game_id === b.game_id &&
  a.drill_log_id === b.drill_log_id;

/** Drop everything cached for a table and let the screens refetch. */
const invalidate = (queryKey: readonly string[]) => () =>
  queryClient.invalidateQueries({ queryKey });

/** Three tables, one screen: the index and the tournament page both go stale
 *  whenever any of them changes. */
const invalidateTournaments = () => {
  queryClient.invalidateQueries({ queryKey: keys.tournaments.all });
  queryClient.invalidateQueries({ queryKey: keys.tournament.all });
};

/**
 * One realtime channel for the whole app, opened once outside React.
 *
 * This used to be a useEffect inside useGetPlayers/useGetGames, which meant one
 * channel per hook *instance* (a single page mounts several) and a subscribe +
 * removeChannel on every mount/unmount. StrictMode's double-mount then removed
 * the channel while its socket was still handshaking, which is what produced
 * "WebSocket is closed before the connection is established".
 *
 * Both listeners are attached before subscribe(), which is the supported way to
 * watch several tables on one channel.
 */
let started = false;

export function startRealtime() {
  if (started) return;
  started = true;

  const onTable = (table: string) =>
    ({ event: "*", schema: "public", table }) as const;

  supabase
    .channel("db-changes")
    .on("postgres_changes", onTable("players"), invalidate(keys.players.all))
    .on("postgres_changes", onTable("games"), invalidate(keys.games.all))
    // Drill logs share the home feed with games, so they refresh with them.
    .on(
      "postgres_changes",
      onTable("drill_logs"),
      invalidate(keys.drillLogs.all),
    )
    // Social tables: a conversation that needs a manual refresh is not one.
    // These two carry the row into the cache rather than invalidating — see
    // applySocialRow above.
    .on(
      "postgres_changes",
      onTable("comments"),
      applySocialRow<Comment>(
        keys.comments,
        (a, b) => sameTargetAndAuthor(a, b) && a.body === b.body,
      ),
    )
    .on(
      "postgres_changes",
      onTable("reactions"),
      applySocialRow<Reaction>(
        keys.reactions,
        (a, b) => sameTargetAndAuthor(a, b) && a.emoji === b.emoji,
      ),
    )
    .on(
      "postgres_changes",
      onTable("challenges"),
      invalidate(keys.challenges.all),
    )
    // A tournament page is derived from its whole fixture list — one result
    // moves the bracket and the tables — so these refetch rather than patch.
    // Both roots: the index shows status, the page shows everything.
    .on("postgres_changes", onTable("tournaments"), invalidateTournaments)
    .on("postgres_changes", onTable("tournament_players"), invalidateTournaments)
    .on("postgres_changes", onTable("tournament_matches"), invalidateTournaments)
    .subscribe();
}
