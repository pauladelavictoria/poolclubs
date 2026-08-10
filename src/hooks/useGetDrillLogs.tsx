import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import type { DrillLog } from "@/types";

export type UseGetDrillLogsFilters = {
  player_id?: number;
  drill_id?: number;
  /** Caps the rows fetched. Also what lets an unfiltered query run at all —
   *  without it the whole table would come down. */
  limit?: number;
};

export const useGetDrillLogs = (filters?: UseGetDrillLogsFilters) => {
  const { player_id, drill_id, limit } = filters ?? {};

  async function fetchDrillLogs() {
    let query = supabase
      .from("drill_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (player_id) {
      query = query.eq("player_id", player_id);
    }
    if (drill_id) {
      query = query.eq("drill_id", drill_id);
    }
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      throw error;
    }

    return data as DrillLog[];
  }

  return useQuery({
    queryKey: ["drill_logs", player_id, drill_id, limit],
    queryFn: fetchDrillLogs,
    enabled: !!player_id || !!drill_id || !!limit,
  });
};
