import { useState } from "react";
import { useGetGames } from "@/hooks/useGetGames";
import Layout from "./Layout";
import { useGetPlayers } from "@/hooks/useGetPlayers";
import { Link } from "react-router-dom";
import { HiHome } from "react-icons/hi";

const FILTER_ALL = "";
const PAGE_SIZE = 10;

export default function GamesPage() {
  const [playerFilter, setPlayerFilter] = useState<string>(FILTER_ALL);
  const [page, setPage] = useState(1);
  const { data: gamesData, isLoading: gamesLoading } = useGetGames({
    page,
    pageSize: PAGE_SIZE,
    playerName: playerFilter,
  });
  const games = gamesData?.games ?? [];
  const totalCount = gamesData?.totalCount ?? 0;
  const { data: players } = useGetPlayers();

  const hasNextPage = page * PAGE_SIZE < totalCount;
  const hasPrevPage = page > 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handlePrevPage = () => {
    setPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setPage((p) => p + 1);
  };

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
                  <h1 className="text-2xl font-bold">Partidos</h1>
                </div>
                <Link
                  to="/añadir-partido"
                  className="bg-white hover:bg-gray-100 text-gray-500 font-medium py-2 px-8 rounded-lg transition-all duration-200 flex items-center"
                >
                  Añadir partido
                </Link>
              </div>
            </div>
          </div>
          {/* List of items */}
          <div className="px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg text-center sm:text-left font-medium text-gray-700">
                Partidos ({totalCount})
              </h2>
              <label className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">
                  Filtrar por jugador:
                </span>
                <select
                  value={playerFilter}
                  onChange={(e) => {
                    setPlayerFilter(e.target.value);
                    setPage(1);
                  }}
                  className="border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white text-gray-700 min-w-[140px]"
                  aria-label="Filtrar partidos por jugador"
                >
                  <option value={FILTER_ALL}>Todos</option>
                  {players?.map((player) => (
                    <option key={player.id} value={player.name}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {gamesLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {games.map(
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

                {totalCount > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-center gap-4 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    aria-label="Página anterior"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                    aria-label="Página siguiente"
                  >
                    Siguiente
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
