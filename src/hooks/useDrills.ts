import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { drillQuery, drillsQuery } from "@/queries/drills";
import type { DrillsFilters } from "@/queries/drills";

export type { DrillsFilters };

/** One drill by id. Its own key, which useManageDrills invalidates on a save. */
export const useDrill = (id?: number) =>
  useQuery({ ...drillQuery(id ?? 0), enabled: !!id });

export const useDrills = (filters?: DrillsFilters) => {
  const { activeClubId } = useAuth();
  return useQuery(drillsQuery(activeClubId, filters ?? {}));
};
