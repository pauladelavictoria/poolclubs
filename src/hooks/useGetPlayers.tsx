import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import type { Player } from "@/types";

// Cache invalidation on inserts/updates lives in libs/realtime.ts — one channel
// for the app, rather than one per hook instance.
export const useGetPlayers = () => {
  async function fetchPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order('name')

    if (error) {
      console.error(error);
      throw error;
    }

    return data as Player[];
  }

  return useQuery({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });
};
