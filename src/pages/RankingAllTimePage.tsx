import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { HiChevronLeft } from "react-icons/hi";
import { useGetGames } from "@/hooks/useGetGames";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useEloRanking } from "@/hooks/useEloRanking";
import Layout from "./Layout";
import Ranking from "@/components/Ranking";
import type { Category } from "@/types";

type ViewMode = "combined" | "byCategory";

export default function RankingAllTimePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  // Fetch all games (limit to 10000 for now to get "all-time")
  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    pageSize: 10000,
  });
  const games = gamesData?.games ?? [];

  const { data: players, isLoading: playersLoading } = useGetPlayers();

  const ranking = useEloRanking({ games, players });

  const rankingByCategory = useMemo(() => {
    if (!ranking) return null;
    const byCat: Record<Category, typeof ranking> = { 1: [], 2: [], 3: [] };
    for (const entry of ranking) {
      byCat[entry.category].push(entry);
    }
    return byCat;
  }, [ranking]);

  return (
    <Layout>
      <div>
        <div className="bg-dark-card shadow-card overflow-hidden">
          <div className="bg-gradient-to-r from-accent-red to-accent-red-dark p-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white py-2 transition-colors hover:opacity-80"
                    aria-label="Inicio"
                  >
                    <HiChevronLeft className="h-6 w-6" aria-hidden />
                  </Link>
                  <h1 className="text-2xl font-bold">
                    Ranking Global{" "}
                    <span className="font-normal text-gray-200">
                      {games.length > 0 && `(${games.length} partidos)`}
                    </span>
                  </h1>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-end gap-4 mb-4 px-4 py-2">
              <div
                className="flex rounded-2xl border border-dark-border p-1 bg-dark-bg"
                role="tablist"
                aria-label="Vista del ranking"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "combined"}
                  onClick={() => setViewMode("combined")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "combined"
                      ? "bg-dark-card-hover text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Combinado
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "byCategory"}
                  onClick={() => setViewMode("byCategory")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "byCategory"
                      ? "bg-dark-card-hover text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Por categoría
                </button>
              </div>
            </div>

            <Ranking
              gamesLabel="Últimos 10 partidos"
              ranking={ranking}
              rankingByCategory={rankingByCategory}
              viewMode={viewMode}
              isLoading={gamesLoading || playersLoading}
              emptyMessage="No hay partidos registrados aún."
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
