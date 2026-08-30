import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { keys } from "@/libs/queryKeys";
import { whoIsHere } from "@/libs/algorithms/night";
import { useNow } from "@/hooks/useNow";
import type { Player } from "@/types";

/**
 * Who is at the club right now: checked in, or sat at a table.
 *
 * Derived from two lists already in the cache — being here is a column on the
 * membership and a seat is a live row, so this costs no request of its own and
 * updates over the same realtime channel a rename does. The rule itself is
 * `whoIsHere` in libs/algorithms/night.ts, where it can be checked.
 */
export const useWhoIsHere = (): Player[] => {
  const now = useNow();
  const { data: players } = usePlayers();
  const { data: live } = useLiveMatches();

  return useMemo(
    () => whoIsHere(players ?? [], live ?? [], now),
    [players, live, now],
  );
};

/**
 * Saying you are here, and saying you have gone.
 *
 * One tap either way. A check-in that is never taken back expires on its own
 * after PRESENT_WINDOW_MS, which is why nothing here has to remember to.
 */
export const useCheckIn = () => {
  const queryClient = useQueryClient();
  const { player } = useAuth();

  return useMutation({
    mutationFn: async ({
      here,
      playerId,
    }: {
      here: boolean;
      /** Somebody else — the tablet checking in whoever is standing at it.
       *  Refused by the guard in sql/schema.sql unless you are the club or
       *  its device, so the UI only offers it where the database allows it. */
      playerId?: number;
    }) => {
      const id = playerId ?? player?.id;
      if (!id) throw new Error("no player");
      await supabase
        .from("players")
        .update({ present_since: here ? new Date().toISOString() : null })
        .eq("id", id)
        .throwOnError();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: keys.players.all }),
  });
};
