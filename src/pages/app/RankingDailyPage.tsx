import { useState } from "react";
import { useFullscreen } from "@/libs/useFullscreen";
import { LuPlus, LuTv } from "react-icons/lu";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useDailyRanking } from "@/hooks/useDailyRanking";
import PageTitle from "@/components/layout/PageTitle";
import RankingPeriodTabs from "@/components/ranking/RankingPeriodTabs";
import Ranking, { type ViewMode } from "@/components/ranking/Ranking";
import GamesList from "@/components/games/GamesList";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useT } from "@/i18n";
import { getRouteApi } from "@tanstack/react-router";
import { AppLink } from "@/components/layout/AppLink";

// The "no date, so use today" and "is this even a date" cases both moved into
// the route: it redirects a bare URL to today's, and validateSearch rejects
// anything that isn't a YYYY-MM-DD. So there is nothing left to parse here.

const route = getRouteApi("/app/_authed/$clubSlug/ranking/daily");

export default function RankingDailyPage() {
  const { t } = useT();
  // The date is required in the URL and validated by the route, so there is no
  // "today" to compute during render — which is what used to make this page a
  // hydration mismatch waiting for midnight.
  const { date: selectedDate } = route.useSearch();
  const navigate = route.useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  // Shared with the scoreboard, which wants the same trick for the same reason.
  const { ref: tvRef, isFullscreen: isTv, toggle: toggleTv } =
    useFullscreen<HTMLDivElement>();

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    date: selectedDate,
    mode: "single",
  });
  const games = gamesData?.games ?? [];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) navigate({ search: { date: e.target.value } });
  };

  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const ranking = useDailyRanking({ games, players });

  return (
    <>
      {/* Its own wrapper rather than the grid below: the grid is what goes
          fullscreen for the wall TV, and the title bar's controls are the ones
          you use to get there. */}
      <PageTitle
        className="mx-auto max-w-5xl px-3 pt-4"
        title={t("ranking.dailyTitle")}
      >
        <RankingPeriodTabs daily />
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          aria-label={t("ranking.selectDate")}
          className="h-8 shrink-0 rounded-control border border-hairline bg-pocket px-2 text-body tabular-nums text-ink transition-colors duration-150 hover:border-hairline-strong"
        />
        <button
          type="button"
          onClick={toggleTv}
          title={t("ranking.tvMode")}
          aria-label={t("ranking.tvMode")}
          className={buttonClasses({
            size: "sm",
            variant: "secondary",
            className: "shrink-0",
          })}
        >
          <LuTv className="h-4 w-4" aria-hidden />
        </button>
        <AppLink
          to="/app/$clubSlug/games/new"
          className={buttonClasses({ size: "sm", className: "shrink-0" })}
        >
          <LuPlus className="h-4 w-4" aria-hidden />
          {t("games.add")}
        </AppLink>
      </PageTitle>

      <div
        ref={tvRef}
        style={isTv ? { zoom: 1.6 } : undefined}
        className={`mx-auto grid max-w-5xl gap-4 px-3 py-4 xl:grid-cols-[3fr_2fr] xl:items-start ${
          isTv ? "max-w-none overflow-auto bg-pocket" : ""
        }`}
      >
        {/* Same chalkboard as the all-time ladder: rules, no box. */}
        <div>
          <div className="flex items-center justify-between gap-3 px-1 pb-3">
            <h2 className="text-h4 font-semibold text-ink">
              {t("ranking.standings")}
            </h2>
            <Segmented
              label={t("ranking.view")}
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "combined", label: t("ranking.combined") },
                { value: "byCategory", label: t("ranking.byCategory") },
              ]}
            />
          </div>

          <div className="overflow-hidden rounded-card border-y border-hairline sm:rounded-none">
            <Ranking
              ranking={ranking}
              viewMode={viewMode}
              isLoading={gamesLoading || playersLoading}
              emptyMessage={t("ranking.emptyDaily")}
            />
          </div>
        </div>

        {/* The day's frames are a Games element sitting on a Rankings page, so
            they keep the tape's own idiom and its card. */}
        <Card className="overflow-hidden">
          <CardHeader
            title={t("games.title")}
            action={
              <span className="font-mono text-body tabular-nums text-ink-faint">
                {games.length}
              </span>
            }
          />
          <div className="p-3">
            {gamesLoading ? (
              <SkeletonRows rows={4} />
            ) : (
              <GamesList
                games={games}
                players={players ?? []}
                showSocial={!isTv}
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
