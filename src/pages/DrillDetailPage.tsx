import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/supabaseClient";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { useAuth } from "@/hooks/useAuth";
import { canEditDrill } from "@/libs/drillPermissions";
import PageHeader from "@/components/PageHeader";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import DrillLogForm from "@/components/DrillLogForm";
import SocialBar from "@/components/SocialBar";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { scoreBand, scorePct } from "@/libs/scoreBand";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import type { Drill } from "@/types";
import { useT } from "@/i18n";

const DIFFICULTY_DOT: Record<string, string> = {
  beginner: "bg-pot",
  intermediate: "bg-ball-1",
  advanced: "bg-strike",
};

export default function DrillDetailPage() {
  const { t, locale } = useT();
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
  const { data: players } = useGetPlayers();
  const { completeStep } = useTrainingPlan(undefined);
  const { user, isAdmin } = useAuth();
  const canEdit = canEditDrill(drill?.created_by, user?.id, isAdmin);

  const handleLogSuccess = (drillLogId: number) => {
    if (planId && stepId) completeStep.mutate({ stepId, drillLogId });
  };

  const backLink =
    planId && planPlayerId ? `/players/${planPlayerId}/training/plan` : "/drills";

  if (isLoading) {
    return (
      <>
        <PageHeader title={t("drills.detailTitle")} back={backLink} />
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <Skeleton className="aspect-[2/1] w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (!drill) {
    return (
      <>
        <PageHeader title={t("drills.detailTitle")} back={backLink} />
        <div className="mx-auto max-w-5xl px-3 py-4">
          <Card>
            <EmptyState
              title={t("drills.notFound")}
              hint={t("drills.notFoundHint")}
              action={
                <Link
                  to="/drills"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  {t("drills.seeAll")}
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
        subtitle={t(`skill.${drill.skill_type}`)}
        back={backLink}
      >
        {canEdit && (
          <Link
            to={`/drills/${drill.id}/edit`}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t("common.edit")}
          </Link>
        )}
      </PageHeader>

      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        {planId && planPlayerId && (
          <Link
            to={backLink}
            className="block rounded-control border border-strike/40 bg-strike-tint px-4 py-2.5 text-center text-body font-medium text-strike transition-colors duration-150 hover:bg-strike/20"
          >
            {t("drills.backToPlan")}
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
              {t(`difficulty.${drill.difficulty}`)}
            </span>
            <span className="text-ink-ghost">·</span>
            <span className="text-ink-faint">
              {t("drills.maxPoints", { n: drill.max_score })}
            </span>
          </div>

          <p className="text-h4 text-ink">{drill.description}</p>

          <h3 className="mt-5 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t("drills.setup")}
          </h3>
          <p className="mt-1 text-body text-ink-soft">
            {drill.setup_instructions}
          </p>

          <h3 className="mt-4 text-caption font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t("drills.scoring")}
          </h3>
          <p className="mt-1 text-body text-ink-soft">{drill.scoring_method}</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-h4 font-semibold text-ink">
            {t("drills.logResult")}
          </h2>
          <DrillLogForm drill={drill} onSuccess={handleLogSuccess} />
        </Card>

        {drillLogs && drillLogs.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader title={t("drills.recentResults")} />
            <ul className="p-2">
              {drillLogs.slice(0, 20).map((log) => {
                const pct = scorePct(log.score, log.max_score);
                const band = scoreBand(pct);
                return (
                  <li key={log.id} className="rounded-control px-2 py-2">
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 truncate text-body text-ink">
                        {players?.find((p) => p.id === log.player_id)?.name ??
                          "—"}
                      </span>
                      <time
                        dateTime={log.created_at}
                        className="shrink-0 text-caption tabular-nums text-ink-faint"
                      >
                        {new Date(log.created_at).toLocaleDateString(locale)}
                      </time>
                      <span className="shrink-0 font-mono text-caption tabular-nums text-ink-faint">
                        {log.score}/{log.max_score}
                      </span>
                      <span
                        className="w-12 shrink-0 text-right font-mono text-body font-semibold tabular-nums"
                        style={{ color: band.color }}
                        title={t(`score.${band.key}`)}
                      >
                        {pct}%
                      </span>
                    </div>
                    <SocialBar target={{ drillLogId: log.id }} />
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
