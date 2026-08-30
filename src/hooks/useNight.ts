import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { keys } from "@/libs/queryKeys";
import { isPresent } from "@/libs/algorithms/night";
import { useNow } from "@/hooks/useNow";
import type { Player } from "@/types";

/**
 * Who is at the club right now.
 *
 * Derived from the roster that is already in the cache — being here is a column
 * on the membership, not a table of its own, so this costs no request and
 * updates over the same realtime channel a rename does.
 *
 * Empty until the browser knows the time; see libs/useNow.
 */
export const useWhoIsHere = (): Player[] => {
  const now = useNow();
  const { data: players } = usePlayers();

  return useMemo(
    () =>
      now === null ? [] : (players ?? []).filter((p) => isPresent(p, now)),
    [players, now],
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
       *  Refused by the guard in sql/live-night.sql unless you are the club or
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
