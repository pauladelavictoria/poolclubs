import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { Drill, DrillDifficulty, DrillLog, DrillSkillType } from "@/types";

export type UseGetDrillsFilters = {
  difficulty?: DrillDifficulty;
  skill_type?: DrillSkillType;
};

/** One drill by id. Its own key, which useManageDrills invalidates on a save. */
export const drillQuery = (id: number) =>
  queryOptions({
    queryKey: keys.drill.one(id),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("drills")
        .select("*")
        .eq("id", id)
        .single()
        .throwOnError();

      return data as Drill;
    },
  });

export const drillsQuery = (
  clubId: number,
  filters: UseGetDrillsFilters = {},
) => {
  const { difficulty, skill_type } = filters;

  return queryOptions({
    queryKey: keys.drills.list({ difficulty, skill_type }, clubId),
    queryFn: async () => {
      const supabase = getSupabase();
      // The shared catalog (club_id null) plus whatever this club made itself.
      let query = supabase
        .from("drills")
        .select("*")
        .or(`club_id.is.null,club_id.eq.${clubId}`)
        .order("difficulty")
        .order("name");

      if (difficulty) query = query.eq("difficulty", difficulty);
      if (skill_type) query = query.eq("skill_type", skill_type);

      const { data } = await query.throwOnError();
      return data as Drill[];
    },
  });
};

export type UseGetDrillLogsFilters = {
  player_id?: number;
  drill_id?: number;
  limit?: number;
};

/**
 * Drill logs have no club_id of their own — a log belongs to a player and a
 * drill, and the drill library is shared. Callers that need one club's activity
 * filter against the roster, which is what ActivityFeed does.
 */
export const drillLogsQuery = (filters: UseGetDrillLogsFilters) =>
  queryOptions({
    queryKey: keys.drillLogs.list(filters),
    queryFn: async () => {
      const supabase = getSupabase();
      let query = supabase
        .from("drill_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.player_id) query = query.eq("player_id", filters.player_id);
      if (filters.drill_id) query = query.eq("drill_id", filters.drill_id);
      if (filters.limit) query = query.limit(filters.limit);

      const { data } = await query.throwOnError();
      return data as DrillLog[];
    },
  });
