import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "@/components/PageHeader";
import TrainingPlanStepList from "@/components/TrainingPlanStepList";
import PlayerTabs from "@/components/PlayerTabs";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useT } from "@/i18n";

export default function TrainingPlanPage() {
  const { t } = useT();
  const { playerId } = useParams<{ playerId: string }>();
  const playerIdNum = Number(playerId);

  const { player: authPlayer, isLoading: isAuthLoading } = useAuth();
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
      (s) => s.status === "completed",
    ).length;
    const skipped = planData.steps.filter((s) => s.status === "skipped").length;
    const pending = total - completed - skipped;
    return { total, completed, skipped, pending, isFinished: pending === 0 };
  }, [planData]);

  const handleNewPlan = () => {
    if (!player) return;
    generatePlan.mutate(
      { playerId: player.id, category: player.category },
      {
        onSuccess: () => toast.success(t("training.newPlanCreated")),
        onError: () => toast.error(t("drills.planError")),
      },
    );
  };

  const header = (
    <PageHeader
      section="drills"
      title={t("training.planTitle")}
      subtitle={
        player &&
        `${player.name} · ${t("category.short", { n: player.category })}`
      }
      back={`/app/players/${playerIdNum}`}
    />
  );

  // Training plans are private — only their owner can see them.
  if (!isAuthLoading && authPlayer?.id !== playerIdNum) {
    return <Navigate to={`/app/players/${playerIdNum}`} replace />;
  }

  if (isLoading) {
    return (
      <>
        {header}
        <div className="mx-auto max-w-5xl space-y-2 px-3 py-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[54px]" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PlayerTabs playerId={playerIdNum} />

        {!planData || !stats ? (
          <Card>
            <EmptyState
              title={t("training.noPlan")}
              hint={t("training.noPlanHint")}
              action={
                <Button
                  onClick={handleNewPlan}
                  disabled={generatePlan.isPending}
                >
                  {generatePlan.isPending
                    ? t("drills.generating")
                    : t("drills.generatePlan")}
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {t("training.progress")}
                </span>
                <span className="font-mono text-body tabular-nums text-ink">
                  {stats.completed}
                  <span className="text-ink-faint">/{stats.total}</span>
                </span>
              </div>

              <div
                className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-pocket"
                role="progressbar"
                aria-valuenow={stats.completed}
                aria-valuemin={0}
                aria-valuemax={stats.total}
              >
                <div
                  className="h-full rounded-full bg-pot transition-[width] duration-300 ease-[var(--ease-out)]"
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
                <p className="mt-2 text-caption text-ink-faint">
                  {stats.skipped === 1
                    ? t("training.skippedOne", { n: stats.skipped })
                    : t("training.skippedOther", { n: stats.skipped })}
                </p>
              )}
            </Card>

            {stats.isFinished && (
              <Card className="border-pot/30 bg-pot/[0.07] p-5 text-center">
                <h2 className="text-h3 font-semibold text-pot">
                  {t("training.planDone")}
                </h2>
                <p className="mt-1 text-body text-ink-soft">
                  {t("training.planDoneHint", {
                    done: stats.completed,
                    total: stats.total,
                  })}
                </p>
                <Button
                  className="mt-4"
                  onClick={handleNewPlan}
                  disabled={generatePlan.isPending}
                >
                  {generatePlan.isPending
                    ? t("drills.generating")
                    : t("training.generateNewPlan")}
                </Button>
              </Card>
            )}

            <TrainingPlanStepList
              steps={planData.steps}
              planId={planData.plan.id}
              playerId={playerIdNum}
              onSkip={(stepId) => skipStep.mutate(stepId)}
              isSkipping={skipStep.isPending}
            />
          </>
        )}
      </div>
    </>
  );
}
