import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import { DRILL_COLS, contains } from "./shared";
import type { Drill, DrillDifficulty, DrillSkillType } from "@/types";

export type PublicDrillsFilters = {
  q?: string;
  difficulty?: DrillDifficulty;
  skill_type?: DrillSkillType;
};

/** The shared catalog only. A club's own drills are the club's own business,
 *  which is what the RLS policy says too. */
export const publicDrillsQuery = (filters: PublicDrillsFilters = {}) => {
  const { q, difficulty, skill_type } = filters;

  return queryOptions({
    queryKey: keys.public.drills(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("drills")
        .select(DRILL_COLS)
        .is("club_id", null)
        .order("difficulty")
        .order("name");

      if (q?.trim()) query = query.ilike("name", contains(q));
      if (difficulty) query = query.eq("difficulty", difficulty);
      if (skill_type) query = query.eq("skill_type", skill_type);

      const { data } = await query.throwOnError();
      return data as unknown as Drill[];
    },
  });
};

export const publicDrillQuery = (id: number) =>
  queryOptions({
    queryKey: keys.public.drill(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("drills")
        .select(DRILL_COLS)
        .eq("id", id)
        .is("club_id", null)
        .maybeSingle()
        .throwOnError();

      return (data as unknown as Drill | null) ?? null;
    },
  });
