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

  async function fetchPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("club_id", activeClubId)
      .eq("status", "active")
      .order('name')

    if (error) {
      console.error(error);
      throw error;
    }

    return data as Player[];
  }

  return useQuery({
    queryKey: ["players", activeClubId],
    queryFn: fetchPlayers,
    enabled: !!activeClubId,
  });
};
