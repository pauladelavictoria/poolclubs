import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { keys } from "@/libs/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import type { Drill, DrillDifficulty, DrillSkillType } from "@/types";

export type UseGetDrillsFilters = {
  difficulty?: DrillDifficulty;
  skill_type?: DrillSkillType;
};

/** One drill by id. Its own key, which useManageDrills invalidates on a save. */
export const useGetDrill = (id?: number) =>
  useQuery({
    queryKey: keys.drill.one(id),
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("no drill id");

      const { data } = await supabase
        .from("drills")
        .select("*")
        .eq("id", id)
        .single()
        .throwOnError();

      return data as Drill;
    },
  });

export const useGetDrills = (filters?: UseGetDrillsFilters) => {
  const { difficulty, skill_type } = filters ?? {};
  const { activeClubId } = useAuth();

  return useQuery({
    queryKey: keys.drills.list({ difficulty, skill_type }, activeClubId),
    enabled: !!activeClubId,
    queryFn: async () => {
      // The shared catalog (club_id null) plus whatever this club made itself.
      let query = supabase
        .from("drills")
        .select("*")
        .or(`club_id.is.null,club_id.eq.${activeClubId}`)
        .order("difficulty")
        .order("name");

      if (difficulty) query = query.eq("difficulty", difficulty);
      if (skill_type) query = query.eq("skill_type", skill_type);

      const { data } = await query.throwOnError();
      return data as Drill[];
    },
  });
};
