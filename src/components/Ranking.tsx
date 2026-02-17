import type { DailyRankingEntry, Category } from "@/types";
import RankingTable from "./RankingTable";

type ViewMode = "combined" | "byCategory";

const CATEGORY_NAMES: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

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
  emptyMessage = "No hay partidos registrados para este criterio.",
  gamesLabel = "Partidos",
}: RankingProps) {
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
      </div>
    );
  }

  if (viewMode === "combined") {
    if (!ranking || ranking.length === 0) {
      return <p className="py-6 text-center text-gray-400">{emptyMessage}</p>;
    }

    return (
      <RankingTable
        entries={ranking}
        gamesLabel={gamesLabel}
        viewMode={viewMode}
      />
    );
  }

  // viewMode === "byCategory"
  if (!rankingByCategory) {
    return <p className="py-6 text-center text-gray-400">{emptyMessage}</p>;
  }

  const hasAny =
    rankingByCategory[1].length > 0 ||
    rankingByCategory[2].length > 0 ||
    rankingByCategory[3].length > 0;

  if (!hasAny) {
    return <p className="py-6 text-center text-gray-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-8">
      {([1, 2, 3] as const).map((cat) => {
        const entries = rankingByCategory[cat];
        if (entries.length === 0) return null;
        return (
          <div key={cat}>
            <h3 className="mb-3 text-base font-semibold text-white flex items-center gap-2 ps-4">
              {CATEGORY_NAMES[cat]}
            </h3>
            <RankingTable
              entries={entries}
              gamesLabel={gamesLabel}
              viewMode={viewMode}
            />
          </div>
        );
      })}
    </div>
  );
}
