import { useParams, Link, useNavigate } from "react-router-dom";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import TrainingPlanStepList from "@/components/TrainingPlanStepList";
import { Button } from "@/components/ui/Button";
import { HiChevronLeft } from "react-icons/hi";
import { toast } from "react-toastify";
import { useMemo } from "react";

export default function TrainingPlanPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const playerIdNum = Number(playerId);

  const { data: players } = useGetPlayers();
  const player = players?.find((p) => p.id === playerIdNum);

  const {
    data: planData,
    isLoading,
    generatePlan,
    skipStep,
  } = useTrainingPlan(playerIdNum);

  const stats = useMemo(() => {
    if (!planData?.steps) return null;
    const total = planData.steps.length;
    const completed = planData.steps.filter(
      (s) => s.status === "completed"
    ).length;
    const skipped = planData.steps.filter(
      (s) => s.status === "skipped"
    ).length;
    const pending = total - completed - skipped;
    const isFinished = pending === 0;
    return { total, completed, skipped, pending, isFinished };
  }, [planData]);

  const handleNewPlan = () => {
    if (!player) return;
    generatePlan.mutate(
      { playerId: player.id, category: player.category },
      {
        onSuccess: () => {
          toast.success("Nuevo plan generado");
        },
        onError: () => {
          toast.error("Error al generar el plan");
        },
      }
    );
  };

  const handleSkip = (stepId: number) => {
    skipStep.mutate(stepId);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-xl h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
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
            to="/entrenamientos"
            className="text-gray-400 hover:text-white transition-colors p-2 bg-dark-card rounded-xl"
          >
            <HiChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Plan de entrenamiento
            </h1>
            {player && (
              <p className="text-gray-400 text-sm">
                {player.name} (Cat. {player.category})
              </p>
            )}
          </div>
        </div>

        {/* No plan */}
        {!planData && (
          <div className="bg-dark-card p-8 rounded-3xl border border-dark-border shadow-card text-center">
            <p className="text-gray-400 mb-4">
              No tienes un plan de entrenamiento activo.
            </p>
            <Button
              className="rounded-2xl shadow-md"
              onClick={handleNewPlan}
              disabled={generatePlan.isPending}
            >
              {generatePlan.isPending
                ? "Generando..."
                : "Generar plan de entrenamiento"}
            </Button>
          </div>
        )}

        {/* Active plan */}
        {planData && stats && (
          <>
            {/* Progress bar */}
            <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-card mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progreso</span>
                <span className="text-white font-medium">
                  {stats.completed}/{stats.total} completados
                </span>
              </div>
              <div className="h-3 bg-dark-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-red to-green-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats.total > 0
                        ? ((stats.completed + stats.skipped) / stats.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
              {stats.skipped > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.skipped} ejercicio(s) saltado(s)
                </p>
              )}
            </div>

            {/* Finished summary */}
            {stats.isFinished && (
              <div className="bg-green-900/20 border border-green-700/30 p-6 rounded-3xl mb-6 text-center">
                <h2 className="text-xl font-bold text-green-400 mb-2">
                  Plan completado
                </h2>
                <p className="text-gray-400 mb-4">
                  Has completado {stats.completed} de {stats.total} ejercicios.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    className="rounded-2xl shadow-md"
                    onClick={handleNewPlan}
                    disabled={generatePlan.isPending}
                  >
                    {generatePlan.isPending
                      ? "Generando..."
                      : "Generar nuevo plan"}
                  </Button>
                  <Link
                    to={`/entrenamientos/progreso/${playerIdNum}`}
                    className="inline-flex items-center justify-center text-sm text-accent-red hover:text-white transition-colors px-4 py-2 rounded-2xl border border-dark-border hover:bg-dark-card-hover"
                  >
                    Ver progreso
                  </Link>
                </div>
              </div>
            )}

            {/* Step list */}
            <TrainingPlanStepList
              steps={planData.steps}
              planId={planData.plan.id}
              onSkip={handleSkip}
              isSkipping={skipStep.isPending}
            />

            {/* Bottom actions */}
            {!stats.isFinished && (
              <div className="mt-6 flex justify-center">
                <Link
                  to={`/entrenamientos/progreso/${playerIdNum}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Ver progreso general
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
