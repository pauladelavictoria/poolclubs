import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { drillLogsQuery } from "@/queries/drills";
import type { DrillLogsFilters } from "@/queries/drills";

export type { DrillLogsFilters };

export const useDrillLogs = (filters?: DrillLogsFilters) => {
  const { player_id, drill_id, limit } = filters ?? {};

  return useQuery({
    ...drillLogsQuery({ player_id, drill_id, limit }),
    // Without one of these the whole table would come down.
    enabled: !!player_id || !!drill_id || !!limit,
    // A wider limit is the same list plus more: keep showing it while it loads.
    placeholderData: keepPreviousData,
  });
};
