import { useState, useMemo } from "react";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import PageHeader from "@/components/PageHeader";
import Ranking from "@/components/Ranking";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import type { Category } from "@/types";
import { useT } from "@/i18n";

type ViewMode = "combined" | "byCategory";

export default function RankingAllTimePage() {
  const { t } = useT();
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  const { data: gamesData, isLoading: gamesLoading } = useGetGames({});
  const games = gamesData?.games ?? [];

  const { data: players, isLoading: playersLoading } = useGetPlayers();

  const ranking = useEloRanking({ games, players });

  const rankingByCategory = useMemo(() => {
    if (!ranking) return null;
    const byCat: Record<Category, typeof ranking> = { 1: [], 2: [], 3: [] };
    for (const entry of ranking) byCat[entry.category].push(entry);
    return byCat;
  }, [ranking]);

  return (
    <>
      <PageHeader
        title={t("ranking.globalTitle")}
        subtitle={
          games.length > 0 ? t("games.count", { n: games.length }) : undefined
        }
      />

      <div className="mx-auto max-w-5xl px-3 py-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-2.5">
            <h2 className="pl-1 text-h4 font-semibold text-ink">
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

          <Ranking
            ranking={ranking}
            rankingByCategory={rankingByCategory}
            viewMode={viewMode}
            isLoading={gamesLoading || playersLoading}
            emptyMessage={t("ranking.emptyAllTime")}
          />
        </Card>
      </div>
    </>
  );
}
