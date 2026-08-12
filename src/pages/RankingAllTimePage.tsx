import { useState } from "react";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import PageHeader from "@/components/PageHeader";
import Ranking, { type ViewMode } from "@/components/Ranking";
import { Segmented } from "@/components/ui/Segmented";
import { useT } from "@/i18n";

export default function RankingAllTimePage() {
  const { t } = useT();
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({});
  const games = gamesData?.games ?? [];

  const { data: players, isLoading: playersLoading } = useGetPlayers();

  const ranking = useEloRanking({ games, players });

  return (
    <>
      <PageHeader
        section="ranking"
        title={t("ranking.globalTitle")}
        subtitle={
          games.length > 0 ? t("games.count", { n: games.length }) : undefined
        }
      />

      {/* The ladder is not in a box. A ranking is the club's chalkboard — the
          list itself is the object, so it hangs on the canvas between two rules
          with the controls above it rather than inside a card header. */}
      <div className="mx-auto max-w-5xl px-3 py-4">
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
            emptyMessage={t("ranking.emptyAllTime")}
          />
        </div>
      </div>
    </>
  );
}
