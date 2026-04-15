import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import Layout from "./Layout";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import DrillLogForm from "@/components/DrillLogForm";
import DrillProgressChart from "@/components/DrillProgressChart";
import { HiChevronLeft } from "react-icons/hi";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";
import type { Drill } from "@/types";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-900/50 text-green-300 border border-green-700/50",
  intermediate: "bg-yellow-900/50 text-yellow-300 border border-yellow-700/50",
  advanced: "bg-red-900/50 text-red-300 border border-red-700/50",
};

export default function DrillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const drillId = Number(id);

  const planId = searchParams.get("plan")
    ? Number(searchParams.get("plan"))
    : undefined;
  const stepId = searchParams.get("step")
    ? Number(searchParams.get("step"))
    : undefined;

  // Fetch the drill
  const { data: drill, isLoading: isDrillLoading } = useQuery({
    queryKey: ["drill", drillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drills")
        .select("*")
        .eq("id", drillId)
        .single();
      if (error) throw error;
      return data as Drill;
    },
    enabled: !!drillId,
  });

  // Fetch logs for this drill (all players)
  const { data: drillLogs } = useGetDrillLogs({ drill_id: drillId });

  // If coming from a training plan, get the plan hook for completing steps
  // We need to find the player_id from the plan step
  const { data: planData, completeStep } = useTrainingPlan(
    planId ? undefined : undefined
  );

  const handleLogSuccess = (drillLogId: number) => {
    // If this drill was opened from a training plan, complete the step
    if (planId && stepId) {
      completeStep.mutate(
        { stepId, drillLogId },
        {
          onSuccess: () => {
            // Navigate back to the plan
          },
        }
      );
    }
  };

  const backLink = planId
    ? `/entrenamientos/plan/${searchParams.get("playerId") ?? ""}`
    : "/entrenamientos";
  const backLabel = planId ? "Volver al plan" : undefined;

  if (isDrillLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  if (!drill) {
    return (
      <Layout>
        <div className="p-8 text-center text-white">
          Ejercicio no encontrado
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to={backLink}
            className="text-gray-400 hover:text-white transition-colors p-2 bg-dark-card rounded-xl"
          >
            <HiChevronLeft className="h-6 w-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{drill.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-xl text-xs font-medium ${DIFFICULTY_COLORS[drill.difficulty]}`}
              >
                {DIFFICULTY_LABELS[drill.difficulty]}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-medium bg-blue-900/50 text-blue-300 border border-blue-700/50">
                {SKILL_TYPE_LABELS[drill.skill_type]}
              </span>
            </div>
          </div>
        </div>

        {/* Plan navigation */}
        {planId && (
          <Link
            to={backLink}
            className="block mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-2xl text-center text-accent-red hover:bg-accent-red/20 transition-colors text-sm font-medium"
          >
            Volver al plan de entrenamiento
          </Link>
        )}

        {/* Diagram */}
        <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card mb-6">
          <PoolTableDiagram
            ballPositions={drill.ball_positions}
            shotPaths={drill.shot_paths}
          />
        </div>

        {/* Description */}
        <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card mb-6">
          <p className="text-gray-300 mb-4">{drill.description}</p>

          <h3 className="text-white font-semibold mb-2">Preparación</h3>
          <p className="text-gray-400 text-sm mb-4">
            {drill.setup_instructions}
          </p>

          <h3 className="text-white font-semibold mb-2">
            Método de puntuación
          </h3>
          <p className="text-gray-400 text-sm">
            {drill.scoring_method} (máx. {drill.max_score} pts)
          </p>
        </div>

        {/* Log form */}
        <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card mb-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Registrar resultado
          </h2>
          <DrillLogForm drill={drill} onSuccess={handleLogSuccess} />
        </div>

        {/* Progress chart */}
        {drillLogs && drillLogs.length > 0 && (
          <div className="mb-6">
            <DrillProgressChart
              logs={drillLogs}
              title="Historial de resultados"
            />
          </div>
        )}

        {/* Recent logs */}
        {drillLogs && drillLogs.length > 0 && (
          <div className="bg-dark-card p-4 md:p-6 rounded-3xl border border-dark-border shadow-card">
            <h2 className="text-xl font-bold text-white mb-4">
              Últimos resultados
            </h2>
            <div className="space-y-2">
              {drillLogs.slice(0, 20).map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center p-3 bg-dark-bg rounded-2xl border border-dark-border"
                >
                  <div className="text-sm text-gray-400">
                    {new Date(log.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-white font-medium">
                    {log.score}/{log.max_score}
                    <span className="text-gray-400 text-sm ml-2">
                      (
                      {log.max_score > 0
                        ? Math.round((log.score / log.max_score) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  {log.notes && (
                    <div className="text-xs text-gray-500 truncate max-w-[120px]">
                      {log.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
