import { supabase } from "@/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import type { Drill, DrillDifficulty, DrillSkillType } from "@/types";

export type UseGetDrillsFilters = {
  difficulty?: DrillDifficulty;
  skill_type?: DrillSkillType;
};

export const useGetDrills = (filters?: UseGetDrillsFilters) => {
  const { difficulty, skill_type } = filters ?? {};

  return useQuery({
    queryKey: ["drills", difficulty, skill_type],
    queryFn: async () => {
      let query = supabase
        .from("drills")
        .select("*")
        .order("difficulty")
        .order("name");

      if (difficulty) query = query.eq("difficulty", difficulty);
      if (skill_type) query = query.eq("skill_type", skill_type);

      const { data } = await query.throwOnError();
      return data as Drill[];
    },
  });
};
