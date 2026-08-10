import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { keys } from "@/libs/queryKeys";
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

  return useQuery({
    queryKey: keys.drillLogs.list({ player_id, drill_id, limit }),
    enabled: !!player_id || !!drill_id || !!limit,
    queryFn: async () => {
      let query = supabase
        .from("drill_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (player_id) query = query.eq("player_id", player_id);
      if (drill_id) query = query.eq("drill_id", drill_id);
      if (limit) query = query.limit(limit);

      const { data } = await query.throwOnError();
      return data as DrillLog[];
    },
  });
};
