import { queryOptions } from "@tanstack/react-query";
import { getSupabase } from "@/libs/supabase";
import { keys } from "@/libs/queryKeys";
import type { TrainingPlan, TrainingPlanStep } from "@/types";

/**
 * A player's active plan and its steps, each step carrying its drill.
 *
 * Two round trips rather than one: the steps are filtered by plan_id, and which
 * plan is active is the first query's answer. Returns null when there is no
 * active plan, which is what the page renders its "generate one" state from.
 *
 * Player-scoped, not club-scoped — a plan belongs to a person and the drill
 * library is shared.
 */
export const trainingPlanQuery = (playerId: number) =>
  queryOptions({
    queryKey: keys.trainingPlan.of(playerId),
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: plans } = await supabase
        .from("training_plans")
        .select("*")
        .eq("player_id", playerId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .throwOnError();

      if (plans.length === 0) return null;

      const plan = plans[0] as TrainingPlan;

      const { data: steps } = await supabase
        .from("training_plan_steps")
        .select("*, drill:drills(*)")
        .eq("plan_id", plan.id)
        .order("step_order")
        .throwOnError();

      return { plan, steps: steps as unknown as TrainingPlanStep[] };
    },
  });
