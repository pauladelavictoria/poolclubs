import type { DailyRankingEntry, Category } from "@/types";
import RankingTable from "./RankingTable";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { LuTrophy } from "react-icons/lu";
import { useT } from "@/i18n";

type ViewMode = "combined" | "byCategory";

interface RankingProps {
  ranking: DailyRankingEntry[] | null;
  rankingByCategory: Record<Category, DailyRankingEntry[]> | null;
  viewMode: ViewMode;
  isLoading: boolean;
  emptyMessage?: string;
  gamesLabel?: string;
}

export default function Ranking({
  ranking,
  rankingByCategory,
  viewMode,
  isLoading,
  emptyMessage,
  gamesLabel,
}: RankingProps) {
  const { t } = useT();

  if (isLoading) return <SkeletonRows rows={8} className="p-3" />;

  const empty = (
    <EmptyState
      icon={<LuTrophy className="h-5 w-5" />}
      title={t("ranking.emptyTitle")}
      hint={emptyMessage ?? t("ranking.emptyDefault")}
    />
  );

  if (viewMode === "combined") {
    if (!ranking || ranking.length === 0) return empty;
    return (
      <RankingTable
        entries={ranking}
        gamesLabel={gamesLabel ?? t("ranking.form")}
        viewMode={viewMode}
      />
    );
  }

  if (!rankingByCategory) return empty;

  const populated = ([1, 2, 3] as const).filter(
    (cat) => rankingByCategory[cat].length > 0
  );
  if (populated.length === 0) return empty;

  return (
    <div className="divide-y divide-hairline">
      {populated.map((cat) => (
        <section key={cat}>
          {/* The division is the only thing separating one table from the next,
              so it gets a banded header at heading size — a tracked 11px caption
              was carrying more structural weight than it could show. */}
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-felt-raised px-4 py-3">
            <h3 className="text-h3 font-semibold text-ink">
              {t(`category.${cat}`)}
            </h3>
            <span className="font-mono text-caption tabular-nums text-ink-faint">
              {t("ranking.playersCount", {
                n: rankingByCategory[cat].length,
              })}
            </span>
          </div>
          <RankingTable
            entries={rankingByCategory[cat]}
            gamesLabel={gamesLabel ?? t("ranking.form")}
            viewMode={viewMode}
          />
        </section>
      ))}
    </div>
  );
}
