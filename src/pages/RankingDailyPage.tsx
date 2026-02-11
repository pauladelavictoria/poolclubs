import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetGames } from "@/hooks/useGetGames";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { useDailyRanking } from "@/hooks/useDailyRanking";
import type { Category } from "@/types";
import { HiHome } from "react-icons/hi";
import { Link } from "react-router-dom";

type ViewMode = "combined" | "byCategory";

import RankingTable from "@/components/RankingTable";

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
      <div className="mx-auto px-1 py-1">
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-white py-2 transition-colors"
                    aria-label="Inicio"
                  >
                    <HiHome className="h-6 w-6" aria-hidden />
                  </Link>
                  <h1 className="text-2xl font-bold">Ranking diario</h1>
                </div>
                <label className="flex items-center gap-2">
                  <span className="font-medium">Fecha:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="rounded-lg border border-white/50 bg-white/20 px-3 py-2 text-xl text-white [color-scheme:dark] focus:border-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    aria-label="Seleccionar fecha"
                  />
                </label>
              </div>
            </div>
          </div>
          <div className="xl:flex">
            <div className="xl:flex-1 px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-gray-700">
                  Ranking
                </h2>
                <div
                  className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-100"
                  role="tablist"
                  aria-label="Vista del ranking"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "combined"}
                    onClick={() => setViewMode("combined")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === "combined"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Combinado
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === "byCategory"}
                    onClick={() => setViewMode("byCategory")}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === "byCategory"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Por categoría
                  </button>
                </div>
              </div>

              {gamesLoading || playersLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
                </div>
              ) : (
                <RankingTable
                  ranking={ranking}
                  rankingByCategory={rankingByCategory}
                  viewMode={viewMode}
                  isLoading={gamesLoading || playersLoading}
                  emptyMessage="No hay partidos en esta fecha. El ranking aparecerá cuando se registren partidos."
                />
              )}
            </div>

            <div className="xl:flex-1 px-6 py-5 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h2 className="text-lg text-center sm:text-left font-medium text-gray-700">
                  Partidos {games && `(${games?.length})`}
                </h2>
              </div>

              {gamesLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
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
                        className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-100 transition-colors group"
                      >
                        <div className="w-full flex items-center gap-1 text-gray-700">
                          <span
                            className={`flex-1 text-right ${player_1_score > player_2_score ? "font-bold" : ""
                              }`}
                          >
                            {player_1_name}
                          </span>
                          <span>{player_1_score}</span>-
                          <span>{player_2_score}</span>
                          <span
                            className={`flex-1 ${player_2_score > player_1_score ? "font-bold" : ""
                              }`}
                          >
                            {player_2_name}
                          </span>
                        </div>
                      </div>
                    )
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
