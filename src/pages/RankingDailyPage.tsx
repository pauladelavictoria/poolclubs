import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetGames } from "@/hooks/useGetGames";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useDailyRanking } from "@/hooks/useDailyRanking";
import type { Category } from "@/types";
import { HiChevronLeft } from "react-icons/hi";
import { Link } from "react-router-dom";

type ViewMode = "combined" | "byCategory";

import Ranking from "@/components/Ranking";

function getTodayYYYYMMDD() {
  return new Date().toISOString().split("T")[0];
}

function parseDateParam(param: string | null): string {
  if (!param) return getTodayYYYYMMDD();
  const date = new Date(param);
  if (Number.isNaN(date.getTime())) return getTodayYYYYMMDD();
  return param.split("T")[0];
}

export default function RankingDailyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get("date");
  const selectedDate = parseDateParam(dateParam);

  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    date: selectedDate,
    mode: "single",
  });
  const games = gamesData?.games ?? [];

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    setSearchParams({ date: value });
  };
  const { data: players, isLoading: playersLoading } = useGetPlayers();
  const ranking = useDailyRanking({ games, players });

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
                  <h1 className="text-2xl font-bold">Ranking diario</h1>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="rounded-xl border border-white/50 bg-white/20 px-2 py-2 text-l text-white [color-scheme:dark] focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label="Seleccionar fecha"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="xl:flex ">
            <div className="xl:flex-1 xl:border-r xl:border-gray-600">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-white">
                  Ranking
                </h2>
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

              {gamesLoading || playersLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
                </div>
              ) : (
                <Ranking
                  ranking={ranking}
                  rankingByCategory={rankingByCategory}
                  viewMode={viewMode}
                  isLoading={gamesLoading || playersLoading}
                  emptyMessage="No hay partidos en esta fecha. El ranking aparecerá cuando se registren partidos."
                />
              )}
            </div>

            <div className="xl:flex-1 p-5 border-t border-dark-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-white">
                  Partidos {games && `(${games?.length})`}
                </h2>
              </div>

              {gamesLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent-red"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(games || []).map(
                    ({
                      id,
                      player_1_name,
                      player_1_score,
                      player_2_score,
                      player_2_name,
                    }) => (
                      <div
                        key={id}
                        className="flex justify-between items-center p-4 bg-dark-bg hover:bg-dark-card-hover rounded-2xl border border-dark-border transition-colors group"
                      >
                        <div className="w-full flex items-center gap-1 text-gray-300">
                          <span
                            className={`flex-1 text-right ${
                              player_1_score > player_2_score
                                ? "font-bold text-white"
                                : ""
                            }`}
                          >
                            {player_1_name}
                          </span>
                          <span>{player_1_score}</span>-
                          <span>{player_2_score}</span>
                          <span
                            className={`flex-1 ${
                              player_2_score > player_1_score
                                ? "font-bold text-white"
                                : ""
                            }`}
                          >
                            {player_2_name}
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
