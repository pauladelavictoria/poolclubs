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

const CATEGORY_NAMES: Record<Category, string> = {
  1: "Primera",
  2: "Segunda",
  3: "Tercera",
};

function getTodayYYYYMMDD() {
  return new Date().toISOString().split("T")[0];
}

function parseDateParam(param: string | null): string {
  if (!param) return getTodayYYYYMMDD();
  const date = new Date(param);
  if (Number.isNaN(date.getTime())) return getTodayYYYYMMDD();
  return param.split("T")[0];
}

const RANKING_COLORS: Record<number, string> = {
  1: "rgb(223, 180, 36)",
  2: "rgb(157, 162, 165)",
  3: "rgb(204, 112, 21)",
};

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
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "combined"
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
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "byCategory"
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
              ) : viewMode === "combined" && ranking && ranking.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-gray-700">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wide">
                        <th className="py-3 pr-2 px-3">#</th>
                        <th className="py-3 pr-2">Jugador</th>
                        <th className="py-3 pr-2 text-right">Victorias</th>
                        <th className="py-3 pr-2 text-right">Partidas</th>
                        <th className="py-3 pr-2 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((entry, index) => (
                        <tr
                          key={entry.playerId}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 pr-2 font-medium">
                            <span
                              className="rounded-full px-3 py-2"
                              style={{
                                backgroundColor: RANKING_COLORS[index + 1],
                                color: index <= 2 ? "white" : undefined,
                              }}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td
                            className="py-3 pr-2"
                            style={{
                              fontWeight: index <= 2 ? "bold" : undefined,
                            }}
                          >
                            {entry.playerName} ({entry.category}ª)
                          </td>
                          <td className="py-3 pr-2 text-right">
                            {entry.gamesWon}
                          </td>
                          <td className="py-3 pr-2 text-right">
                            {entry.gamesPlayed}
                          </td>
                          <td className="py-3 pr-2 text-right font-semibold">
                            {entry.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : viewMode === "byCategory" && rankingByCategory ? (
                (() => {
                  const hasAny =
                    rankingByCategory[1].length > 0 ||
                    rankingByCategory[2].length > 0 ||
                    rankingByCategory[3].length > 0;
                  if (!hasAny) {
                    return (
                      <p className="py-6 text-center text-gray-500">
                        No hay partidos en esta fecha. El ranking aparecerá
                        cuando se registren partidos.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-8">
                      {([1, 2, 3] as const).map((cat) => {
                        const entries = rankingByCategory[cat];
                        if (entries.length === 0) return null;
                        return (
                          <div key={cat}>
                            <h3 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
                              {CATEGORY_NAMES[cat]}
                            </h3>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-gray-700">
                                <thead>
                                  <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wide">
                                    <th className="py-3 pr-2 px-3">#</th>
                                    <th className="py-3 pr-2">Jugador</th>
                                    <th className="py-3 pr-2 text-right">
                                      Victorias
                                    </th>
                                    <th className="py-3 pr-2 text-right">
                                      Partidas
                                    </th>
                                    <th className="py-3 pr-2 text-right">
                                      Puntos
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {entries.map((entry, index) => (
                                    <tr
                                      key={entry.playerId}
                                      className="border-b border-gray-100 hover:bg-gray-50"
                                    >
                                      <td className="py-3 pr-2 font-medium">
                                        <span
                                          className="rounded-full px-3 py-2"
                                          style={{
                                            backgroundColor:
                                              RANKING_COLORS[index + 1],
                                            color:
                                              index <= 2 ? "white" : undefined,
                                          }}
                                        >
                                          {index + 1}
                                        </span>
                                      </td>
                                      <td
                                        className="py-3 pr-2"
                                        style={{
                                          fontWeight:
                                            index <= 2 ? "bold" : undefined,
                                        }}
                                      >
                                        {entry.playerName}
                                      </td>
                                      <td className="py-3 pr-2 text-right">
                                        {entry.gamesWon}
                                      </td>
                                      <td className="py-3 pr-2 text-right">
                                        {entry.gamesPlayed}
                                      </td>
                                      <td className="py-3 pr-2 text-right font-semibold">
                                        {entry.points}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="py-6 text-center text-gray-500">
                  No hay partidos en esta fecha. El ranking aparecerá cuando se
                  registren partidos.
                </p>
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
                            className={`flex-1 text-right ${
                              player_1_score > player_2_score ? "font-bold" : ""
                            }`}
                          >
                            {player_1_name}
                          </span>
                          <span>{player_1_score}</span>-
                          <span>{player_2_score}</span>
                          <span
                            className={`flex-1 ${
                              player_2_score > player_1_score ? "font-bold" : ""
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
