import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { drillQuery, drillsQuery } from "@/queries/drills";
import type { UseGetDrillsFilters } from "@/queries/drills";

export type { UseGetDrillsFilters };

/** One drill by id. Its own key, which useManageDrills invalidates on a save. */
export const useGetDrill = (id?: number) =>
  useQuery({ ...drillQuery(id ?? 0), enabled: !!id });

export const useGetDrills = (filters?: UseGetDrillsFilters) => {
  const { activeClubId } = useAuth();
  return useQuery(drillsQuery(activeClubId, filters ?? {}));
};
