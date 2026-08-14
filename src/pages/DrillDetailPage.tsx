import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { toast } from "react-toastify";
import { useGetDrill } from "@/hooks/useGetDrills";
import { useGetDrillLogs } from "@/hooks/useGetDrillLogs";
import { useTrainingPlan } from "@/hooks/useTrainingPlan";
import { useManageDrills } from "@/hooks/useManageDrills";
import { useAuth } from "@/hooks/useAuth";
import { canEditDrill } from "@/libs/drillPermissions";
import PageTitle from "@/components/PageTitle";
import PoolTableDiagram from "@/components/PoolTableDiagram";
import DrillLogForm from "@/components/DrillLogForm";
import SocialBar from "@/components/SocialBar";
import { usePlayerLookup } from "@/hooks/useGetPlayers";
import { scoreBand, scorePct } from "@/libs/scoreBand";
import { fmt } from "@/libs/dayLabel";
import { Card, CardHeader } from "@/components/ui/Card";
import { DifficultyTag } from "@/components/ui/DifficultyTag";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { useTablePortrait } from "@/libs/useMedia";
import { useT } from "@/i18n";
import { AppLink } from "@/components/AppLink";

const route = getRouteApi("/app/_authed/$clubSlug/drills/$drillId/");

export default function DrillDetailPage() {
  const { t, locale } = useT();
  const portrait = useTablePortrait();
  const { clubSlug, drillId: drillIdParam } = route.useParams();
  const navigate = useNavigate();
  const drillId = Number(drillIdParam);

  // Set when the drill was opened from a training plan: which plan, which step,
  // and whose. Validated by the route, so these arrive as numbers or not at all.
  const { plan: planId, step: stepId, playerId: planPlayerId } =
    route.useSearch();

  const { data: drill, isLoading } = useGetDrill(drillId);

  const { data: drillLogs } = useGetDrillLogs({ drill_id: drillId });
  const { nameOf } = usePlayerLookup();
  const { completeStep } = useTrainingPlan(undefined);
  const { user, isAdmin } = useAuth();
  const canEdit = canEditDrill(drill?.created_by, user?.id, isAdmin);
  const { deleteDrill } = useManageDrills();

  const handleLogSuccess = (drillLogId: number) => {
    if (planId && stepId) completeStep.mutate({ stepId, drillLogId });
  };

  const handleDelete = () => {
    if (!drill) return;
    if (!confirm(t("drills.deleteConfirm"))) return;
    deleteDrill.mutate(drill.id, {
      onSuccess: () =>
        navigate({ to: "/app/$clubSlug/drills", params: { clubSlug } }),
      onError: () => toast.error(t("drills.deleteError")),
    });
  };

  if (isLoading) {
    return (
      <>
        <PageTitle
          className="mx-auto max-w-5xl px-3 pt-4"
          title={t("drills.detailTitle")}
        />
        <div className="mx-auto grid max-w-5xl gap-4 px-3 py-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          <Skeleton
            className={`mx-auto w-full rounded-card ${portrait ? "aspect-[922/1734] max-w-[420px]" : "aspect-[1734/922]"}`}
          />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      </>
    );
  }

  if (!drill) {
    return (
      <>
        <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
          <PageTitle title={t("drills.detailTitle")} />
          <Card>
            <EmptyState
              title={t("drills.notFound")}
              hint={t("drills.notFoundHint")}
              action={
                <AppLink
                  to="/app/$clubSlug/drills"
                  className={buttonClasses({ variant: "secondary" })}
                >
                  {t("drills.seeAll")}
                </AppLink>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={drill.name}>
          {canEdit && (
            <>
              <AppLink
                to="/app/$clubSlug/drills/$drillId/edit"
                params={{ drillId: drill.id }}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                {t("common.edit")}
              </AppLink>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteDrill.isPending}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                {t("common.delete")}
              </button>
            </>
          )}
        </PageTitle>

        {planId && planPlayerId && (
          <AppLink
            to="/app/$clubSlug/players/$playerId/training/plan"
            params={{ playerId: planPlayerId }}
            className="block rounded-control border border-strike/40 bg-strike-tint px-4 py-2.5 text-center text-body font-medium text-strike transition-colors duration-150 hover:bg-strike/20"
          >
            {t("drills.backToPlan")}
          </AppLink>
        )}

        {/* Wide enough and the table sits beside the reading, not above it,
            and stays put while you scroll the instructions and the scores. */}
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
          {/* No card around it: the table already has its own frame, and a
              second one is just a border around a border. The cap keeps an
              upright table from becoming two metres of scrolling on a desktop;
              turned on its side it wants the whole width instead. */}
          <div
            className={`mx-auto w-full lg:sticky lg:top-4 ${
              portrait ? "max-w-[420px]" : ""
            }`}
          >
            <PoolTableDiagram
              ballPositions={drill.ball_positions}
              shotPaths={drill.shot_paths}
              portrait={portrait}
            />
          </div>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-caption text-ink-soft">
                <DifficultyTag difficulty={drill.difficulty} />
                <span className="text-ink-ghost">·</span>
                <span className="text-ink-faint">
                  {t(`skill.${drill.skill_type}`)}
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
              <p className="mt-1 text-body text-ink-soft">
                {drill.scoring_method}
              </p>
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
                          <AppLink
                            to="/app/$clubSlug/players/$playerId"
                            params={{ playerId: log.player_id }}
                            className="min-w-0 flex-1 truncate text-body text-ink hover:text-strike"
                          >
                            {nameOf(log.player_id)}
                          </AppLink>
                          <time
                            dateTime={log.created_at}
                            className="shrink-0 text-caption tabular-nums text-ink-faint"
                          >
                            {fmt(locale, {}).format(new Date(log.created_at))}
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
        </div>
      </div>
    </>
  );
}
