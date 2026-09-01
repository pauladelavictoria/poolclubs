import { useState } from "react";
import { useGames } from "@/hooks/useGames";
import { usePlayers } from "@/hooks/usePlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import PageTitle from "@/components/layout/PageTitle";
import RankingPeriodTabs from "@/components/ranking/RankingPeriodTabs";
import Ranking, { type ViewMode } from "@/components/ranking/Ranking";
import { Segmented } from "@/components/ui/Segmented";
import { useT } from "@/i18n";

export default function RankingAllTimePage() {
  const { t } = useT();
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  const { data: gamesData, isLoading: gamesLoading } = useGames({});
  const games = gamesData?.games ?? [];

  const { data: players, isLoading: playersLoading } = usePlayers();

  const ranking = useEloRanking({ games, players });

  return (
    <>
      {/* The ladder is not in a box. A ranking is the club's chalkboard — the
          list itself is the object, so it hangs on the canvas between two rules
          with the controls above it rather than inside a card header. */}
      <div className="mx-auto max-w-5xl px-3 py-4">
        <PageTitle className="mb-4" title={t("ranking.globalTitle")}>
          <RankingPeriodTabs daily={false} />
        </PageTitle>

        <div className="flex px-1 pb-3 sm:justify-end">
          <Segmented
            className="max-sm:w-full max-sm:*:flex-1 max-sm:*:justify-center"
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
            emptyMessage={t("ranking.emptyAllTime")}
          />
        </div>
      </div>
    </>
  );
}
