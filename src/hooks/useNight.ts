import { useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/libs/supabase/browser";
import { useAuth } from "@/hooks/useAuth";
import { usePlayers } from "@/hooks/usePlayers";
import { useLiveMatches } from "@/hooks/useLiveMatch";
import { keys } from "@/libs/queryKeys";
import { SESSION_KEY } from "@/queries/session";
import { whoIsHere } from "@/libs/algorithms/night";
import { useNow } from "@/hooks/useNow";
import { sendPush } from "@/libs/server/push.functions";
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

/**
 * Calling the club in: one tap, and every member who is not already here gets
 * told the ranking night is on.
 *
 * The RPC is what does it. It records the call on the club row and refuses a
 * second one inside two hours — in the database, not here, because an admin may
 * write their own club row under RLS and a rate limit the page owned would last
 * exactly as long as one page reload. See sql/schema.sql, `call_ranking_night`.
 *
 * The push is fired after and never awaited, the way every other one in the app
 * is (useChallenges, useTournaments): whether the club's phones actually buzzed
 * is not the admin's problem to be shown an error about, and push_targets
 * decides who was even eligible. The bell derives the same event from
 * `night_call_at`, which is the durable half.
 */
export const useCallNight = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { activeClubId } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!activeClubId) throw new Error("no active club");
      const { data } = await supabase
        .rpc("call_ranking_night", { p_club_id: activeClubId })
        .throwOnError();
      return data;
    },
    onSuccess: async () => {
      // The club row carries night_call_at and it rides on the session, so the
      // button's own "called just now" state comes from re-reading that.
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
      await router.invalidate();

      if (activeClubId)
        void sendPush({ data: { kind: "nightCall", id: activeClubId } }).catch(
          () => {},
        );
    },
  });
};
