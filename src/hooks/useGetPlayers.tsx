import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
    queryKey: ["players", activeClubId],
    enabled: !!activeClubId,
    // `.throwOnError()` hands the failure to react-query, which logs it once in
    // libs/queryClient.ts. Same everywhere; see that file.
    queryFn: async () => {
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
