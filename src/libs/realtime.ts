import { supabase } from "@/supabaseClient";
import { queryClient } from "./queryClient";

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

  supabase
    .channel("db-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players" },
      () => queryClient.invalidateQueries({ queryKey: ["players"] })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games" },
      () => queryClient.invalidateQueries({ queryKey: ["games"] })
    )
    // Drill logs share the home feed with games, so they refresh with them.
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "drill_logs" },
      () => queryClient.invalidateQueries({ queryKey: ["drill_logs"] })
    )
    // Social tables: a conversation that needs a manual refresh is not one.
    // The keys are prefixes, so the club id in ["comments", clubId] still matches.
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      () => queryClient.invalidateQueries({ queryKey: ["comments"] })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reactions" },
      () => queryClient.invalidateQueries({ queryKey: ["reactions"] })
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "challenges" },
      () => queryClient.invalidateQueries({ queryKey: ["challenges"] })
    )
    .subscribe();
}
