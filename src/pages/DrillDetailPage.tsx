import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import PageHeader from "@/components/PageHeader";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import DrillLogForm from "@/components/DrillLogForm";
import DrillProgressChart from "@/components/DrillProgressChart";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { DIFFICULTY_LABELS, SKILL_TYPE_LABELS } from "@/types";
import type { Drill } from "@/types";

const DIFFICULTY_DOT: Record<string, string> = {
  beginner: "bg-pot",
  intermediate: "bg-ball-1",
  advanced: "bg-strike",
};

export default function DrillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const drillId = Number(id);

  const planId = searchParams.get("plan")
    ? Number(searchParams.get("plan"))
    : undefined;
  const stepId = searchParams.get("step")
    ? Number(searchParams.get("step"))
    : undefined;
  const planPlayerId = searchParams.get("playerId");

  const { data: drill, isLoading } = useQuery({
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

  const { data: drillLogs } = useGetDrillLogs({ drill_id: drillId });
  const { completeStep } = useTrainingPlan(undefined);

  const handleLogSuccess = (drillLogId: number) => {
    if (planId && stepId) completeStep.mutate({ stepId, drillLogId });
  };

  const backLink =
    planId && planPlayerId ? `/players/${planPlayerId}/plan` : "/drills";

  if (isLoading) {
    return (
      <>
        <PageHeader title="Ejercicio" back={backLink} />
        <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
          <Skeleton className="aspect-[2/1] w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (!drill) {
    return (
      <>
        <PageHeader title="Ejercicio" back={backLink} />
        <div className="mx-auto max-w-3xl px-3 py-4">
          <Card>
            <EmptyState
              title="Ejercicio no encontrado"
              hint="Puede que se haya eliminado o que el enlace sea antiguo."
              action={
                <Link
                  to="/drills"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  Ver todos los ejercicios
                </Link>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={drill.name}
        subtitle={SKILL_TYPE_LABELS[drill.skill_type]}
        back={backLink}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        {planId && planPlayerId && (
          <Link
            to={backLink}
            className="block rounded-control border border-strike/40 bg-strike-tint px-4 py-2.5 text-center text-body font-medium text-strike transition-colors duration-150 hover:bg-strike/20"
          >
            Volver al plan
          </Link>
        )}

        <Card className="p-3">
          <PoolTableDiagram
            ballPositions={drill.ball_positions}
            shotPaths={drill.shot_paths}
          />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-caption text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${DIFFICULTY_DOT[drill.difficulty]}`}
              />
              {DIFFICULTY_LABELS[drill.difficulty]}
            </span>
            <span className="text-ink-ghost">·</span>
            <span className="text-ink-faint">
              máx. {drill.max_score} puntos
            </span>
          </div>

          <p className="text-h4 text-ink">{drill.description}</p>

          <h3 className="mt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            Preparación
          </h3>
          <p className="mt-1 text-body text-ink-soft">
            {drill.setup_instructions}
          </p>

          <h3 className="mt-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            Puntuación
          </h3>
          <p className="mt-1 text-body text-ink-soft">{drill.scoring_method}</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-h4 font-semibold text-ink">
            Registrar resultado
          </h2>
          <DrillLogForm drill={drill} onSuccess={handleLogSuccess} />
        </Card>

        {drillLogs && drillLogs.length > 0 && (
          <>
            <DrillProgressChart
              logs={drillLogs}
              title="Historial de resultados"
            />

            <Card className="overflow-hidden">
              <CardHeader title="Últimos resultados" />
              <ul className="p-2">
                {drillLogs.slice(0, 20).map((log) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-3 rounded-control px-2 py-2.5"
                  >
                    <time className="text-caption tabular-nums text-ink-faint">
                      {new Date(log.created_at).toLocaleDateString()}
                    </time>
                    {log.notes && (
                      <span className="min-w-0 flex-1 truncate text-caption text-ink-faint">
                        {log.notes}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-body font-semibold tabular-nums text-ink">
                      {log.score}
                      <span className="text-ink-faint">/{log.max_score}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
