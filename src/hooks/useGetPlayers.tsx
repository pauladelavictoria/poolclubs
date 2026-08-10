import { useMemo } from "react";
import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { keys } from "@/libs/queryKeys";
import type { Player } from "@/types";

// Cache invalidation on inserts/updates lives in libs/realtime.ts — one channel
// for the app, rather than one per hook instance.
//
// The club comes from context, not from the caller: every call site means "the
// club I am looking at", so threading it through as an argument would only give
// them a chance to get it wrong.
export const useGetPlayers = () => {
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: keys.players.in(activeClubId),
    enabled: !!activeClubId,
    // `.throwOnError()` hands the failure to react-query, which logs it once in
    // libs/queryClient.ts. Same everywhere; see that file.
    queryFn: async () => {
      // `enabled` already stops this running without a club, but that is a
      // runtime guarantee and the query builder wants a compile-time one.
      if (!activeClubId) throw new Error("no active club");

      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("club_id", activeClubId)
        .eq("status", "active")
        .order("name")
        .throwOnError();

      return data as Player[];
    },
  });
};

export const usePlayerLookup = () => {
  const { data } = useGetPlayers();

  return useMemo(() => {
    const byId = new Map((data ?? []).map((player) => [player.id, player]));
    return {
      byId,
      /** The em dash is what a list shows for someone since removed. */
      nameOf: (id: number) => byId.get(id)?.name ?? "—",
    };
  }, [data]);
};
