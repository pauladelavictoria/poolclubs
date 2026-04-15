import { supabase } from "@/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TrainingPlan,
  TrainingPlanStep,
  Drill,
  DrillLog,
  Category,
  DrillDifficulty,
  DrillSkillType,
} from "@/types";

const SKILL_TYPES: DrillSkillType[] = [
  "potting",
  "position",
  "safety",
  "break",
  "banks",
];

const DIFFICULTY_ORDER: Record<DrillDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const DIFFICULTIES: DrillDifficulty[] = ["beginner", "intermediate", "advanced"];

function getDifficultyForCategory(category: Category): DrillDifficulty {
  const map: Record<Category, DrillDifficulty> = {
    1: "advanced",
    2: "intermediate",
    3: "beginner",
  };
  return map[category];
}

function getAdjacentDifficulties(
  main: DrillDifficulty
): { warmup: DrillDifficulty | null; stretch: DrillDifficulty | null } {
  const idx = DIFFICULTY_ORDER[main];
  return {
    warmup: idx > 0 ? DIFFICULTIES[idx - 1] : null,
    stretch: idx < 2 ? DIFFICULTIES[idx + 1] : null,
  };
}

/**
 * Generates a balanced drill plan for a player:
 * - ~2 warm-up drills (easier level)
 * - ~6 core drills at player's level (balanced across skill types)
 * - ~2 stretch drills (harder level)
 * Excludes recently mastered drills (>80% score in recent logs).
 */
function selectDrillsForPlan(
  allDrills: Drill[],
  recentLogs: DrillLog[],
  category: Category
): Drill[] {
  const mainDifficulty = getDifficultyForCategory(category);
  const { warmup, stretch } = getAdjacentDifficulties(mainDifficulty);

  // Find drills recently mastered (>80% score)
  const masteredDrillIds = new Set<number>();
  const logsByDrill = new Map<number, DrillLog[]>();
  for (const log of recentLogs) {
    const logs = logsByDrill.get(log.drill_id) ?? [];
    logs.push(log);
    logsByDrill.set(log.drill_id, logs);
  }
  for (const [drillId, logs] of logsByDrill) {
    const latest = logs[0]; // already sorted desc
    if (latest.max_score > 0 && latest.score / latest.max_score > 0.8) {
      masteredDrillIds.add(drillId);
    }
  }

  const available = allDrills.filter((d) => !masteredDrillIds.has(d.id));

  const byDifficulty = (diff: DrillDifficulty) =>
    available.filter((d) => d.difficulty === diff);

  // Pick drills balanced by skill type
  function pickBalanced(pool: Drill[], count: number): Drill[] {
    const picked: Drill[] = [];
    const byType = new Map<DrillSkillType, Drill[]>();
    for (const type of SKILL_TYPES) {
      byType.set(
        type,
        shuffleArray(pool.filter((d) => d.skill_type === type))
      );
    }

    // Round-robin across skill types
    let typeIdx = 0;
    while (picked.length < count) {
      const type = SKILL_TYPES[typeIdx % SKILL_TYPES.length];
      const typeDrills = byType.get(type)!;
      const drill = typeDrills.shift();
      if (drill && !picked.some((p) => p.id === drill.id)) {
        picked.push(drill);
      }
      typeIdx++;
      // Safety: if we've gone through all types without finding anything, stop
      if (typeIdx > count + SKILL_TYPES.length * 2) break;
    }
    return picked;
  }

  const warmupDrills = warmup ? pickBalanced(byDifficulty(warmup), 2) : [];
  const coreDrills = pickBalanced(byDifficulty(mainDifficulty), 6);
  const stretchDrills = stretch ? pickBalanced(byDifficulty(stretch), 2) : [];

  // If we don't have enough at the main level, fill from adjacent
  const plan = [...warmupDrills, ...coreDrills, ...stretchDrills];

  // If plan is too short, fill with any remaining available drills at main level
  if (plan.length < 6) {
    const remaining = available.filter((d) => !plan.some((p) => p.id === d.id));
    for (const d of shuffleArray(remaining)) {
      if (plan.length >= 10) break;
      plan.push(d);
    }
  }

  return plan;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useTrainingPlan = (playerId?: number) => {
  const queryClient = useQueryClient();

  // Fetch active plan with steps + joined drill data
  const planQuery = useQuery({
    queryKey: ["training_plan", playerId],
    queryFn: async () => {
      if (!playerId) return null;

      const { data: plans, error: planError } = await supabase
        .from("training_plans")
        .select("*")
        .eq("player_id", playerId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (planError) throw planError;
      if (!plans || plans.length === 0) return null;

      const plan = plans[0] as TrainingPlan;

      const { data: steps, error: stepsError } = await supabase
        .from("training_plan_steps")
        .select("*, drill:drills(*)")
        .eq("plan_id", plan.id)
        .order("step_order");

      if (stepsError) throw stepsError;

      return {
        plan,
        steps: (steps ?? []) as TrainingPlanStep[],
      };
    },
    enabled: !!playerId,
  });

  // Generate a new plan
  const generatePlan = useMutation({
    mutationFn: async ({
      playerId,
      category,
    }: {
      playerId: number;
      category: Category;
    }) => {
      // Deactivate existing plans
      await supabase
        .from("training_plans")
        .update({ active: false })
        .eq("player_id", playerId)
        .eq("active", true);

      // Fetch all drills
      const { data: allDrills } = await supabase
        .from("drills")
        .select("*");

      // Fetch recent logs for this player
      const { data: recentLogs } = await supabase
        .from("drill_logs")
        .select("*")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(100);

      const selectedDrills = selectDrillsForPlan(
        (allDrills ?? []) as Drill[],
        (recentLogs ?? []) as DrillLog[],
        category
      );

      if (selectedDrills.length === 0) {
        throw new Error("No hay ejercicios disponibles para generar un plan");
      }

      // Create plan
      const { data: newPlan, error: planError } = await supabase
        .from("training_plans")
        .insert([{ player_id: playerId }])
        .select()
        .single();

      if (planError) throw planError;

      // Create steps
      const steps = selectedDrills.map((drill, idx) => ({
        plan_id: newPlan.id,
        drill_id: drill.id,
        step_order: idx + 1,
        status: "pending" as const,
      }));

      const { error: stepsError } = await supabase
        .from("training_plan_steps")
        .insert(steps);

      if (stepsError) throw stepsError;

      return newPlan as TrainingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_plan", playerId] });
    },
  });

  // Complete a step (link it to a drill log)
  const completeStep = useMutation({
    mutationFn: async ({
      stepId,
      drillLogId,
    }: {
      stepId: number;
      drillLogId: number;
    }) => {
      const { error } = await supabase
        .from("training_plan_steps")
        .update({ status: "completed", drill_log_id: drillLogId })
        .eq("id", stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_plan", playerId] });
    },
  });

  // Skip a step
  const skipStep = useMutation({
    mutationFn: async (stepId: number) => {
      const { error } = await supabase
        .from("training_plan_steps")
        .update({ status: "skipped" })
        .eq("id", stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_plan", playerId] });
    },
  });

  return {
    ...planQuery,
    generatePlan,
    completeStep,
    skipStep,
  };
};
