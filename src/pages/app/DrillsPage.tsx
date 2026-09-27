import { getRouteApi } from "@tanstack/react-router";
import { cardClasses } from "@/components/ui/cardStyles";
import {
  LuChevronRight,
  LuPlus,
  LuShapes,
  LuSignal,
  LuTarget,
} from "react-icons/lu";
import PageTitle from "@/components/layout/PageTitle";
import DrillCard from "@/components/drills/DrillCard";
import { useDrills } from "@/hooks/useDrills";
import { useAuth } from "@/hooks/useAuth";
import { useDrillLogs } from "@/hooks/useDrillLogs";
import { scorePct } from "@/libs/algorithms/scoreBand";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DIFFICULTIES, SKILL_TYPES } from "@/types";
import { useT } from "@/i18n";
import { AppLink } from "@/components/layout/AppLink";

const route = getRouteApi("/app/_authed/$clubSlug/drills/");

export default function DrillsPage() {
  const { t } = useT();
  // In the URL, so a grouping survives a reload and is a link.
  const { group } = route.useSearch();
  const navigate = route.useNavigate();

  const { user, player } = useAuth();
  // Same request the notification bell makes, so this is from cache.
  const { data: myLogs } = useDrillLogs({ player_id: player?.id });
  const bestPct = new Map<number, number>();
  for (const log of myLogs ?? []) {
    const pct = scorePct(log.score, log.max_score);
    bestPct.set(log.drill_id, Math.max(pct, bestPct.get(log.drill_id) ?? 0));
  }
  const { data: drills, isLoading } = useDrills();

  // In the order the app ranks them — beginner first, the skills as listed —
  // and only the ones with a drill in them.
  const groups = (
    group === "skill"
      ? SKILL_TYPES.map((key) => ({
          key,
          label: t(`skill.${key}`),
          items: (drills ?? []).filter((d) => d.skill_type === key),
        }))
      : DIFFICULTIES.map((key) => ({
          key,
          label: t(`difficulty.${key}`),
          items: (drills ?? []).filter((d) => d.difficulty === key),
        }))
  ).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-4 px-3 py-4">
        <PageTitle title={t("drills.title")}>
          {user && (
            <AppLink
              to="/app/$clubSlug/drills/new"
              className={buttonClasses({ size: "sm", className: "shrink-0" })}
            >
              <LuPlus className="h-4 w-4" aria-hidden />
              {t("drills.new")}
            </AppLink>
          )}
        </PageTitle>

        {/* Group by, not filter by: the whole library stays on the page, so
            what is left to try in each part of it is visible rather than
            hidden behind a select. */}
        <Segmented
          label={t("drills.groupBy")}
          value={group}
          onChange={(value) => navigate({ search: { group: value } })}
          options={[
            {
              value: "difficulty",
              label: t("drills.byDifficulty"),
              icon: <LuSignal className="h-4 w-4" aria-hidden />,
            },
            {
              value: "skill",
              label: t("drills.bySkill"),
              icon: <LuShapes className="h-4 w-4" aria-hidden />,
            },
          ]}
          // Full width on a phone, two even halves — a thumb-sized target
          // rather than two words floating at the left.
          className="max-sm:w-full [&>button]:justify-center max-sm:[&>button]:flex-1"
        />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={cardClasses({ className: "overflow-hidden" })}
              >
                {/* Same shape as the card it stands in for, table included, so
                    nothing jumps when the drills arrive. */}
                <Skeleton className="aspect-[922/1734] w-full rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map(({ key, label, items }) => {
              const done = items.filter((d) => bestPct.has(d.id)).length;
              return (
                // Native <details>: collapsing costs no state and no script,
                // and every group starts open.
                <details key={key} open className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-hairline pb-2 [&::-webkit-details-marker]:hidden">
                    <LuChevronRight
                      className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-150 group-open:rotate-90"
                      aria-hidden
                    />
                    <h2 className="min-w-0 flex-1 truncate text-h4 font-semibold text-ink">
                      {label}
                    </h2>
                    {/* How far through the group, at a glance. A bar, not a
                        chart: one number out of another is all there is. */}
                    <span
                      aria-hidden
                      className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-hairline sm:w-24"
                    >
                      <span
                        className="block h-full rounded-full bg-strike"
                        style={{ width: `${(done / items.length) * 100}%` }}
                      />
                    </span>
                    <span
                      // A fixed width in a mono face, so the bars before it line
                      // up whether the count is 0/6 or 12/20.
                      className={`min-w-[12ch] shrink-0 text-right font-mono text-caption tabular-nums ${done === items.length ? "text-strike" : "text-ink-faint"}`}
                    >
                      {t("drills.doneCount", { done, total: items.length })}
                    </span>
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {items.map((drill) => (
                      <DrillCard
                        key={drill.id}
                        drill={drill}
                        best={bestPct.get(drill.id)}
                      />
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<LuTarget className="h-5 w-5" />}
              title={t("drills.emptyTitle")}
            />
          </Card>
        )}
      </div>
    </>
  );
}
